import type { Id, Shot, ShotType } from "./types";

export interface ShotLine {
  shots: number;
  points: number;
  /** 0–1: rating points over the 4 available per shot. */
  pct: number;
}

/** Standard curling shot percentage: sum of 0–4 ratings over 4 × shots. */
export function shotPct(shots: Pick<Shot, "rating">[]): ShotLine {
  const points = shots.reduce((a, s) => a + s.rating, 0);
  return { shots: shots.length, points, pct: shots.length ? points / (4 * shots.length) : 0 };
}

export function shotsByPlayer(shots: Shot[]): Map<Id, ShotLine> {
  const grouped = new Map<Id, Shot[]>();
  for (const s of shots) {
    if (!s.playerId) continue;
    grouped.set(s.playerId, [...(grouped.get(s.playerId) ?? []), s]);
  }
  const out = new Map<Id, ShotLine>();
  for (const [id, list] of grouped) out.set(id, shotPct(list));
  return out;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

const HITS: ReadonlySet<ShotType> = new Set<ShotType>(["takeout", "hitroll", "peel"]);

/** Takeout-weight shots; everything else is played at draw weight. */
export function isHit(type: ShotType): boolean {
  return HITS.has(type);
}
