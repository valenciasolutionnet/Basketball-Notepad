export type Id = string;

export const POSITIONS = ["Lead", "Second", "Vice", "Skip", "Alternate"] as const;
export type Position = (typeof POSITIONS)[number];
/** The four positions that throw, in delivery order. */
export type ThrowingPosition = Exclude<Position, "Alternate">;

export type Hand = "R" | "L";

export interface Player {
  id: Id;
  name: string;
  positions: Position[];
  /** Throwing hand — decides which foot is in the hack and which turn feels natural. */
  hand: Hand;
  deliveryNotes: string;
  present: boolean;
  strengths: string;
  workOn: string;
  connectionNote: string;
}

export interface CheckItem {
  id: Id;
  text: string;
  done: boolean;
}

export type DrillCategory = "delivery" | "sweeping" | "draw" | "takeout" | "line" | "strategy";

export interface Drill {
  id: Id;
  name: string;
  category: DrillCategory;
  duration: number;
  description: string;
  coachingPoint: string;
}

export interface PlanItem {
  id: Id;
  activity: string;
  duration: number;
  station: string;
  done: boolean;
}

export interface Lineup {
  id: Id;
  name: string;
  slots: Record<Position, Id | null>;
  /** Holds the broom and calls the game (usually the skip). */
  broomId: Id | null;
}

export interface DiagramStone {
  id: Id;
  kind: "red" | "yellow" | "broom";
  x: number;
  y: number;
}

export interface DiagramArrow {
  id: Id;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Diagram {
  id: Id;
  name: string;
  stones: DiagramStone[];
  arrows: DiagramArrow[];
}

export type Side = "us" | "them";

export const SHOT_TYPES = ["draw", "guard", "freeze", "takeout", "hitroll", "peel", "raise", "tap"] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

export interface Shot {
  id: Id;
  end: number;
  /** Our stone number in the end, 1–8. */
  stone: number;
  playerId: Id | null;
  type: ShotType;
  /** Standard shot-percentage scoring: 4 perfect … 0 missed. */
  rating: number;
}

export interface EndResult {
  /** Team that scored, or null for a blank end. */
  scorer: Side | null;
  points: number;
}

export interface GameEvent {
  id: Id;
  at: number;
  text: string;
}

export interface LiveGame {
  id: Id;
  /** Local calendar day the game started (yyyy-mm-dd). */
  startedDay: string;
  teamName: string;
  opponentName: string;
  scheduledEnds: number;
  firstHammer: Side;
  ends: EndResult[];
  shots: Shot[];
  /** Who throws each of our stones: index 0 is stone 1. */
  throwers: (Id | null)[];
  players: { id: Id; name: string }[];
  events: GameEvent[];
  final: boolean;
  updatedAt: number;
  rev: number;
}

export interface FinishedGame {
  id: Id;
  date: string;
  teamName: string;
  opponentName: string;
  scoreUs: number;
  scoreThem: number;
  firstHammer: Side;
  ends: EndResult[];
  shots: Shot[];
}

export interface ReviewRatings {
  prep: number;
  energy: number;
  communication: number;
  fun: number;
  learning: number;
  effort: number;
}

export interface Session {
  id: Id;
  date: string;
  ratings: ReviewRatings;
  attendance: number;
  targetsDone: number;
  targetsTotal: number;
  planMinutes: number;
}

export type TryoutStatus = "trying-out" | "kept" | "cut";

/** A tryout prospect — kept as roster history even after being promoted or cut. */
export interface Prospect {
  id: Id;
  name: string;
  positions: Position[];
  /** 0 (unrated) – 5. */
  rating: number;
  notes: string;
  status: TryoutStatus;
  /** Set once "Promote to roster" is used; the prospect stays in history. */
  promotedPlayerId: Id | null;
  createdAt: number;
}
