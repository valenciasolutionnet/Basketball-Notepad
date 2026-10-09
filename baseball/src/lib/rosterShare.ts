// SPEC-034 — share a roster by link. The roster rides in the URL fragment
// (#roster=…), which browsers never send to a server, so nothing is uploaded
// or stored online: the link IS the data. Same v1 format as the other
// notepads; a player is name + jersey number + positions ("SS/2B").
import { POSITIONS, type Position } from "./types";

export const ROSTER_SPORT = "baseball";
const PREFIX = "#roster=";
const MAX_PLAYERS = 200;
const MAX_TEXT = 60;

export interface SharedPlayer {
  name: string;
  number: string;
  positions: Position[];
}
export type SharedRoster = { team: string; players: SharedPlayer[] } | { error: string };

const clean = (v: unknown) => String(v ?? "").trim().slice(0, MAX_TEXT);
const DAMAGED = "This roster link is damaged. Ask the other coach to send it again.";

function toBase64Url(text: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const parsePositions = (s: string): Position[] =>
  s.split("/").map((x) => x.trim()).filter((x): x is Position => (POSITIONS as readonly string[]).includes(x));

/** The link another coach opens to add these players. */
export function buildRosterLink(
  team: string,
  players: { name: string; number: string; positions: Position[] }[],
  base = window.location.origin + window.location.pathname,
): string {
  const p = players
    .filter((pl) => clean(pl.name))
    .slice(0, MAX_PLAYERS)
    .map((pl) => [clean(pl.name), clean(pl.number), pl.positions.join("/")]);
  const payload = { v: 1, s: ROSTER_SPORT, ...(clean(team) ? { t: clean(team) } : {}), p };
  return base + PREFIX + toBase64Url(JSON.stringify(payload));
}

/** The roster in a link's fragment, an error for a bad link, or null when there is none. */
export function readSharedRoster(hash = window.location.hash): SharedRoster | null {
  if (!hash.startsWith(PREFIX)) return null;
  let data: { v?: unknown; s?: unknown; t?: unknown; p?: unknown };
  try {
    data = JSON.parse(fromBase64Url(hash.slice(PREFIX.length)));
  } catch {
    return { error: DAMAGED };
  }
  if (!data || data.v !== 1 || !Array.isArray(data.p)) return { error: DAMAGED };
  if (data.s !== ROSTER_SPORT) {
    const other = clean(data.s);
    return {
      error: other
        ? `This roster link is for the ${other.charAt(0).toUpperCase() + other.slice(1)} Notepad. Open it there instead.`
        : "This roster link is for a different notepad.",
    };
  }
  const players = (data.p as unknown[])
    .slice(0, MAX_PLAYERS)
    .filter((row): row is unknown[] => Array.isArray(row) && !!clean(row[0]))
    .map((row) => ({ name: clean(row[0]), number: clean(row[1]), positions: parsePositions(clean(row[2])) }));
  return { team: clean(data.t), players };
}

/** Remove the roster from the address bar (so a reload doesn't ask again). */
export function clearSharedRoster(): void {
  try {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  } catch {
    window.location.hash = "";
  }
}

const keyOf = (name: string, number: string) => `${name.trim().toLowerCase()}|${number.trim()}`;

/** Which shared players are new here. Same name + same number = already on the roster. */
export function planRosterMerge(existing: { name: string; number: string }[], incoming: SharedPlayer[]) {
  const have = new Set(existing.map((p) => keyOf(p.name, p.number)));
  const toAdd: SharedPlayer[] = [];
  let skipped = 0;
  for (const p of incoming) {
    const k = keyOf(p.name, p.number);
    if (have.has(k)) skipped++;
    else {
      have.add(k);
      toAdd.push(p);
    }
  }
  return { toAdd, skipped };
}
