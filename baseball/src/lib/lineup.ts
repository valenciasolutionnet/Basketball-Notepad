import { POSITIONS, type DefenseGrid, type FieldSlot, type Id, type Lineup, type Player, type Position } from "./types";
import { PITCH_AFTER_CATCH_INNINGS } from "./pitching";

export interface InningIssues {
  missing: Position[];
  duplicates: Position[];
}

export function inningIssues(grid: DefenseGrid, inning: number, playerIds: Id[]): InningIssues {
  const row = grid[inning] ?? {};
  const counts = new Map<Position, number>();
  for (const id of playerIds) {
    const slot = row[id];
    if (slot && slot !== "BN") counts.set(slot, (counts.get(slot) ?? 0) + 1);
  }
  return {
    missing: POSITIONS.filter((p) => !counts.get(p)),
    duplicates: POSITIONS.filter((p) => (counts.get(p) ?? 0) > 1),
  };
}

export interface PlayerUsage {
  bench: number;
  infield: number;
  outfield: number;
  catcher: number;
  pitcher: number;
  maxConsecutiveBench: number;
}

const INFIELD = new Set<FieldSlot>(["P", "C", "1B", "2B", "3B", "SS"]);

export function usage(grid: DefenseGrid, innings: number, id: Id): PlayerUsage {
  const u: PlayerUsage = { bench: 0, infield: 0, outfield: 0, catcher: 0, pitcher: 0, maxConsecutiveBench: 0 };
  let run = 0;
  for (let i = 0; i < innings; i++) {
    const slot = grid[i]?.[id] ?? "BN";
    if (slot === "BN") {
      u.bench++;
      run++;
      u.maxConsecutiveBench = Math.max(u.maxConsecutiveBench, run);
      continue;
    }
    run = 0;
    if (INFIELD.has(slot)) u.infield++;
    else u.outfield++;
    if (slot === "C") u.catcher++;
    if (slot === "P") u.pitcher++;
  }
  return u;
}

/** Catcher for 4+ innings may not pitch the same day (Little League). */
export function catcherPitcherConflict(grid: DefenseGrid, innings: number, id: Id): boolean {
  const u = usage(grid, innings, id);
  return u.catcher >= PITCH_AFTER_CATCH_INNINGS && u.pitcher > 0;
}

/**
 * Greedy fair rotation: each inning, the players with the most bench time
 * play first; positions are filled P → C → infield → outfield, preferring a
 * player's listed positions and spreading reps.
 */
export function autoFill(lineup: Lineup, players: Player[]): DefenseGrid {
  const ids = lineup.battingOrder.filter((id) => players.some((p) => p.id === id));
  const byId = new Map(players.map((p) => [p.id, p]));
  const grid: DefenseGrid = {};
  const bench = new Map<Id, number>(ids.map((id) => [id, 0]));
  const reps = new Map<string, number>();
  const catchInnings = new Map<Id, number>();
  const pitched = new Set<Id>();
  const order: Position[] = ["P", "C", "SS", "2B", "3B", "1B", "CF", "LF", "RF"];

  for (let inn = 0; inn < lineup.innings; inn++) {
    const row: Record<Id, FieldSlot> = {};
    const playing = [...ids]
      .sort((a, b) => (bench.get(b) ?? 0) - (bench.get(a) ?? 0) || ids.indexOf(a) - ids.indexOf(b))
      .slice(0, POSITIONS.length);
    const open = new Set(playing);
    for (const pos of order) {
      if (!open.size) break;
      const candidates = [...open].filter((id) => {
        if (pos === "P") return (catchInnings.get(id) ?? 0) < PITCH_AFTER_CATCH_INNINGS;
        if (pos === "C") return !pitched.has(id) || (catchInnings.get(id) ?? 0) + 1 < PITCH_AFTER_CATCH_INNINGS;
        return true;
      });
      const pool = candidates.length ? candidates : [...open];
      const score = (id: Id) => {
        const listed = byId.get(id)?.positions.includes(pos) ? 0 : 100;
        const hasList = (byId.get(id)?.positions.length ?? 0) > 0;
        // Keep pitchers/catchers continuous across innings when listed.
        const continuity = (pos === "P" || pos === "C") && grid[inn - 1]?.[id] === pos ? -50 : 0;
        return (hasList ? listed : 50) + continuity + (reps.get(`${id}:${pos}`) ?? 0) * 10;
      };
      pool.sort((a, b) => score(a) - score(b));
      const pick = pool[0]!;
      row[pick] = pos;
      open.delete(pick);
      reps.set(`${pick}:${pos}`, (reps.get(`${pick}:${pos}`) ?? 0) + 1);
      if (pos === "C") catchInnings.set(pick, (catchInnings.get(pick) ?? 0) + 1);
      if (pos === "P") pitched.add(pick);
    }
    for (const id of ids) {
      if (!row[id]) {
        row[id] = "BN";
        bench.set(id, (bench.get(id) ?? 0) + 1);
      }
    }
    grid[inn] = row;
  }
  return grid;
}
