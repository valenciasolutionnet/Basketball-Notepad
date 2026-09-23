import { describe, expect, it } from "vitest";
import { autoFill, catcherPitcherConflict, inningIssues, usage } from "../lineup";
import { newPlayer } from "../../store";

describe("autoFill", () => {
  const players = Array.from({ length: 12 }, (_, i) => ({ ...newPlayer(`P${i}`), positions: i < 2 ? (["P"] as const).slice() : [] }));
  const lineup = { id: "l", name: "L", battingOrder: players.map((p) => p.id), innings: 6, defense: {} };
  const grid = autoFill(lineup, players);

  it("fills all nine positions every inning with no duplicates", () => {
    for (let i = 0; i < 6; i++) {
      const issues = inningIssues(grid, i, lineup.battingOrder);
      expect(issues.missing).toEqual([]);
      expect(issues.duplicates).toEqual([]);
    }
  });

  it("spreads bench time evenly (12 players × 6 innings → 18 bench innings)", () => {
    const bench = players.map((p) => usage(grid, 6, p.id).bench);
    expect(bench.reduce((a, b) => a + b, 0)).toBe(18);
    expect(Math.max(...bench) - Math.min(...bench)).toBeLessThanOrEqual(1);
  });

  it("never schedules a 4+ inning catcher to pitch", () => {
    for (const p of players) expect(catcherPitcherConflict(grid, 6, p.id)).toBe(false);
  });
});
