import type { EndResult, GameEvent, Id, LiveGame, ShotType, Side } from "./types";
import { uid } from "./id";
import { positionForStone } from "./lineup";

export const MAX_END_POINTS = 8;
export const STONES_PER_END = 8;

export const SHOT_LABELS: Record<ShotType, string> = {
  draw: "Draw",
  guard: "Guard",
  freeze: "Freeze",
  takeout: "Takeout",
  hitroll: "Hit & roll",
  peel: "Peel",
  raise: "Raise",
  tap: "Tap",
};

export function toDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface NewGameInput {
  id: Id;
  teamName: string;
  opponentName: string;
  scheduledEnds: number;
  firstHammer: Side;
  players: { id: Id; name: string }[];
  throwers: (Id | null)[];
}

export function createGame(input: NewGameInput): LiveGame {
  return {
    ...input,
    throwers: Array.from({ length: STONES_PER_END }, (_, i) => input.throwers[i] ?? null),
    startedDay: toDay(new Date()),
    ends: [],
    shots: [],
    events: [],
    final: false,
    updatedAt: Date.now(),
    rev: 0,
  };
}

export const other = (s: Side): Side => (s === "us" ? "them" : "us");

/**
 * Hammer for the next end: the team that scores gives up the hammer; a blank
 * end leaves it where it was.
 */
export function nextHammer(hammer: Side, end: EndResult): Side {
  return end.scorer && end.points > 0 ? other(end.scorer) : hammer;
}

/** Hammer at the start of each end, including the one being played. */
export function hammerByEnd(g: Pick<LiveGame, "firstHammer" | "ends">): Side[] {
  const out: Side[] = [g.firstHammer];
  for (const e of g.ends) out.push(nextHammer(out[out.length - 1]!, e));
  return out;
}

export function hammer(g: Pick<LiveGame, "firstHammer" | "ends">): Side {
  return hammerByEnd(g)[g.ends.length]!;
}

/** The end being played (1-based). */
export function currentEnd(g: LiveGame): number {
  return g.ends.length + 1;
}

export function isExtraEnd(g: LiveGame): boolean {
  return currentEnd(g) > g.scheduledEnds;
}

export function totals(g: Pick<LiveGame, "ends">): { us: number; them: number } {
  let us = 0;
  let them = 0;
  for (const e of g.ends) {
    if (e.scorer === "us") us += e.points;
    if (e.scorer === "them") them += e.points;
  }
  return { us, them };
}

/** Decided once the scheduled ends are played and the score isn't tied; a tie plays extra ends. */
export function isGameOver(g: LiveGame): boolean {
  if (g.ends.length < g.scheduledEnds) return false;
  const t = totals(g);
  return t.us !== t.them;
}

export function throwerFor(g: LiveGame, stone: number): Id | null {
  return g.throwers[stone - 1] ?? null;
}

export type GameAction =
  | { type: "scoreEnd"; scorer: Side; points: number }
  | { type: "blankEnd" }
  | { type: "shot"; stone: number; shotType: ShotType; rating: number }
  | { type: "shotType"; stone: number; shotType: ShotType }
  | { type: "clearShot"; stone: number }
  | { type: "substitute"; stone: number; playerId: Id | null }
  | { type: "final"; value: boolean }
  | { type: "rename"; teamName?: string; opponentName?: string }
  /** Undo: put back an earlier snapshot. */
  | { type: "restore"; game: LiveGame };

function log(g: LiveGame, text: string): GameEvent[] {
  return [{ id: uid(), at: Date.now(), text: `E${currentEnd(g)} ${text}` }, ...g.events].slice(0, 200);
}

function nameOf(g: LiveGame, id: Id | null): string {
  return g.players.find((p) => p.id === id)?.name ?? "—";
}

const locked = (g: LiveGame) => g.final || isGameOver(g);

function closeEnd(g: LiveGame, end: EndResult, text: string): LiveGame {
  const events = log(g, text);
  const next = { ...g, ends: [...g.ends, end], events };
  if (next.ends.length === g.scheduledEnds && !isGameOver(next)) {
    return { ...next, events: [{ id: uid(), at: Date.now(), text: "Tied after regulation — extra end" }, ...events] };
  }
  return next;
}

export function reduce(g: LiveGame, a: GameAction): LiveGame {
  const next = apply(g, a);
  if (next === g) return g;
  return { ...next, rev: g.rev + 1, updatedAt: Date.now() };
}

function apply(g: LiveGame, a: GameAction): LiveGame {
  switch (a.type) {
    case "scoreEnd": {
      if (locked(g)) return g;
      const points = Math.round(a.points);
      if (points < 1 || points > MAX_END_POINTS) return g;
      const who = a.scorer === "us" ? g.teamName : g.opponentName;
      const steal = a.scorer !== hammer(g) ? " (steal)" : "";
      return closeEnd(g, { scorer: a.scorer, points }, `${who} score ${points}${steal}`);
    }
    case "blankEnd":
      if (locked(g)) return g;
      return closeEnd(g, { scorer: null, points: 0 }, "Blank end — hammer stays");
    case "shot": {
      if (locked(g) || a.stone < 1 || a.stone > STONES_PER_END) return g;
      const rating = Math.round(a.rating);
      if (rating < 0 || rating > 4) return g;
      const end = currentEnd(g);
      const shot = { id: uid(), end, stone: a.stone, playerId: throwerFor(g, a.stone), type: a.shotType, rating };
      // Re-rating a stone replaces the earlier call.
      const shots = [...g.shots.filter((s) => !(s.end === end && s.stone === a.stone)), shot];
      return { ...g, shots };
    }
    case "shotType": {
      const end = currentEnd(g);
      const hit = g.shots.find((s) => s.end === end && s.stone === a.stone);
      if (!hit || hit.type === a.shotType) return g;
      return { ...g, shots: g.shots.map((s) => (s === hit ? { ...s, type: a.shotType } : s)) };
    }
    case "clearShot": {
      const end = currentEnd(g);
      const shots = g.shots.filter((s) => !(s.end === end && s.stone === a.stone));
      return shots.length === g.shots.length ? g : { ...g, shots };
    }
    case "substitute": {
      if (a.stone < 1 || a.stone > STONES_PER_END || throwerFor(g, a.stone) === a.playerId) return g;
      // A substitution covers both of that position's stones.
      const pos = positionForStone(a.stone);
      const throwers = g.throwers.map((id, i) => (positionForStone(i + 1) === pos ? a.playerId : id));
      return { ...g, throwers, events: log(g, `${nameOf(g, a.playerId)} throws ${pos.toLowerCase()} stones`) };
    }
    case "final":
      return g.final === a.value ? g : { ...g, final: a.value, events: log(g, a.value ? "Final" : "Game reopened") };
    case "rename":
      return { ...g, teamName: a.teamName ?? g.teamName, opponentName: a.opponentName ?? g.opponentName };
    case "restore":
      return { ...a.game, id: g.id };
  }
}
