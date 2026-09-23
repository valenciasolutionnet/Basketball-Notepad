import type { Id, PlateAppearance, PlateResult } from "./types";

export interface BattingLine {
  pa: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  hbp: number;
  k: number;
  sf: number;
  sh: number;
  rbi: number;
  r: number;
  sb: number;
  tb: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
}

const HIT_BASES: Partial<Record<PlateResult, number>> = { "1B": 1, "2B": 2, "3B": 3, HR: 4 };
const NOT_AT_BAT: ReadonlySet<PlateResult> = new Set<PlateResult>(["BB", "HBP", "SH", "SF"]);

export function battingLine(pas: PlateAppearance[], runs = 0, sb = 0): BattingLine {
  const line = { pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, hbp: 0, k: 0, sf: 0, sh: 0, rbi: 0, tb: 0 };
  for (const pa of pas) {
    line.pa++;
    line.rbi += pa.rbi;
    if (!NOT_AT_BAT.has(pa.result)) line.ab++;
    const bases = HIT_BASES[pa.result];
    if (bases) {
      line.h++;
      line.tb += bases;
    }
    if (pa.result === "2B") line.doubles++;
    if (pa.result === "3B") line.triples++;
    if (pa.result === "HR") line.hr++;
    if (pa.result === "BB") line.bb++;
    if (pa.result === "HBP") line.hbp++;
    if (pa.result === "K") line.k++;
    if (pa.result === "SF") line.sf++;
    if (pa.result === "SH") line.sh++;
  }
  const avg = line.ab ? line.h / line.ab : 0;
  const obpDen = line.ab + line.bb + line.hbp + line.sf;
  const obp = obpDen ? (line.h + line.bb + line.hbp) / obpDen : 0;
  const slg = line.ab ? line.tb / line.ab : 0;
  return { ...line, r: runs, sb, avg, obp, slg, ops: obp + slg };
}

export function battingByPlayer(
  pas: PlateAppearance[],
  runs: Record<Id, number>,
  sb: Record<Id, number>,
): Map<Id, BattingLine> {
  const grouped = new Map<Id, PlateAppearance[]>();
  for (const pa of pas) grouped.set(pa.playerId, [...(grouped.get(pa.playerId) ?? []), pa]);
  const ids = new Set<Id>([...grouped.keys(), ...Object.keys(runs), ...Object.keys(sb)]);
  const out = new Map<Id, BattingLine>();
  for (const id of ids) out.set(id, battingLine(grouped.get(id) ?? [], runs[id] ?? 0, sb[id] ?? 0));
  return out;
}

/** Baseball convention: ".333", "1.000". */
export function rate(n: number): string {
  const s = n.toFixed(3);
  return s.startsWith("0") ? s.slice(1) : s;
}
