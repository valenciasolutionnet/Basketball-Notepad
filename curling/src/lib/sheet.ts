import type { Diagram } from "./types";
import { uid } from "./id";

/**
 * One end of a sheet, 4 units per foot: the near hog line at the top, the
 * house centred on the tee, and the back and hack lines below it.
 */
export const SHEET = {
  w: 60,
  h: 148,
  hogY: 16,
  teeY: 100,
  backY: 124,
  hackY: 148,
  centreX: 30,
  /** 12 ft, 8 ft, 4 ft, and button radii. */
  rings: [24, 16, 8, 2] as const,
  stoneR: 2.2,
} as const;

export function defaultDiagram(name: string): Diagram {
  return {
    id: uid(),
    name,
    stones: [
      { id: uid(), kind: "red", x: SHEET.centreX, y: 58 },
      { id: uid(), kind: "yellow", x: SHEET.centreX + 3, y: SHEET.teeY - 4 },
      { id: uid(), kind: "broom", x: SHEET.centreX - 8, y: SHEET.teeY - 6 },
    ],
    arrows: [],
  };
}
