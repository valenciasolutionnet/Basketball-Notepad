// Access gate: who may open the notepad.
//
// - Buyers: the Stripe payment link redirects back with ?session_id=…; we check
//   the Checkout Session with Stripe and issue an access code.
// - Everyone else: submits a registration and waits for the owner to approve it
//   on the admin page (?admin), which issues the same kind of access code.
//
// State lives in Upstash Redis (same database as live sync). Env vars:
//   STRIPE_SECRET_KEY    restricted key with Checkout Sessions: read
//   STRIPE_PRODUCT_ID    this notepad's Stripe product (prod_…)
//   ACCESS_ADMIN_KEY     long random string; typed into the admin page
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*)

import { randomBytes, timingSafeEqual } from "node:crypto";
import { notifyAdmins } from "./push";

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

const APP = "baseball-notepad";
const REGISTER_LIMIT_PER_HOUR = 5;

export interface License {
  code: string;
  email: string;
  name: string;
  source: "stripe" | "approved" | "granted";
  created: number;
  revoked?: boolean;
}
export interface Registration {
  id: string;
  name: string;
  email: string;
  team: string;
  note: string;
  created: number;
  status: "pending" | "approved" | "rejected";
  code?: string;
}

const k = {
  license: (code: string) => `${APP}:license:${code}`,
  licenses: `${APP}:licenses`,
  reg: (id: string) => `${APP}:reg:${id}`,
  regs: `${APP}:regs`,
  checkout: (sid: string) => `${APP}:checkout:${sid}`,
  rate: (ip: string) => `${APP}:rl:${ip}`,
};

// No 0/O/1/I/L: codes get read aloud and typed on phones.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newCode(): string {
  const bytes = randomBytes(12);
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== 12 || [...c].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

export function isEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isCheckoutSessionId(v: unknown): v is string {
  return typeof v === "string" && /^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(v);
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function redis(command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("NOT_CONFIGURED");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command.map(String)),
  });
  if (!res.ok) throw new Error(`UPSTASH_ERROR_${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

async function getJson<T>(key: string): Promise<T | null> {
  const r = await redis(["GET", key]);
  return typeof r === "string" ? (JSON.parse(r) as T) : null;
}
const setJson = (key: string, value: unknown) => redis(["SET", key, JSON.stringify(value)]);

async function issueLicense(email: string, name: string, source: License["source"]): Promise<License> {
  const lic: License = { code: newCode(), email, name, source, created: Date.now() };
  await setJson(k.license(lic.code), lic);
  await redis(["ZADD", k.licenses, lic.created, lic.code]);
  return lic;
}

async function listByScore<T>(indexKey: string, keyOf: (id: string) => string, limit = 200): Promise<T[]> {
  const ids = (await redis(["ZREVRANGE", indexKey, 0, limit - 1])) as string[] | null;
  if (!ids?.length) return [];
  const raw = (await redis(["MGET", ...ids.map(keyOf)])) as (string | null)[];
  return raw.filter((x): x is string => typeof x === "string").map((x) => JSON.parse(x) as T);
}

function isAdmin(req: Req): boolean {
  const expected = process.env.ACCESS_ADMIN_KEY;
  const raw = req.headers["x-admin-key"];
  const given = Array.isArray(raw) ? raw[0] : raw;
  if (!expected || expected.length < 16 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function clientIp(req: Req): string {
  const raw = req.headers["x-forwarded-for"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (v ?? "unknown").split(",")[0]!.trim();
}

interface StripeSession {
  payment_status?: string;
  status?: string;
  customer_details?: { email?: string | null; name?: string | null } | null;
  line_items?: { data?: { price?: { product?: string | null } | null }[] };
}

async function paidCheckout(sessionId: string): Promise<StripeSession | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  const product = process.env.STRIPE_PRODUCT_ID;
  if (!key || !product) throw new Error("STRIPE_NOT_CONFIGURED");
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`STRIPE_ERROR_${res.status}`);
  const s = (await res.json()) as StripeSession;
  const bought = s.line_items?.data?.some((li) => li.price?.product === product) ?? false;
  return s.status === "complete" && s.payment_status === "paid" && bought ? s : null;
}

type Body = Record<string, unknown>;
type Reply = [number, unknown];

async function handle(req: Req, b: Body): Promise<Reply> {
  switch (b.action) {
    case "checkout": {
      if (!isCheckoutSessionId(b.sessionId)) return [400, { error: "Invalid checkout session." }];
      const existing = (await redis(["GET", k.checkout(b.sessionId)])) as string | null;
      if (existing) return [200, { code: existing }];
      const s = await paidCheckout(b.sessionId);
      if (!s) return [402, { error: "We couldn't find a completed payment for this notepad." }];
      const lic = await issueLicense(s.customer_details?.email ?? "", s.customer_details?.name ?? "", "stripe");
      // One code per checkout, even if the redirect is reloaded or raced.
      const won = await redis(["SET", k.checkout(b.sessionId), lic.code, "NX"]);
      if (won !== "OK") {
        await redis(["DEL", k.license(lic.code)]);
        await redis(["ZREM", k.licenses, lic.code]);
        return [200, { code: (await redis(["GET", k.checkout(b.sessionId)])) as string }];
      }
      await notifyAdmins("New purchase", lic.email || lic.name || "A coach just bought access.").catch(() => {});
      return [200, { code: lic.code }];
    }

    case "verify": {
      const code = normalizeCode(b.code);
      if (!code) return [400, { error: "That doesn't look like an access code." }];
      const lic = await getJson<License>(k.license(code));
      if (!lic || lic.revoked) return [403, { error: "This access code isn't valid." }];
      return [200, { ok: true, code }];
    }

    case "register": {
      const name = clean(b.name, 80);
      const email = clean(b.email, 254).toLowerCase();
      if (!name || !isEmail(email)) return [400, { error: "Enter your name and a valid email." }];
      const rk = k.rate(clientIp(req));
      const n = Number(await redis(["INCR", rk]));
      if (n === 1) await redis(["EXPIRE", rk, 3600]);
      if (n > REGISTER_LIMIT_PER_HOUR) return [429, { error: "Too many requests. Try again in an hour." }];
      const reg: Registration = {
        id: randomBytes(18).toString("base64url"),
        name, email,
        team: clean(b.team, 120),
        note: clean(b.note, 500),
        created: Date.now(),
        status: "pending",
      };
      await setJson(k.reg(reg.id), reg);
      await redis(["ZADD", k.regs, reg.created, reg.id]);
      await notifyAdmins("New registration", `${reg.name} · ${reg.email}`).catch(() => {});
      return [200, { id: reg.id, status: reg.status }];
    }

    case "status": {
      if (typeof b.id !== "string" || !/^[A-Za-z0-9_-]{24}$/.test(b.id)) return [400, { error: "Invalid request id." }];
      const reg = await getJson<Registration>(k.reg(b.id));
      if (!reg) return [404, { error: "Request not found." }];
      return [200, { status: reg.status, code: reg.status === "approved" ? reg.code : undefined }];
    }
  }

  // Everything below is the owner's admin page.
  if (!isAdmin(req)) return [401, { error: "Wrong admin key." }];
  switch (b.action) {
    case "admin:list": {
      const [registrations, licenses] = await Promise.all([
        listByScore<Registration>(k.regs, k.reg),
        listByScore<License>(k.licenses, k.license),
      ]);
      return [200, { registrations, licenses }];
    }
    case "admin:approve":
    case "admin:reject": {
      if (typeof b.id !== "string") return [400, { error: "Missing id." }];
      const reg = await getJson<Registration>(k.reg(b.id));
      if (!reg) return [404, { error: "Request not found." }];
      if (reg.status !== "pending") return [409, { error: `Already ${reg.status}.` }];
      if (b.action === "admin:approve") {
        const lic = await issueLicense(reg.email, reg.name, "approved");
        Object.assign(reg, { status: "approved", code: lic.code });
      } else reg.status = "rejected";
      await setJson(k.reg(reg.id), reg);
      return [200, { registration: reg }];
    }
    case "admin:grant": {
      const name = clean(b.name, 80);
      const email = clean(b.email, 254).toLowerCase();
      if (email && !isEmail(email)) return [400, { error: "Invalid email." }];
      return [200, { license: await issueLicense(email, name, "granted") }];
    }
    case "admin:revoke":
    case "admin:restore": {
      const code = normalizeCode(b.code);
      const lic = code ? await getJson<License>(k.license(code)) : null;
      if (!lic) return [404, { error: "Code not found." }];
      lic.revoked = b.action === "admin:revoke";
      await setJson(k.license(lic.code), lic);
      return [200, { license: lic }];
    }
  }
  return [400, { error: "Unknown action." }];
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid request." });
    return;
  }
  try {
    const [status, out] = await handle(req, body as Body);
    res.status(status).json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_CONFIGURED") res.status(503).json({ error: "Access storage isn't configured (Upstash)." });
    else if (msg === "STRIPE_NOT_CONFIGURED") res.status(503).json({ error: "Stripe isn't configured for this notepad." });
    else res.status(502).json({ error: "Access check failed. Try again." });
  }
}
