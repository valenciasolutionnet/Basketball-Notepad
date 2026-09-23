import { describe, expect, it } from "vitest";
import { addDays, availability, dailyMax, restDays } from "../pitching";
import type { PitchOuting } from "../types";

describe("dailyMax", () => {
  it.each([[7, 50], [8, 50], [9, 75], [10, 75], [11, 85], [12, 85], [13, 95], [16, 95], [17, 105], [18, 105]])("age %i → %i", (age, max) => {
    expect(dailyMax(age)).toBe(max);
  });
  it("is null when age unknown", () => expect(dailyMax(null)).toBeNull());
});

describe("restDays", () => {
  it.each([[20, 0], [21, 1], [35, 1], [36, 2], [50, 2], [51, 3], [65, 3], [66, 4], [85, 4]])("14 and under: %i pitches → %i days", (n, d) => {
    expect(restDays(n, 12)).toBe(d);
  });
  it.each([[30, 0], [31, 1], [45, 1], [46, 2], [60, 2], [61, 3], [75, 3], [76, 4]])("15–18: %i pitches → %i days", (n, d) => {
    expect(restDays(n, 16)).toBe(d);
  });
});

describe("availability", () => {
  const o = (date: string, pitches: number): PitchOuting => ({ id: date, playerId: "p", date, pitches, source: "game" });
  it("66 pitches Monday → eligible Saturday (4 calendar days rest)", () => {
    const outings = [o("2026-09-21", 66)];
    expect(availability(outings, "p", 12, "2026-09-25").eligible).toBe(false);
    const sat = availability(outings, "p", 12, "2026-09-26");
    expect(sat.eligible).toBe(true);
    expect(sat.nextEligible).toBe("2026-09-26");
  });
  it("tracks remaining pitches today", () => {
    const a = availability([o("2026-09-23", 60)], "p", 12, "2026-09-23");
    expect(a.remainingToday).toBe(25);
    expect(a.eligible).toBe(true);
  });
  it("addDays crosses month boundaries", () => expect(addDays("2026-09-29", 3)).toBe("2026-10-02"));
});
