import type { Diagram, Position } from "./types";
import { uid } from "./id";

/** Field coordinates in a 100×100 viewBox, home plate at the bottom. */
export const BASE_XY = {
  home: { x: 50, y: 86 },
  first: { x: 68, y: 68 },
  second: { x: 50, y: 50 },
  third: { x: 32, y: 68 },
} as const;

export const POSITION_XY: Record<Position, { x: number; y: number }> = {
  P: { x: 50, y: 69 },
  C: { x: 50, y: 93 },
  "1B": { x: 72, y: 62 },
  "2B": { x: 60, y: 51 },
  SS: { x: 40, y: 51 },
  "3B": { x: 28, y: 62 },
  LF: { x: 20, y: 32 },
  CF: { x: 50, y: 18 },
  RF: { x: 80, y: 32 },
};

export function defaultDiagram(name: string): Diagram {
  return {
    id: uid(),
    name,
    markers: (Object.keys(POSITION_XY) as Position[]).map((p) => ({ id: uid(), kind: "fielder" as const, label: p, ...POSITION_XY[p] })),
    arrows: [],
  };
}
