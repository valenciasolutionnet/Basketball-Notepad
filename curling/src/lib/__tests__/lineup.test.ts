import { describe, expect, it } from "vitest";
import { autoFill, duplicateIds, newLineup, positionForStone, relievingPosition, throwersFor } from "../lineup";
import { demoData, isDemoHost, seedDemoIfEmpty } from "../demo";
import { totals } from "../game";
import type { Player, Position } from "../types";
import type { NotepadState } from "../../store";

const player = (id: string, positions: Position[]): Player => ({
  id, name: id, positions, hand: "R", deliveryNotes: "", present: true, strengths: "", workOn: "", connectionNote: "",
});

describe("lineup", () => {
  it("maps stones to positions: Lead 1–2, Second 3–4, Vice 5–6, Skip 7–8", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(positionForStone)).toEqual(["Lead", "Lead", "Second", "Second", "Vice", "Vice", "Skip", "Skip"]);
  });

  it("auto-fills preferred positions first and the vice holds the broom for a calling skip", () => {
    const players = [player("a", ["Skip"]), player("b", ["Lead"]), player("c", []), player("d", ["Vice"]), player("e", [])];
    const l = autoFill(newLineup("L"), players);
    expect(l.slots).toEqual({ Lead: "b", Second: "c", Vice: "d", Skip: "a", Alternate: "e" });
    expect(l.broomId).toBe("a");
    expect(relievingPosition(l)).toBe("Vice");
    expect(throwersFor(l)).toEqual(["b", "b", "c", "c", "d", "d", "a", "a"]);
    expect(duplicateIds({ ...l, slots: { ...l.slots, Alternate: "a" } })).toEqual(["a"]);
  });
});

describe("demo data", () => {
  it("only seeds demo hosts with an empty store", () => {
    expect(isDemoHost("curling-notepad-demo.vercel.app")).toBe(true);
    expect(isDemoHost("curling-notepad.vercel.app")).toBe(false);
    let state: Partial<NotepadState> = { players: [], finishedGames: [], practicePlan: [] };
    const store = { getState: () => state as NotepadState, setState: (s: Partial<NotepadState>) => { state = { ...state, ...s }; } };
    expect(seedDemoIfEmpty(store, "localhost")).toBe(false);
    expect(seedDemoIfEmpty(store, "curling-demo.local")).toBe(true);
    expect(state.players).toHaveLength(5);
    expect(seedDemoIfEmpty(store, "curling-demo.local")).toBe(false);
  });

  it("builds finished games whose scores match their ends", () => {
    const games = demoData().finishedGames ?? [];
    expect(games.length).toBeGreaterThanOrEqual(2);
    for (const g of games) {
      expect(totals(g)).toEqual({ us: g.scoreUs, them: g.scoreThem });
      expect(g.shots).toHaveLength(g.ends.length * 8);
      expect(g.scoreUs).not.toBe(g.scoreThem);
    }
  });
});
