// Stores/retrieves a single Live Game's shared state by its short join code.
// Backed by Upstash Redis (REST API) so two coaches' tablets can read and
// write the same game — see .env.example for the two env vars this needs.
//
// Every save carries the version it was based on. The server only accepts it
// if nobody else saved in between (checked atomically in a Lua script);
// otherwise it answers 409 with the latest game so the tablet can re-apply
// its own changes on top and try again. That keeps two coaches from wiping
// out each other's taps.

const GAME_TTL_SECONDS = 60 * 60 * 24; // a game code stays live for 24h
const MAX_GAME_BYTES = 256 * 1024; // a full game with a few hundred shots is well under this

// KEYS[1] game JSON, KEYS[2] version counter
// ARGV[1] new game JSON, ARGV[2] expected version, ARGV[3] TTL, ARGV[4] "1" = create (code must be unused)
// Returns {1, newVersion} on success, {0, currentVersion, currentGameJson} on conflict.
const SAVE_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if ARGV[4] == '1' and cur then
  return {0, -1, ''}
end
local v = tonumber(redis.call('GET', KEYS[2]) or '0')
if v ~= tonumber(ARGV[2]) then
  return {0, v, cur or ''}
end
local nv = v + 1
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
redis.call('SET', KEYS[2], nv, 'EX', ARGV[3])
return {1, nv}
`;

function keyFor(code) {
  return `basketball-notepad:game:${code}`;
}
function versionKeyFor(code) {
  return `basketball-notepad:game:${code}:v`;
}

// Sends the command as a JSON array in the request body, so large game
// payloads (shot charts) aren't squeezed into the URL.
async function upstash(command) {
  // Vercel's Storage/Marketplace Upstash integration may expose KV_* names.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("NOT_CONFIGURED");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`UPSTASH_ERROR_${res.status}`);
  }
  return res.json();
}

function readBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  return body;
}

export default async function handler(req, res) {
  const code = String(req.query.code || "").trim().toUpperCase();
  if (!code || !/^[A-Z0-9]{3,12}$/.test(code)) {
    res.status(400).json({ error: "Invalid game code." });
    return;
  }

  try {
    if (req.method === "GET") {
      // One MGET so the game and its version always come from the same save.
      const { result } = await upstash(["mget", keyFor(code), versionKeyFor(code)]);
      const [game, version] = result || [];
      if (!game) {
        res.status(404).json({ error: "Game not found." });
        return;
      }
      res.status(200).json({ game: JSON.parse(game), version: Number(version || 0) });
      return;
    }

    if (req.method === "POST") {
      const body = readBody(req);
      if (!body || typeof body !== "object" || !body.game || !Array.isArray(body.game.players)) {
        res.status(400).json({ error: "Invalid game payload — reload the app to get the latest version." });
        return;
      }
      const baseVersion = Number(body.baseVersion);
      if (!Number.isInteger(baseVersion) || baseVersion < 0) {
        res.status(400).json({ error: "Invalid version." });
        return;
      }
      const serialized = JSON.stringify(body.game);
      if (serialized.length > MAX_GAME_BYTES) {
        res.status(413).json({ error: "Game data too large." });
        return;
      }
      const out = await upstash([
        "eval", SAVE_SCRIPT, "2", keyFor(code), versionKeyFor(code),
        serialized, String(baseVersion), String(GAME_TTL_SECONDS), body.create ? "1" : "0",
      ]);
      const [ok, version, current] = out.result;
      if (ok === 1) {
        res.status(200).json({ ok: true, version });
        return;
      }
      if (version === -1) {
        res.status(409).json({ error: "Game code already in use.", taken: true });
        return;
      }
      res.status(409).json({ error: "Game changed on another tablet.", version, game: current ? JSON.parse(current) : null });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    if (e.message === "NOT_CONFIGURED") {
      res.status(500).json({
        error: "Live Game sync isn't configured yet. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your Vercel project's environment variables.",
      });
      return;
    }
    res.status(502).json({ error: "Storage request failed." });
  }
}
