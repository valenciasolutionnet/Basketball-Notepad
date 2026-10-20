// Stores/retrieves a single Live Game's shared state by its short join code.
// Backed by Upstash Redis (REST API) so two coaches' tablets can read and
// write the same game — see .env.example for the two env vars this needs.

const GAME_TTL_SECONDS = 60 * 60 * 24; // a game code stays live for 24h
const MAX_GAME_BYTES = 256 * 1024; // a full game with a few hundred shots is well under this

function keyFor(code) {
  return `basketball-notepad:game:${code}`;
}

// Sends the command as a JSON array in the request body, so large game
// payloads (shot charts) aren't squeezed into the URL.
async function upstash(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
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

export default async function handler(req, res) {
  const code = String(req.query.code || "").trim().toUpperCase();
  if (!code || !/^[A-Z0-9]{3,12}$/.test(code)) {
    res.status(400).json({ error: "Invalid game code." });
    return;
  }

  try {
    if (req.method === "GET") {
      const data = await upstash(["get", keyFor(code)]);
      if (!data.result) {
        res.status(404).json({ error: "Game not found." });
        return;
      }
      res.status(200).json({ game: JSON.parse(data.result) });
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
      if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.players)) {
        res.status(400).json({ error: "Invalid game payload." });
        return;
      }
      const serialized = JSON.stringify(body);
      if (serialized.length > MAX_GAME_BYTES) {
        res.status(413).json({ error: "Game data too large." });
        return;
      }
      await upstash(["set", keyFor(code), serialized, "EX", String(GAME_TTL_SECONDS)]);
      res.status(200).json({ ok: true });
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
