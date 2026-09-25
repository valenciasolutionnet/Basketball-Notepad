import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CheckItem, Diagram, Drill, FinishedGame, Id, Lineup, PitchOuting, PlanItem, Player, Prospect, ReviewRatings, Session,
} from "./lib/types";
import { uid } from "./lib/id";
import { defaultDrills } from "./lib/defaults";
import { defaultDiagram } from "./lib/diamond";
import { activeStateKey } from "./lib/teams";

type Updater<T> = T | ((prev: T) => T);

export interface ReviewNotes {
  worked: string;
  positives: string;
  next: string;
  gratitude: string;
}

export interface NotepadState {
  teamName: string;
  coachName: string;
  players: Player[];
  targets: CheckItem[];
  equipment: CheckItem[];
  reminders: CheckItem[];
  drills: Drill[];
  practicePlan: PlanItem[];
  lineups: Lineup[];
  activeLineupId: Id | null;
  diagrams: Diagram[];
  activeDiagramId: Id | null;
  outings: PitchOuting[];
  finishedGames: FinishedGame[];
  ratings: ReviewRatings;
  notes: ReviewNotes;
  sessions: Session[];
  /** Tryouts / cut list (Plan → Tryouts). Kept as history even after a prospect is promoted or cut. */
  tryouts: Prospect[];
}

type ListKey = {
  [K in keyof NotepadState]: NotepadState[K] extends unknown[] ? K : never;
}[keyof NotepadState];

export interface NotepadActions {
  set: <K extends keyof NotepadState>(key: K, value: Updater<NotepadState[K]>) => void;
  addPlayer: (name: string) => void;
  updatePlayer: (id: Id, patch: Partial<Player>) => void;
  removePlayer: (id: Id) => void;
  addToPlan: (activity: string, duration: number, station?: string) => void;
  saveSession: () => void;
  archiveGame: (g: FinishedGame, today: string) => void;
  removeFrom: (key: ListKey, id: Id) => void;
  resetAll: () => void;
  addProspect: (name: string) => void;
  updateProspect: (id: Id, patch: Partial<Prospect>) => void;
  /** Creates a roster player from a "kept" prospect (pre-filled from name/position) and links them. */
  promoteProspect: (id: Id) => void;
}

const defaultRatings = (): ReviewRatings => ({ prep: 3, energy: 3, communication: 3, fun: 3, learning: 3, effort: 3 });
const emptyNotes = (): ReviewNotes => ({ worked: "", positives: "", next: "", gratitude: "" });

function initialState(): NotepadState {
  const diagram = defaultDiagram("Standard Defense");
  return {
    teamName: "",
    coachName: "Coach",
    players: [],
    targets: [],
    equipment: [],
    reminders: [],
    drills: defaultDrills(),
    practicePlan: [],
    lineups: [],
    activeLineupId: null,
    diagrams: [diagram],
    activeDiagramId: diagram.id,
    outings: [],
    finishedGames: [],
    ratings: defaultRatings(),
    notes: emptyNotes(),
    sessions: [],
    tryouts: [],
  };
}

export function newPlayer(name: string): Player {
  return {
    id: uid(), name, number: "", age: null, bats: "R", throws: "R", positions: [],
    present: true, strengths: "", workOn: "", connectionNote: "",
  };
}

export function newProspect(name: string): Prospect {
  return { id: uid(), name, positions: [], rating: 0, notes: "", status: "trying-out", promotedPlayerId: null, createdAt: Date.now() };
}

export const useNotepad = create<NotepadState & NotepadActions>()(
  persist(
    (set, get) => ({
      ...initialState(),
      set: (key, value) =>
        set((s) => ({ [key]: typeof value === "function" ? (value as (p: unknown) => unknown)(s[key]) : value }) as Partial<NotepadState>),
      addPlayer: (name) => {
        const n = name.trim();
        if (!n) return;
        set((s) => ({ players: [...s.players, newPlayer(n)] }));
      },
      updatePlayer: (id, patch) => set((s) => ({ players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          lineups: s.lineups.map((l) => ({ ...l, battingOrder: l.battingOrder.filter((b) => b !== id) })),
        })),
      addToPlan: (activity, duration, station = "") =>
        set((s) => ({ practicePlan: [...s.practicePlan, { id: uid(), activity, duration, station, done: false }] })),
      saveSession: () => {
        const s = get();
        const session: Session = {
          id: uid(),
          date: new Date().toISOString(),
          ratings: s.ratings,
          attendance: s.players.filter((p) => p.present).length,
          targetsDone: s.targets.filter((t) => t.done).length,
          targetsTotal: s.targets.length,
          planMinutes: s.practicePlan.reduce((a, p) => a + p.duration, 0),
        };
        set({ sessions: [...s.sessions, session], targets: [], ratings: defaultRatings(), notes: emptyNotes() });
      },
      archiveGame: (g, today) =>
        set((s) => {
          const outings: PitchOuting[] = Object.entries(g.pitchCounts)
            .filter(([, n]) => n > 0)
            .map(([playerId, pitches]) => ({ id: uid(), playerId, date: today, pitches, source: "game" as const, gameId: g.id }));
          return {
            finishedGames: [...s.finishedGames.filter((f) => f.id !== g.id), g],
            outings: [...s.outings.filter((o) => o.gameId !== g.id), ...outings],
          };
        }),
      removeFrom: (key, id) =>
        set((s) => ({ [key]: (s[key] as { id: Id }[]).filter((x) => x.id !== id) }) as Partial<NotepadState>),
      resetAll: () => set(initialState()),
      addProspect: (name) => {
        const n = name.trim();
        if (!n) return;
        set((s) => ({ tryouts: [...s.tryouts, newProspect(n)] }));
      },
      updateProspect: (id, patch) => set((s) => ({ tryouts: s.tryouts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      promoteProspect: (id) =>
        set((s) => {
          const prospect = s.tryouts.find((p) => p.id === id);
          if (!prospect || prospect.promotedPlayerId) return {};
          const player: Player = { ...newPlayer(prospect.name), positions: prospect.positions };
          return {
            players: [...s.players, player],
            tryouts: s.tryouts.map((p) => (p.id === id ? { ...p, status: "kept", promotedPlayerId: player.id } : p)),
          };
        }),
    }),
    {
      // Multi-team support (src/lib/teams.ts): this resolves to the active
      // team's own key (${PREFIX}.state.v1.<teamId>), migrating any legacy
      // single-team blob the first time it runs. Switching teams rewrites
      // which key is active and reloads the page — see TeamSwitcher.
      name: activeStateKey(),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const {
          set: _s, addPlayer: _a, updatePlayer: _u, removePlayer: _r, addToPlan: _p, saveSession: _v, archiveGame: _g,
          removeFrom: _f, resetAll: _x, addProspect: _ap, updateProspect: _up, promoteProspect: _pp, ...data
        } = s;
        return data;
      },
    },
  ),
);
