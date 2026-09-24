import { POSITIONS, type Id, type Lineup, type Player, type Position, type ThrowingPosition } from "./types";
import { uid } from "./id";

export const THROWING: ThrowingPosition[] = ["Lead", "Second", "Vice", "Skip"];

/** Each position throws two consecutive stones: Lead 1–2, Second 3–4, Vice 5–6, Skip 7–8. */
export function positionForStone(stone: number): ThrowingPosition {
  return THROWING[Math.min(3, Math.max(0, Math.floor((stone - 1) / 2)))]!;
}

export function throwersFor(lineup: Lineup | undefined): (Id | null)[] {
  return Array.from({ length: 8 }, (_, i) => lineup?.slots[positionForStone(i + 1)] ?? null);
}

/** Who holds the broom while the caller is in the hack. */
export function relievingPosition(lineup: Lineup): ThrowingPosition {
  return lineup.broomId && lineup.broomId === lineup.slots.Skip ? "Vice" : "Skip";
}

export function emptySlots(): Record<Position, Id | null> {
  return { Lead: null, Second: null, Vice: null, Skip: null, Alternate: null };
}

export function newLineup(name: string): Lineup {
  return { id: uid(), name, slots: emptySlots(), broomId: null };
}

/** Players placed in more than one slot. */
export function duplicateIds(lineup: Lineup): Id[] {
  const seen = new Set<Id>();
  const dup = new Set<Id>();
  for (const pos of POSITIONS) {
    const id = lineup.slots[pos];
    if (!id) continue;
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup];
}

/** Fill empty slots from present players, preferring each player's listed positions. */
export function autoFill(lineup: Lineup, players: Player[]): Lineup {
  const pool = players.filter((p) => p.present);
  const slots = { ...lineup.slots };
  const used = new Set(Object.values(slots).filter((x): x is Id => !!x));
  for (const pass of ["listed", "any"] as const) {
    for (const pos of POSITIONS) {
      if (slots[pos]) continue;
      const pick = pool.find((p) => !used.has(p.id) && (pass === "any" || p.positions.includes(pos)));
      if (!pick) continue;
      slots[pos] = pick.id;
      used.add(pick.id);
    }
  }
  return { ...lineup, slots, broomId: lineup.broomId ?? slots.Skip };
}
