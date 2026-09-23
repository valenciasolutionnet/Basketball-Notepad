import { describe, expect, it } from "vitest";
import { createGame, currentBatterId, isGameOver, reduce, totals, type GameAction } from "../game";
import { battingLine } from "../stats";
import type { LiveGame } from "../types";

function game(weAreHome = false): LiveGame {
  return createGame({
    code: "TEST1", teamName: "Us", opponentName: "Them", weAreHome, scheduledInnings: 6,
    players: ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase(), number: "" })),
    battingOrder: ["a", "b", "c", "d"], pitcherId: "a",
  });
}
const run = (g: LiveGame, ...as: GameAction[]) => as.reduce(reduce, g);

describe("live game engine", () => {
  it("four balls walks the batter and counts opp pitches", () => {
    const g = run(game(), ...Array(4).fill({ type: "pitch", kind: "ball" }));
    expect(g.bases.first).toBe("a");
    expect(g.oppPitches).toBe(4);
    expect(g.plateAppearances[0]?.result).toBe("BB");
    expect(currentBatterId(g)).toBe("b");
  });

  it("fouls never make strike three", () => {
    const g = run(game(), { type: "pitch", kind: "strike" }, { type: "pitch", kind: "strike" }, { type: "pitch", kind: "foul" }, { type: "pitch", kind: "foul" });
    expect(g.strikes).toBe(2);
    expect(g.outs).toBe(0);
  });

  it("bases-loaded walk forces in a run with an RBI", () => {
    const g = run(game(), { type: "result", result: "BB" }, { type: "result", result: "BB" }, { type: "result", result: "BB" }, { type: "result", result: "BB" });
    expect(totals(g).us).toBe(1);
    expect(g.runsScored.a).toBe(1);
    expect(g.plateAppearances[3]?.rbi).toBe(1);
  });

  it("home run clears the bases", () => {
    const g = run(game(), { type: "result", result: "1B" }, { type: "result", result: "2B" }, { type: "result", result: "HR" });
    expect(totals(g).us).toBe(3);
    expect(g.bases).toEqual({ first: null, second: null, third: null });
    expect(g.plateAppearances[2]?.rbi).toBe(3);
    expect(g.oppPitches).toBe(3);
  });

  it("three outs flip the half and the away team's defense counts our pitcher", () => {
    let g = run(game(), { type: "result", result: "K" }, { type: "result", result: "OUT" }, { type: "result", result: "OUT" });
    expect(g.half).toBe("bottom");
    expect(g.outs).toBe(0);
    g = run(g, { type: "pitch", kind: "strike" }, { type: "oppResult", result: "1B" });
    expect(g.pitchCounts.a).toBe(2);
    expect(g.bases.first).toBe("__opp__");
  });

  it("sac fly scores the runner from third with fewer than two outs", () => {
    const g = run(game(), { type: "result", result: "3B" }, { type: "result", result: "SF" });
    expect(totals(g).us).toBe(1);
    expect(g.outs).toBe(1);
    expect(g.plateAppearances[1]?.rbi).toBe(1);
  });

  it("stolen base credits the runner", () => {
    const g = run(game(), { type: "result", result: "1B" }, { type: "runner", base: "first", move: "steal" });
    expect(g.bases.second).toBe("a");
    expect(g.stolenBases.a).toBe(1);
  });

  it("every change bumps rev; no-ops do not", () => {
    const g = game();
    const g2 = reduce(g, { type: "runner", base: "first", move: "advance" });
    expect(g2).toBe(g);
    expect(reduce(g, { type: "pitch", kind: "ball" }).rev).toBe(1);
  });
});

describe("batting line", () => {
  it("computes AVG/OBP/SLG with sac flies in the OBP denominator only", () => {
    const pa = (result: Parameters<typeof battingLine>[0][number]["result"]) => ({ id: result, playerId: "a", inning: 1, result, rbi: 0 });
    const l = battingLine([pa("1B"), pa("HR"), pa("K"), pa("BB"), pa("SF"), pa("SH")]);
    expect(l.ab).toBe(3);
    expect(l.h).toBe(2);
    expect(l.avg).toBeCloseTo(2 / 3);
    expect(l.obp).toBeCloseTo(3 / 5);
    expect(l.slg).toBeCloseTo(5 / 3);
  });
});

describe("game flow controls", () => {
  const threeOuts: GameAction[] = [{ type: "out" }, { type: "out" }, { type: "out" }];

  it("isGameOver: home team ahead after the top of the last inning", () => {
    let g = { ...game(true), scheduledInnings: 1 };
    g = run(g, { type: "oppRun", delta: 1 }, ...threeOuts); // top 1: them 1
    expect(isGameOver(g)).toBe(false); // bottom 1, home trails
    g = run(g, { type: "result", result: "HR" }, { type: "result", result: "HR" }); // walk-off 2-1
    expect(isGameOver(g)).toBe(true);
  });

  it("isGameOver: tie after regulation goes to extras, decided after the next full inning", () => {
    let g = { ...game(false), scheduledInnings: 1 }; // we are away
    g = run(g, ...threeOuts, ...threeOuts); // 0-0 after 1 → top 2
    expect(g.inning).toBe(2);
    expect(isGameOver(g)).toBe(false);
    g = run(g, { type: "result", result: "HR" }); // away leads in top 2
    expect(isGameOver(g)).toBe(false); // home still bats
    g = run(g, ...threeOuts, ...threeOuts); // bottom 2 scoreless → top 3
    expect(isGameOver(g)).toBe(true);
  });

  it("setBatter jumps within the current lap; substitute swaps the order slot and bases", () => {
    let g = run(game(), { type: "result", result: "1B" }); // A on first, B up
    g = run(g, { type: "setBatter", index: 3 });
    expect(currentBatterId(g)).toBe("d");
    g = { ...g, players: [...g.players, { id: "e", name: "E", number: "" }] };
    g = run(g, { type: "substitute", slot: 0, playerId: "e" });
    expect(g.battingOrder[0]).toBe("e");
    expect(g.bases.first).toBe("e");
    expect(run(g, { type: "substitute", slot: 1, playerId: "e" })).toBe(g); // already in the order
  });
});

describe("fielder's choice", () => {
  it("retires the lead runner when nobody is forced", () => {
    let g = run(game(), { type: "result", result: "2B" }); // A on second
    g = run(g, { type: "result", result: "FC" });
    expect(g.bases).toEqual({ first: "b", second: null, third: null });
    expect(g.outs).toBe(1);
  });
  it("is a no-op with the bases empty", () => {
    const g = game();
    expect(reduce(g, { type: "result", result: "FC" })).toBe(g);
  });
  it("restore puts back a snapshot as a new revision", () => {
    const g0 = game();
    const g1 = run(g0, { type: "result", result: "HR" });
    const g2 = reduce(g1, { type: "restore", game: g0 });
    expect(totals(g2).us).toBe(0);
    expect(g2.rev).toBe(g1.rev + 1);
  });
});
