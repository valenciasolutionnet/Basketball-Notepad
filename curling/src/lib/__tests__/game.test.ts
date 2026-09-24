import { describe, expect, it } from "vitest";
import { createGame, currentEnd, hammer, hammerByEnd, isExtraEnd, isGameOver, nextHammer, reduce, totals, type GameAction } from "../game";
import { shotPct, shotsByPlayer } from "../stats";
import type { LiveGame } from "../types";

function game(scheduledEnds = 8, firstHammer: "us" | "them" = "us"): LiveGame {
  return createGame({
    id: "g1", teamName: "Us", opponentName: "Them", scheduledEnds, firstHammer,
    players: ["l", "s", "v", "k"].map((id) => ({ id, name: id.toUpperCase() })),
    throwers: ["l", "l", "s", "s", "v", "v", "k", "k"],
  });
}
const run = (g: LiveGame, ...as: GameAction[]) => as.reduce(reduce, g);
const us = (points: number): GameAction => ({ type: "scoreEnd", scorer: "us", points });
const them = (points: number): GameAction => ({ type: "scoreEnd", scorer: "them", points });
const blank: GameAction = { type: "blankEnd" };

describe("hammer", () => {
  it("passes to the other team when the hammer team scores", () => {
    const g = run(game(8, "us"), us(2));
    expect(hammer(g)).toBe("them");
  });

  it("passes to the other team after a steal (the team that scores loses it)", () => {
    const g = run(game(8, "us"), them(1));
    expect(hammer(g)).toBe("us");
  });

  it("stays with the same team after a blank end", () => {
    const g = run(game(8, "them"), blank, blank);
    expect(hammer(g)).toBe("them");
    expect(currentEnd(g)).toBe(3);
  });

  it("tracks the hammer end by end", () => {
    const g = run(game(8, "us"), us(1), blank, them(3), them(1));
    expect(hammerByEnd(g)).toEqual(["us", "them", "them", "us", "us"]);
    expect(nextHammer("us", { scorer: null, points: 0 })).toBe("us");
  });
});

describe("ends and game over", () => {
  it("is not over before the scheduled ends are played", () => {
    const g = run(game(4), us(5), us(3), us(2));
    expect(isGameOver(g)).toBe(false);
    expect(totals(g)).toEqual({ us: 10, them: 0 });
  });

  it("is over after the final end with a leader", () => {
    const g = run(game(4), us(2), them(1), blank, them(3));
    expect(isGameOver(g)).toBe(true);
    expect(totals(g)).toEqual({ us: 2, them: 4 });
  });

  it("plays an extra end when tied after the final end", () => {
    let g = run(game(2), us(1), them(1));
    expect(isGameOver(g)).toBe(false);
    expect(isExtraEnd(g)).toBe(true);
    expect(currentEnd(g)).toBe(3);
    g = run(g, blank); // a blank extra end decides nothing
    expect(isGameOver(g)).toBe(false);
    g = run(g, us(1));
    expect(isGameOver(g)).toBe(true);
    expect(totals(g)).toEqual({ us: 2, them: 1 });
  });

  it("ignores scoring once the game is decided and rejects out-of-range points", () => {
    const g = run(game(1), us(2));
    expect(reduce(g, them(1))).toBe(g);
    const g0 = game();
    expect(reduce(g0, us(0))).toBe(g0);
    expect(reduce(g0, us(9))).toBe(g0);
  });

  it("restore puts back a snapshot as a new revision", () => {
    const g0 = game();
    const g1 = run(g0, us(3));
    const g2 = reduce(g1, { type: "restore", game: g0 });
    expect(totals(g2).us).toBe(0);
    expect(g2.rev).toBe(g1.rev + 1);
  });
});

describe("shots", () => {
  it("credits the stone's thrower and replaces a re-rated stone", () => {
    let g = run(game(), { type: "shot", stone: 1, shotType: "guard", rating: 3 }, { type: "shot", stone: 7, shotType: "draw", rating: 4 });
    expect(g.shots.map((s) => s.playerId)).toEqual(["l", "k"]);
    g = run(g, { type: "shot", stone: 1, shotType: "guard", rating: 2 });
    expect(g.shots).toHaveLength(2);
    expect(g.shots.find((s) => s.stone === 1)?.rating).toBe(2);
    expect(reduce(g, { type: "shot", stone: 9, shotType: "draw", rating: 4 })).toBe(g);
    expect(reduce(g, { type: "shot", stone: 2, shotType: "draw", rating: 5 })).toBe(g);
  });

  it("a substitute throws both of that position's stones", () => {
    const g = run(game(), { type: "substitute", stone: 4, playerId: "alt" });
    expect(g.throwers).toEqual(["l", "l", "alt", "alt", "v", "v", "k", "k"]);
  });
});

describe("shot percentage", () => {
  it("is the rating sum over 4 × shots", () => {
    const l = shotPct([{ rating: 4 }, { rating: 3 }, { rating: 2 }, { rating: 0 }]);
    expect(l.shots).toBe(4);
    expect(l.points).toBe(9);
    expect(l.pct).toBeCloseTo(9 / 16);
    expect(shotPct([]).pct).toBe(0);
  });

  it("groups by player across ends", () => {
    const g = run(
      game(),
      { type: "shot", stone: 1, shotType: "guard", rating: 4 },
      { type: "shot", stone: 2, shotType: "draw", rating: 2 },
      us(1),
      { type: "shot", stone: 1, shotType: "guard", rating: 3 },
      { type: "shot", stone: 8, shotType: "takeout", rating: 1 },
    );
    const by = shotsByPlayer(g.shots);
    expect(by.get("l")?.pct).toBeCloseTo(9 / 12);
    expect(by.get("k")?.pct).toBeCloseTo(1 / 4);
  });
});
