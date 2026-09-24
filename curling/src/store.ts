import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CheckItem, Diagram, Drill, FinishedGame, Id, Lineup, PlanItem, Player, Position, ReviewRatings, Session,
} from "./lib/types";
import { uid } from "./lib/id";
import { defaultDrills } from "./lib/defaults";
import { defaultDiagram } from "./lib/sheet";

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
  iceTime: string;
  sheet: string;
  equipment: CheckItem[];
  reminders: CheckItem[];
  drills: Drill[];
  practicePlan: PlanItem[];
  lineups: Lineup[];
  activeLineupId: Id | null;
  diagrams: Diagram[];
  activeDiagramId: Id | null;
  finishedGames: FinishedGame[];
  ratings: ReviewRatings;
  notes: ReviewNotes;
  sessions: Session[];
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
  archiveGame: (g: FinishedGame) => void;
  removeFrom: (key: ListKey, id: Id) => void;
  resetAll: () => void;
}

const defaultRatings = (): ReviewRatings => ({ prep: 3, energy: 3, communication: 3, fun: 3, learning: 3, effort: 3 });
const emptyNotes = (): ReviewNotes => ({ worked: "", positives: "", next: "", gratitude: "" });

export function initialState(): NotepadState {
  const diagram = defaultDiagram("Centre Guard");
  return {
    teamName: "",
    coachName: "Coach",
    players: [],
    targets: [],
    iceTime: "",
    sheet: "",
    equipment: [],
    reminders: [],
    drills: defaultDrills(),
    practicePlan: [],
    lineups: [],
    activeLineupId: null,
    diagrams: [diagram],
    activeDiagramId: diagram.id,
    finishedGames: [],
    ratings: defaultRatings(),
    notes: emptyNotes(),
    sessions: [],
  };
}

export function newPlayer(name: string): Player {
  return {
    id: uid(), name, positions: [], hand: "R", deliveryNotes: "",
    present: true, strengths: "", workOn: "", connectionNote: "",
  };
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
          lineups: s.lineups.map((l) => ({
            ...l,
            slots: Object.fromEntries(Object.entries(l.slots).map(([k, v]) => [k, v === id ? null : v])) as Record<Position, Id | null>,
            broomId: l.broomId === id ? null : l.broomId,
          })),
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
      archiveGame: (g) => set((s) => ({ finishedGames: [...s.finishedGames.filter((f) => f.id !== g.id), g] })),
      removeFrom: (key, id) =>
        set((s) => ({ [key]: (s[key] as { id: Id }[]).filter((x) => x.id !== id) }) as Partial<NotepadState>),
      resetAll: () => set(initialState()),
    }),
    {
      name: "curlingNotepad.state.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { set: _s, addPlayer: _a, updatePlayer: _u, removePlayer: _r, addToPlan: _p, saveSession: _v, archiveGame: _g, removeFrom: _f, resetAll: _x, ...data } = s;
        return data;
      },
    },
  ),
);
