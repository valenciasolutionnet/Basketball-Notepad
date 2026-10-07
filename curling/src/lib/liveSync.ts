// Live Game cross-device sync — talks to this app's own /api/game function
// (Upstash Redis behind it), so two coaches' phones score the same game. The
// short code is the access control; no credentials ship in the browser.
import type { LiveGame } from "./types";

export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike 0/O/1/I
  // 32 symbols divides 256 evenly, so byte % 32 has no bias.
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export const normalizeCode = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Save this device's copy. Resolves to the server's copy when it was newer. */
export async function saveGame(code: string, game: LiveGame): Promise<{ newer: LiveGame | null }> {
  const res = await fetch(`/api/game?code=${encodeURIComponent(code)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(game),
  });
  if (res.status === 409) {
    const data = (await res.json()) as { game?: LiveGame };
    return { newer: data.game ?? null };
  }
  if (!res.ok) throw new Error(`save failed (${res.status})`);
  return { newer: null };
}

export async function fetchGame(code: string): Promise<LiveGame | null> {
  const res = await fetch(`/api/game?code=${encodeURIComponent(code)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  const data = (await res.json()) as { game?: LiveGame };
  return data.game ?? null;
}
