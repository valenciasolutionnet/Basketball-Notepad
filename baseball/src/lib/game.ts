import type { BaseState, GameEvent, Id, LiveGame, PlateResult } from "./types";
import { uid } from "./id";

export const OPP: Id = "__opp__";

export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let code = "";
  const buf = new Uint32Array(5);
  crypto.getRandomValues(buf);
  for (const n of buf) code += chars[n % chars.length];
  return code;
}

export interface NewGameInput {
  code: string;
  teamName: string;
  opponentName: string;
  weAreHome: boolean;
  scheduledInnings: number;
  players: { id: Id; name: string; number: string }[];
  battingOrder: Id[];
  pitcherId: Id | null;
}

export function createGame(input: NewGameInput): LiveGame {
  return {
    ...input,
    inning: 1,
    half: "top",
    balls: 0,
    strikes: 0,
    outs: 0,
    bases: { first: null, second: null, third: null },
    runsUs: [0],
    runsThem: [0],
    batterIndex: 0,
    plateAppearances: [],
    runsScored: {},
    stolenBases: {},
    pitchCounts: {},
    oppPitches: 0,
    events: [],
    messages: [],
    final: false,
    updatedAt: Date.now(),
    rev: 0,
  };
}

export function weAreBatting(g: LiveGame): boolean {
  return g.weAreHome ? g.half === "bottom" : g.half === "top";
}

export function currentBatterId(g: LiveGame): Id | null {
  if (!g.battingOrder.length) return null;
  return g.battingOrder[g.batterIndex % g.battingOrder.length] ?? null;
}

export function totals(g: LiveGame): { us: number; them: number } {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return { us: sum(g.runsUs), them: sum(g.runsThem) };
}

export type GameAction =
  | { type: "pitch"; kind: "ball" | "strike" | "foul" }
  | { type: "result"; result: PlateResult }
  | { type: "oppResult"; result: "OUT" | "K" | "1B" | "2B" | "3B" | "HR" | "BB" | "HBP" | "ROE" }
  | { type: "runner"; base: keyof BaseState; move: "advance" | "steal" | "score" | "out" | "remove" }
  | { type: "adjustRbi"; delta: 1 | -1 }
  | { type: "oppRun"; delta: 1 | -1 }
  | { type: "out" }
  | { type: "setPitcher"; playerId: Id | null }
  | { type: "setBatter"; index: number }
  | { type: "endHalf" }
  | { type: "final"; value: boolean }
  | { type: "message"; from: string; text: string }
  | { type: "rename"; teamName?: string; opponentName?: string };

const ORDER: (keyof BaseState)[] = ["first", "second", "third"];

/**
 * Results tapped directly that end on a delivered pitch (ball in play or hit
 * by pitch). Walks and strikeouts are counted through the pitch buttons, so a
 * direct BB/K tap (e.g. intentional walk) adds no pitch.
 */
const PITCHED: ReadonlySet<PlateResult> = new Set<PlateResult>(["1B", "2B", "3B", "HR", "HBP", "OUT", "SF", "SH", "FC", "ROE"]);

function log(g: LiveGame, text: string): GameEvent[] {
  const label = `${g.half === "top" ? "▲" : "▼"}${g.inning}`;
  return [{ id: uid(), at: Date.now(), text: `${label} ${text}` }, ...g.events].slice(0, 200);
}

function scoreRun(g: LiveGame, runner: Id): LiveGame {
  const idx = g.inning - 1;
  if (weAreBatting(g)) {
    const runsUs = [...g.runsUs];
    runsUs[idx] = (runsUs[idx] ?? 0) + 1;
    const runsScored = runner === OPP ? g.runsScored : { ...g.runsScored, [runner]: (g.runsScored[runner] ?? 0) + 1 };
    return { ...g, runsUs, runsScored };
  }
  const runsThem = [...g.runsThem];
  runsThem[idx] = (runsThem[idx] ?? 0) + 1;
  return { ...g, runsThem };
}

/** Advance every runner `n` bases (batter placed separately). Returns runs scored. */
function advanceAll(g: LiveGame, n: number): { g: LiveGame; runs: number } {
  let next = g;
  let runs = 0;
  const bases: BaseState = { first: null, second: null, third: null };
  for (let i = ORDER.length - 1; i >= 0; i--) {
    const runner = g.bases[ORDER[i]!];
    if (!runner) continue;
    const target = i + n;
    if (target >= 3) {
      next = scoreRun(next, runner);
      runs++;
    } else {
      bases[ORDER[target]!] = runner;
    }
  }
  return { g: { ...next, bases }, runs };
}

/** Walk/HBP-style forced advance: only runners forced by the batter move. */
function forceAdvance(g: LiveGame, batter: Id): { g: LiveGame; runs: number } {
  const b = g.bases;
  let next = g;
  let runs = 0;
  const bases: BaseState = { ...b, first: batter };
  if (b.first) {
    bases.second = b.first;
    if (b.second) {
      bases.third = b.second;
      if (b.third) {
        next = scoreRun(next, b.third);
        runs = 1;
      }
    }
  }
  return { g: { ...next, bases }, runs };
}

function resetCount(g: LiveGame): LiveGame {
  return { ...g, balls: 0, strikes: 0 };
}

function addOut(g: LiveGame, n = 1): LiveGame {
  const outs = g.outs + n;
  if (outs >= 3) return switchHalf({ ...g, outs: 3 });
  return { ...g, outs };
}

function switchHalf(g: LiveGame): LiveGame {
  const cleared = { ...g, outs: 0, balls: 0, strikes: 0, bases: { first: null, second: null, third: null } };
  if (g.half === "top") return { ...cleared, half: "bottom", events: log(g, "Side retired") };
  const inning = g.inning + 1;
  const runsUs = [...g.runsUs];
  const runsThem = [...g.runsThem];
  while (runsUs.length < inning) runsUs.push(0);
  while (runsThem.length < inning) runsThem.push(0);
  return { ...cleared, half: "top", inning, runsUs, runsThem, events: log(g, "Side retired") };
}

function countPitch(g: LiveGame): LiveGame {
  if (weAreBatting(g)) return { ...g, oppPitches: g.oppPitches + 1 };
  if (!g.pitcherId) return g;
  return { ...g, pitchCounts: { ...g.pitchCounts, [g.pitcherId]: (g.pitchCounts[g.pitcherId] ?? 0) + 1 } };
}

function nameOf(g: LiveGame, id: Id | null): string {
  if (!id || id === OPP) return g.opponentName;
  return g.players.find((p) => p.id === id)?.name ?? "Player";
}

function recordOurPA(g: LiveGame, result: PlateResult): LiveGame {
  const batter = currentBatterId(g);
  if (!batter) return g;
  let next = resetCount(g);
  let runs = 0;
  let outs = 0;
  switch (result) {
    case "1B":
    case "2B":
    case "3B": {
      const n = result === "1B" ? 1 : result === "2B" ? 2 : 3;
      const r = advanceAll(next, n);
      next = r.g;
      runs = r.runs;
      next = { ...next, bases: { ...next.bases, [ORDER[n - 1]!]: batter } };
      break;
    }
    case "HR": {
      const r = advanceAll(next, 3);
      next = scoreRun(r.g, batter);
      runs = r.runs + 1;
      break;
    }
    case "BB":
    case "HBP":
    case "ROE": {
      const r = forceAdvance(next, batter);
      next = r.g;
      runs = r.runs;
      break;
    }
    case "SF": {
      outs = 1;
      if (next.bases.third && next.outs < 2) {
        next = scoreRun(next, next.bases.third);
        next = { ...next, bases: { ...next.bases, third: null } };
        runs = 1;
      }
      break;
    }
    case "SH": {
      outs = 1;
      if (next.outs < 2) {
        const r = advanceAll(next, 1);
        next = r.g;
        runs = r.runs;
      }
      break;
    }
    case "FC": {
      outs = 1;
      // Lead forced runner is retired; batter reaches first.
      const b = next.bases;
      const bases: BaseState = { ...b };
      if (b.first && b.second && b.third) bases.third = b.second;
      if (b.first && b.second) bases.second = b.first;
      bases.first = batter;
      next = { ...next, bases };
      break;
    }
    case "K":
    case "OUT":
      outs = 1;
      break;
  }
  const rbi = result === "ROE" ? 0 : runs;
  const pa = { id: uid(), playerId: batter, inning: g.inning, result, rbi };
  next = {
    ...next,
    plateAppearances: [...next.plateAppearances, pa],
    batterIndex: next.batterIndex + 1,
    events: log(next, `${nameOf(g, batter)}: ${result}${rbi ? ` (${rbi} RBI)` : ""}`),
  };
  return outs ? addOut(next, outs) : next;
}

function recordOppPA(g: LiveGame, result: Extract<GameAction, { type: "oppResult" }>["result"]): LiveGame {
  let next = resetCount(g);
  switch (result) {
    case "OUT":
    case "K":
      return addOut({ ...next, events: log(next, `${g.opponentName} batter: ${result}`) });
    case "BB":
    case "HBP":
    case "ROE":
      next = forceAdvance(next, OPP).g;
      break;
    case "HR":
      next = scoreRun(advanceAll(next, 3).g, OPP);
      break;
    default: {
      const n = result === "1B" ? 1 : result === "2B" ? 2 : 3;
      next = advanceAll(next, n).g;
      next = { ...next, bases: { ...next.bases, [ORDER[n - 1]!]: OPP } };
    }
  }
  return { ...next, events: log(next, `${g.opponentName} batter: ${result}`) };
}

function runnerMove(g: LiveGame, base: keyof BaseState, move: Extract<GameAction, { type: "runner" }>["move"]): LiveGame {
  const runner = g.bases[base];
  if (!runner) return g;
  const i = ORDER.indexOf(base);
  const bases = { ...g.bases, [base]: null };
  const who = nameOf(g, runner);
  if (move === "remove") return { ...g, bases };
  if (move === "out") return addOut({ ...g, bases, events: log(g, `${who} out on the bases`) });
  if (move === "score" || i === 2) {
    const next = scoreRun({ ...g, bases }, runner);
    const sb = move === "steal" && runner !== OPP ? { ...next.stolenBases, [runner]: (next.stolenBases[runner] ?? 0) + 1 } : next.stolenBases;
    return { ...next, stolenBases: sb, events: log(g, `${who} scores${move === "steal" ? " (steal of home)" : ""}`) };
  }
  const target = ORDER[i + 1]!;
  if (bases[target]) return g; // occupied — move the lead runner first
  const next = { ...g, bases: { ...bases, [target]: runner } };
  if (move === "steal" && runner !== OPP) {
    return {
      ...next,
      stolenBases: { ...g.stolenBases, [runner]: (g.stolenBases[runner] ?? 0) + 1 },
      events: log(g, `${who} steals ${target === "second" ? "2nd" : "3rd"}`),
    };
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
    case "pitch": {
      const counted = countPitch(g);
      if (a.kind === "ball") {
        if (g.balls >= 3) return weAreBatting(g) ? recordOurPA(counted, "BB") : recordOppPA(counted, "BB");
        return { ...counted, balls: g.balls + 1 };
      }
      if (a.kind === "foul") return { ...counted, strikes: Math.min(2, g.strikes + 1) };
      if (g.strikes >= 2) return weAreBatting(g) ? recordOurPA(counted, "K") : recordOppPA(counted, "K");
      return { ...counted, strikes: g.strikes + 1 };
    }
    case "result":
      return weAreBatting(g) ? recordOurPA(PITCHED.has(a.result) ? countPitch(g) : g, a.result) : g;
    case "oppResult":
      return weAreBatting(g) ? g : recordOppPA(PITCHED.has(a.result) ? countPitch(g) : g, a.result);
    case "runner":
      return runnerMove(g, a.base, a.move);
    case "adjustRbi": {
      const last = g.plateAppearances[g.plateAppearances.length - 1];
      if (!last) return g;
      const rbi = Math.max(0, last.rbi + a.delta);
      return { ...g, plateAppearances: [...g.plateAppearances.slice(0, -1), { ...last, rbi }] };
    }
    case "oppRun": {
      const idx = g.inning - 1;
      const runsThem = [...g.runsThem];
      runsThem[idx] = Math.max(0, (runsThem[idx] ?? 0) + a.delta);
      return { ...g, runsThem };
    }
    case "out":
      return addOut(resetCount({ ...g, events: log(g, "Out recorded") }));
    case "setPitcher":
      return { ...g, pitcherId: a.playerId, events: log(g, `Now pitching: ${a.playerId ? nameOf(g, a.playerId) : "—"}`) };
    case "setBatter":
      return { ...g, batterIndex: a.index, balls: 0, strikes: 0 };
    case "endHalf":
      return switchHalf(g);
    case "final":
      return { ...g, final: a.value, events: log(g, a.value ? "Final" : "Game reopened") };
    case "message": {
      const text = a.text.trim();
      if (!text) return g;
      return { ...g, messages: [...g.messages, { id: uid(), from: a.from, text, at: Date.now() }].slice(-100) };
    }
    case "rename":
      return { ...g, teamName: a.teamName ?? g.teamName, opponentName: a.opponentName ?? g.opponentName };
  }
}
