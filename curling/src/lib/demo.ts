import type { NotepadState } from "../store";
import type { FinishedGame, Lineup, Player, Position, Session, ShotType, Side } from "./types";
import { createGame, reduce, totals, type GameAction } from "./game";
import { throwersFor } from "./lineup";
import { defaultDiagram } from "./sheet";
import { defaultDrills } from "./defaults";

/** Demo deployments (e.g. curling-notepad-demo.vercel.app) start with sample data. */
export function isDemoHost(hostname: string): boolean {
  return hostname.toLowerCase().includes("demo");
}

/** Small seeded generator so the demo looks the same on every visit. */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const PLAYERS: [string, Position[], Player["hand"], string, number][] = [
  ["Morgan Reid", ["Skip"], "R", "Quiet slide; tends to pull out-turns wide under pressure.", 0.82],
  ["Jess Tanaka", ["Vice", "Skip"], "R", "Great draw weight. Working on a flatter trailing leg.", 0.78],
  ["Ali Brennan", ["Second"], "L", "Left-handed — hacks on the right foot. Strong hitter.", 0.74],
  ["Sam Okafor", ["Lead", "Second"], "R", "Very consistent guards; release sometimes late at the hog line.", 0.8],
  ["Casey Lindqvist", ["Alternate", "Lead"], "R", "Newer curler; uses a stabilizer.", 0.66],
];

/** Typical calls by stone: leads guard, seconds hit, vice and skip mix. */
const CALLS: ShotType[][] = [
  ["guard", "draw"], ["guard", "draw"], ["takeout", "hitroll"], ["peel", "draw"],
  ["freeze", "hitroll"], ["draw", "raise"], ["draw", "takeout"], ["draw", "tap"],
];

type EndPlan = [Side | null, number];

function playGame(
  id: string, opponentName: string, firstHammer: Side, ends: EndPlan[], players: Player[], lineup: Lineup, skill: Map<string, number>, seed: number, date: Date,
): FinishedGame {
  const rand = rng(seed);
  let g = createGame({
    id, teamName: "Team Reid", opponentName, scheduledEnds: 8, firstHammer,
    players: players.map((p) => ({ id: p.id, name: p.name })), throwers: throwersFor(lineup),
  });
  for (const [scorer, points] of ends) {
    for (let stone = 1; stone <= 8; stone++) {
      const thrower = g.throwers[stone - 1];
      const p = thrower ? skill.get(thrower) ?? 0.7 : 0.7;
      const calls = CALLS[stone - 1]!;
      const shotType = calls[Math.floor(rand() * calls.length)]!;
      // Skew toward the player's usual percentage: mostly 3s and 4s, the odd miss.
      const rating = Math.max(0, Math.min(4, Math.round(p * 4 + (rand() - 0.5) * 2.6)));
      g = reduce(g, { type: "shot", stone, shotType, rating });
    }
    const a: GameAction = scorer ? { type: "scoreEnd", scorer, points } : { type: "blankEnd" };
    g = reduce(g, a);
  }
  const t = totals(g);
  return { id, date: date.toISOString(), teamName: g.teamName, opponentName, scoreUs: t.us, scoreThem: t.them, firstHammer, ends: g.ends, shots: g.shots };
}

export function demoData(now = new Date()): Partial<NotepadState> {
  const players: Player[] = PLAYERS.map(([name, positions, hand, deliveryNotes], i) => ({
    id: `demo-p${i + 1}`, name, positions, hand, deliveryNotes, present: true,
    strengths: "", workOn: "", connectionNote: "",
  }));
  const [skip, vice, second, lead, alt] = players.map((p) => p.id) as [string, string, string, string, string];
  const lineup: Lineup = {
    id: "demo-lineup", name: "League Night",
    slots: { Lead: lead, Second: second, Vice: vice, Skip: skip, Alternate: alt },
    broomId: skip,
  };
  const skill = new Map(players.map((p, i) => [p.id, PLAYERS[i]![4]]));
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  const games = [
    playGame("demo-g1", "Team Moreau", "us", [["us", 2], ["them", 1], [null, 0], ["us", 1], ["them", 2], ["us", 2], ["them", 1], ["us", 1]], players, lineup, skill, 11, daysAgo(21)),
    playGame("demo-g2", "Team Halvorsen", "them", [["them", 1], ["us", 2], ["them", 3], [null, 0], ["us", 1], ["them", 1], ["us", 1], ["them", 2]], players, lineup, skill, 29, daysAgo(14)),
    // Tied 4–4 after eight: won in the extra end with the hammer.
    playGame("demo-g3", "Team Pike", "us", [["us", 1], ["them", 2], ["us", 2], ["them", 1], [null, 0], ["us", 1], ["them", 1], [null, 0], ["us", 1]], players, lineup, skill, 47, daysAgo(7)),
  ];

  const sessions: Session[] = [
    [3, 3, 4, 4, 3, 4],
    [4, 4, 3, 4, 4, 4],
    [4, 5, 4, 5, 4, 5],
  ].map(([prep, energy, communication, fun, learning, effort], i) => ({
    id: `demo-s${i + 1}`, date: daysAgo(18 - i * 6).toISOString(),
    ratings: { prep: prep!, energy: energy!, communication: communication!, fun: fun!, learning: learning!, effort: effort! },
    attendance: 5 - (i === 1 ? 1 : 0), targetsDone: 2, targetsTotal: 3, planMinutes: 60,
  }));

  const drills = defaultDrills();
  const plan = ["Balance Slides (No Stone)", "Line-of-Delivery Slides", "Split-Time Sweeping", "Draw to the Button", "Hit-and-Roll", "Hammer Management Ends"]
    .map((n) => drills.find((d) => d.name === n)!)
    .map((d, i) => ({ id: `demo-plan${i + 1}`, activity: d.name, duration: d.duration, station: d.category === "strategy" ? "Strategy" : `Sheet ${1 + (i % 2)}`, done: false }));
  const diagram = defaultDiagram("Centre Guard");
  const check = (prefix: string) => (text: string, i: number) => ({ id: `demo-${prefix}${i + 1}`, text, done: prefix === "e" && i < 2 });

  return {
    teamName: "Team Reid",
    players,
    targets: ["Every stone released before the hog line", "Sweepers call a split on every draw", "Skip's broom hit on 8 of 10 throws"].map(check("t")),
    iceTime: "Tuesdays 7:00 pm",
    sheet: "3",
    equipment: ["Brooms (5)", "Stopwatches (2)", "Sliders and grippers", "Helmets for new curlers", "Stabilizer"].map(check("e")),
    reminders: ["Book ice for playoff practice", "Collect league fees"].map(check("r")),
    drills,
    practicePlan: plan,
    lineups: [lineup],
    activeLineupId: lineup.id,
    diagrams: [diagram],
    activeDiagramId: diagram.id,
    finishedGames: games,
    sessions,
  };
}

/** Seeds an untouched store on demo hosts. Returns true when data was added. */
export function seedDemoIfEmpty(
  store: { getState: () => NotepadState; setState: (s: Partial<NotepadState>) => void },
  hostname: string,
): boolean {
  if (!isDemoHost(hostname)) return false;
  const s = store.getState();
  if (s.players.length || s.finishedGames.length || s.practicePlan.length) return false;
  store.setState(demoData());
  return true;
}
