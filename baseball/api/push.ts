// Web Push notifications for the owner's admin page: new registrations and
// purchases. State lives in the same Upstash Redis database as api/access.ts,
// keyed by subscription endpoint so a device can be added once and removed
// cleanly (including automatically, when a browser drops a stale subscription).
//
// Env vars (see .env.example):
//   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT   generated VAPID keypair
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*)
//   ACCESS_ADMIN_KEY     same admin key as api/access.ts

import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";

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
const SUBS_KEY = `${APP}:push:subs`;

export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}

export function isPushSubscription(v: unknown): v is PushSubscriptionJson {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  if (typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://")) return false;
  const keys = s.keys as Record<string, unknown> | undefined;
  return !!keys && typeof keys.p256dh === "string" && typeof keys.auth === "string";
}

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

function isAdmin(req: Req): boolean {
  const expected = process.env.ACCESS_ADMIN_KEY;
  const raw = req.headers["x-admin-key"];
  const given = Array.isArray(raw) ? raw[0] : raw;
  if (!expected || expected.length < 16 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Push a notification to every subscribed admin device.
 * Never throws: called from register/checkout, and a notification failure
 * must never break the response that triggered it.
 */
export async function notifyAdmins(title: string, body: string): Promise<void> {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) return;
    const raw = (await redis(["HGETALL", SUBS_KEY])) as string[] | null;
    if (!raw?.length) return;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({ title, body });
    for (let i = 0; i + 1 < raw.length; i += 2) {
      const endpoint = raw[i]!;
      try {
        const sub = JSON.parse(raw[i + 1]!) as PushSubscriptionJson;
        await webpush.sendNotification(sub, payload);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await redis(["HDEL", SUBS_KEY, endpoint]).catch(() => {});
        }
      }
    }
  } catch {
    /* fire-and-forget: a push failure never breaks the caller */
  }
}

type Body = Record<string, unknown>;
type Reply = [number, unknown];

async function handle(req: Req, b: Body): Promise<Reply> {
  // Managing subscriptions is admin-only, same as the rest of api/access.ts's admin actions.
  if (!isAdmin(req)) return [401, { error: "Wrong admin key." }];
  switch (b.action) {
    case "subscribe": {
      if (!isPushSubscription(b.subscription)) return [400, { error: "Invalid push subscription." }];
      await redis(["HSET", SUBS_KEY, b.subscription.endpoint, JSON.stringify(b.subscription)]);
      return [200, { ok: true }];
    }
    case "unsubscribe": {
      if (typeof b.endpoint !== "string" || !b.endpoint) return [400, { error: "Missing endpoint." }];
      await redis(["HDEL", SUBS_KEY, b.endpoint]);
      return [200, { ok: true }];
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
    if (msg === "NOT_CONFIGURED") res.status(503).json({ error: "Push storage isn't configured (Upstash)." });
    else res.status(502).json({ error: "Push request failed. Try again." });
  }
}
