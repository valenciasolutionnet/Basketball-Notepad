// Stores/retrieves a single Live Game's shared state by its short join code.
// Backed by Upstash Redis (REST API) so coaches' devices read and write the
// same game — see .env.example for the two env vars this needs.

interface Req {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

const GAME_TTL_SECONDS = 60 * 60 * 24 * 2;
const MAX_BYTES = 512 * 1024;

// Hash tag {code} keeps both keys in one slot so the script can touch both.
const keyFor = (code: string) => `baseball-notepad:game:{${code}}`;
const revKeyFor = (code: string) => `baseball-notepad:rev:{${code}}`;

// Atomic compare-and-set: write only if the stored revision still equals the
// revision the client built on. Otherwise hand back the current game.
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[2])
local curRev = -1
if cur then curRev = tonumber(cur) end
if curRev ~= tonumber(ARGV[2]) then
  local game = redis.call('GET', KEYS[1])
  if game then return {0, game} end
  return {0, ''}
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4])
redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
return {1, ''}
`;

async function upstash(command: string[]): Promise<{ result: unknown }> {
  // Vercel's Storage/Marketplace Upstash integration may expose KV_* names.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("NOT_CONFIGURED");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`UPSTASH_ERROR_${res.status}`);
  return res.json() as Promise<{ result: unknown }>;
}

async function load(code: string): Promise<{ rev?: number } | null> {
  const data = await upstash(["GET", keyFor(code)]);
  return typeof data.result === "string" ? (JSON.parse(data.result) as { rev?: number }) : null;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const raw = req.query.code;
  const code = String(Array.isArray(raw) ? raw[0] : raw ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    res.status(400).json({ error: "Invalid game code." });
    return;
  }

  try {
    if (req.method === "GET") {
      const game = await load(code);
      if (!game) {
        res.status(404).json({ error: "Game not found." });
        return;
      }
      res.status(200).json({ game });
      return;
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = null;
        }
      }
      const { game, baseRev } = (body ?? {}) as { game?: { rev?: unknown; code?: unknown }; baseRev?: unknown };
      if (!game || typeof game !== "object" || typeof game.rev !== "number" || typeof baseRev !== "number" || game.rev <= baseRev || game.code !== code) {
        res.status(400).json({ error: "Invalid game payload." });
        return;
      }
      const serialized = JSON.stringify(game);
      if (serialized.length > MAX_BYTES) {
        res.status(413).json({ error: "Game too large." });
        return;
      }
      const out = await upstash(["EVAL", CAS_SCRIPT, "2", keyFor(code), revKeyFor(code), serialized, String(baseRev), String(game.rev), String(GAME_TTL_SECONDS)]);
      const [ok, current] = Array.isArray(out.result) ? (out.result as [number, string]) : [0, ""];
      if (ok !== 1) {
        // Someone else wrote first (or the game expired: game is null).
        res.status(409).json({ error: "Stale update.", game: current ? JSON.parse(current) : null });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_CONFIGURED") {
      res.status(503).json({ error: "Live sync isn't configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel." });
      return;
    }
    res.status(502).json({ error: "Storage request failed." });
  }
}
