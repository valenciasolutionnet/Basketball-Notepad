// Live Game cross-device sync — one JSON blob per game code, stored in the
// same Upstash Redis database as api/access.ts. The code (random, unlisted)
// is the access control; no credentials ship in the browser bundle.
//
//   GET  /api/game?code=ABCDE   → { game } | 404
//   POST /api/game?code=ABCDE   body: LiveGame → { ok, game }
//
// A POST never replaces a newer game: if the stored copy has a higher `rev`
// (another device scored more), it answers 409 with the stored game so the
// sender can catch up instead of rolling the score back.
//
// Env vars: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*)

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

const GAME_TTL_SECONDS = 60 * 60 * 48; // a game code stays live for 48h
const MAX_BYTES = 200_000;
const keyFor = (code: string) => `curling-notepad:game:${code}`;

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

function parseBody(body: unknown): Record<string, unknown> | null {
  let b = body;
  if (typeof b === "string") {
    try {
      b = JSON.parse(b);
    } catch {
      return null;
    }
  }
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");
  const raw = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const code = String(raw || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,12}$/.test(code)) {
    res.status(400).json({ error: "Invalid game code." });
    return;
  }
  try {
    if (req.method === "GET") {
      const data = await redis(["GET", keyFor(code)]);
      if (typeof data !== "string") {
        res.status(404).json({ error: "Game not found." });
        return;
      }
      res.status(200).json({ game: JSON.parse(data) });
      return;
    }
    if (req.method === "POST") {
      const game = parseBody(req.body);
      const text = game ? JSON.stringify({ ...game, code }) : "";
      if (!game || typeof game.rev !== "number" || text.length > MAX_BYTES) {
        res.status(400).json({ error: "Invalid game payload." });
        return;
      }
      const stored = await redis(["GET", keyFor(code)]);
      if (typeof stored === "string") {
        const current = JSON.parse(stored) as { rev?: number };
        if (typeof current.rev === "number" && current.rev > game.rev) {
          res.status(409).json({ error: "A newer score is already saved.", game: current });
          return;
        }
      }
      await redis(["SET", keyFor(code), text, "EX", GAME_TTL_SECONDS]);
      res.status(200).json({ ok: true });
      return;
    }
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_CONFIGURED") {
      res.status(503).json({ error: "Live Game sharing isn't set up on this site yet." });
      return;
    }
    res.status(502).json({ error: "Couldn't reach the game server. Try again." });
  }
}
