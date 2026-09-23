import type { Id, PitchOuting } from "./types";

/**
 * Little League Baseball regular-season pitch-count rules.
 * Leagues differ (travel, high school, Babe Ruth, etc.) — the UI labels these
 * as Little League defaults so coaches verify against their own rulebook.
 */
export function dailyMax(age: number | null): number | null {
  if (age == null) return null;
  if (age <= 6) return null;
  if (age <= 8) return 50;
  if (age <= 10) return 75;
  if (age <= 12) return 85;
  if (age <= 16) return 95;
  if (age <= 18) return 105;
  return null;
}

/** Required calendar days of rest after throwing `pitches` in a day. */
export function restDays(pitches: number, age: number | null): number {
  if (pitches <= 0) return 0;
  const older = age != null && age >= 15;
  const t = older ? [30, 45, 60, 75] : [20, 35, 50, 65];
  if (pitches <= t[0]!) return 0;
  if (pitches <= t[1]!) return 1;
  if (pitches <= t[2]!) return 2;
  if (pitches <= t[3]!) return 3;
  return 4;
}

/** A pitcher who throws 41+ pitches may not catch for the rest of that day. */
export const CATCH_AFTER_PITCH_LIMIT = 40;
/** A catcher of 4+ innings may not pitch that day. */
export const PITCH_AFTER_CATCH_INNINGS = 4;

export function toDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export interface Availability {
  eligible: boolean;
  /** First calendar day the pitcher may pitch again (yyyy-mm-dd). */
  nextEligible: string;
  pitchesToday: number;
  remainingToday: number | null;
  lastOuting: { date: string; pitches: number } | null;
}

/**
 * Per-day pitch totals for a player, then rest is counted from the most
 * recent day that still restricts `today`.
 */
export function availability(outings: PitchOuting[], playerId: Id, age: number | null, today: string): Availability {
  const byDay = new Map<string, number>();
  for (const o of outings) {
    if (o.playerId !== playerId) continue;
    byDay.set(o.date, (byDay.get(o.date) ?? 0) + o.pitches);
  }
  let nextEligible = today;
  let last: { date: string; pitches: number } | null = null;
  for (const [date, pitches] of byDay) {
    if (date >= today) continue;
    const free = addDays(date, restDays(pitches, age) + 1);
    if (free > nextEligible) nextEligible = free;
    if (!last || date > last.date) last = { date, pitches };
  }
  const pitchesToday = byDay.get(today) ?? 0;
  const max = dailyMax(age);
  const remainingToday = max == null ? null : Math.max(0, max - pitchesToday);
  return {
    eligible: nextEligible <= today && (remainingToday == null || remainingToday > 0),
    nextEligible,
    pitchesToday,
    remainingToday,
    lastOuting: last,
  };
}
