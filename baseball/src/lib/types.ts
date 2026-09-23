export type Id = string;

export const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"] as const;
export type Position = (typeof POSITIONS)[number];
export type FieldSlot = Position | "BN";

export type Hand = "R" | "L" | "S";

export interface Player {
  id: Id;
  name: string;
  number: string;
  /** League age (Little League: age as of Aug 31 of the season year). */
  age: number | null;
  bats: Hand;
  throws: Exclude<Hand, "S">;
  positions: Position[];
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

export type DrillCategory =
  | "hitting"
  | "fielding"
  | "throwing"
  | "pitching"
  | "catching"
  | "baserunning"
  | "situational"
  | "conditioning";

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

/** Defensive assignment grid: inning index -> playerId -> slot. */
export type DefenseGrid = Record<number, Record<Id, FieldSlot>>;

export interface Lineup {
  id: Id;
  name: string;
  battingOrder: Id[];
  innings: number;
  defense: DefenseGrid;
}

export interface DiagramMarker {
  id: Id;
  kind: "fielder" | "runner" | "ball";
  label: string;
  x: number;
  y: number;
}

export interface DiagramArrow {
  id: Id;
  kind: "throw" | "run";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Diagram {
  id: Id;
  name: string;
  markers: DiagramMarker[];
  arrows: DiagramArrow[];
}

export interface PitchOuting {
  id: Id;
  playerId: Id;
  date: string; // ISO yyyy-mm-dd
  pitches: number;
  source: "game" | "bullpen" | "manual";
  /** Set for outings logged from a saved Live Game, so re-saving replaces them. */
  gameId?: Id;
}

export type PlateResult = "1B" | "2B" | "3B" | "HR" | "BB" | "HBP" | "K" | "OUT" | "SH" | "SF" | "ROE" | "FC";

export interface PlateAppearance {
  id: Id;
  playerId: Id;
  inning: number;
  result: PlateResult;
  rbi: number;
}

export interface BaseState {
  first: Id | null;
  second: Id | null;
  third: Id | null;
}

export interface GameEvent {
  id: Id;
  at: number;
  text: string;
}

export interface CoachMessage {
  id: Id;
  from: string;
  text: string;
  at: number;
}

export interface LiveGame {
  code: string;
  /** Local calendar day the game started (yyyy-mm-dd) — pitch counts are logged to it. */
  startedDay?: string;
  teamName: string;
  opponentName: string;
  weAreHome: boolean;
  scheduledInnings: number;
  inning: number;
  half: "top" | "bottom";
  balls: number;
  strikes: number;
  outs: number;
  bases: BaseState;
  runsUs: number[];
  runsThem: number[];
  battingOrder: Id[];
  batterIndex: number;
  players: { id: Id; name: string; number: string }[];
  plateAppearances: PlateAppearance[];
  runsScored: Record<Id, number>;
  stolenBases: Record<Id, number>;
  pitcherId: Id | null;
  pitchCounts: Record<Id, number>;
  oppPitches: number;
  events: GameEvent[];
  messages: CoachMessage[];
  final: boolean;
  updatedAt: number;
  rev: number;
}

export interface FinishedGame {
  id: Id;
  date: string;
  teamName: string;
  opponentName: string;
  runsUs: number;
  runsThem: number;
  plateAppearances: PlateAppearance[];
  runsScored: Record<Id, number>;
  stolenBases: Record<Id, number>;
  pitchCounts: Record<Id, number>;
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

