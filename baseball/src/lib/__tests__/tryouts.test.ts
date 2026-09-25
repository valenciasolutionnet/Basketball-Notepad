import { beforeEach, describe, expect, it } from "vitest";
import { useNotepad } from "../../store";

beforeEach(() => {
  useNotepad.setState({ tryouts: [], players: [] });
});

describe("tryouts store actions", () => {
  it("adds a prospect, trimming and ignoring an empty name", () => {
    useNotepad.getState().addProspect("  Jordan Lee  ");
    expect(useNotepad.getState().tryouts).toHaveLength(1);
    expect(useNotepad.getState().tryouts[0]?.name).toBe("Jordan Lee");
    expect(useNotepad.getState().tryouts[0]?.status).toBe("trying-out");
    expect(useNotepad.getState().tryouts[0]?.rating).toBe(0);

    useNotepad.getState().addProspect("   ");
    expect(useNotepad.getState().tryouts).toHaveLength(1);
  });

  it("updates a prospect's rating, notes, positions, and status", () => {
    useNotepad.getState().addProspect("Riley Park");
    const id = useNotepad.getState().tryouts[0]!.id;

    useNotepad.getState().updateProspect(id, { rating: 4, notes: "Strong arm", positions: ["SS"], status: "kept" });
    const p = useNotepad.getState().tryouts[0]!;
    expect(p.rating).toBe(4);
    expect(p.notes).toBe("Strong arm");
    expect(p.positions).toEqual(["SS"]);
    expect(p.status).toBe("kept");
  });

  it("cuts a prospect without removing them (history stays)", () => {
    useNotepad.getState().addProspect("Casey Fox");
    const id = useNotepad.getState().tryouts[0]!.id;
    useNotepad.getState().updateProspect(id, { status: "cut" });
    expect(useNotepad.getState().tryouts).toHaveLength(1);
    expect(useNotepad.getState().tryouts[0]?.status).toBe("cut");
  });

  it("promoting a kept prospect creates a roster player pre-filled from name/position and links them", () => {
    useNotepad.getState().addProspect("Avery Cole");
    const id = useNotepad.getState().tryouts[0]!.id;
    useNotepad.getState().updateProspect(id, { status: "kept", positions: ["CF", "LF"] });

    useNotepad.getState().promoteProspect(id);

    const state = useNotepad.getState();
    expect(state.players).toHaveLength(1);
    expect(state.players[0]?.name).toBe("Avery Cole");
    expect(state.players[0]?.positions).toEqual(["CF", "LF"]);

    const prospect = state.tryouts.find((t) => t.id === id)!;
    expect(prospect.promotedPlayerId).toBe(state.players[0]?.id);
    expect(prospect.status).toBe("kept");
    // Still in tryout history, not deleted.
    expect(state.tryouts).toHaveLength(1);
  });

  it("promoting twice does not create a second roster player", () => {
    useNotepad.getState().addProspect("Sam Rivers");
    const id = useNotepad.getState().tryouts[0]!.id;
    useNotepad.getState().updateProspect(id, { status: "kept" });
    useNotepad.getState().promoteProspect(id);
    useNotepad.getState().promoteProspect(id);
    expect(useNotepad.getState().players).toHaveLength(1);
  });

  it("removeFrom('tryouts', id) deletes a prospect entirely", () => {
    useNotepad.getState().addProspect("Drew Hale");
    const id = useNotepad.getState().tryouts[0]!.id;
    useNotepad.getState().removeFrom("tryouts", id);
    expect(useNotepad.getState().tryouts).toHaveLength(0);
  });
});
