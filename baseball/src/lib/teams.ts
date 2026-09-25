// Multi-team support, implemented as swappable named save-slots of the
// entire persisted store blob — NOT as part of the Zustand store's own
// persisted shape. This keeps every existing `useNotepad(s => s.roster)`
// style selector untouched: switching teams swaps which localStorage key
// the store's `persist` middleware reads from, then reloads the page.
//
// Keys:
//   ${PREFIX}.teams.v1          the index: { activeTeamId, teams: [...] }
//   ${PREFIX}.state.v1.<id>     one team's full persisted state blob
//   ${PREFIX}.state.v1          legacy (pre-multi-team) single blob, migrated away on first load

import { uid } from "./id";

const PREFIX = "baseballNotepad";
const INDEX_KEY = `${PREFIX}.teams.v1`;
const LEGACY_STATE_KEY = `${PREFIX}.state.v1`;

export interface Team {
  id: string;
  name: string;
  createdAt: number;
}
export interface TeamsIndex {
  activeTeamId: string;
  teams: Team[];
}

export const teamStateKey = (teamId: string): string => `${PREFIX}.state.v1.${teamId}`;

function defaultTeamName(): string {
  return "My Team";
}

function readIndex(storage: Storage): TeamsIndex | null {
  try {
    const raw = storage.getItem(INDEX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeamsIndex;
    if (!parsed || !Array.isArray(parsed.teams) || typeof parsed.activeTeamId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeIndex(storage: Storage, idx: TeamsIndex): void {
  storage.setItem(INDEX_KEY, JSON.stringify(idx));
}

/**
 * The store module calls activeStateKey() eagerly, at import time, to pick
 * Zustand's persist `name`. That must stay safe with no `localStorage`
 * global at all (SSR, or these lib tests running under vitest's plain node
 * environment) — so callers can pass a Storage explicitly, and otherwise we
 * fall back to `window.localStorage` only when one actually exists.
 */
function defaultStorage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

/**
 * Reads the teams index, creating one if this is the first load since this
 * feature shipped: the legacy single-blob state (if any) becomes a team
 * called "My Team"; otherwise a fresh empty team is created, matching what
 * a brand-new install already gets from the store's own defaults.
 *
 * With no Storage available (see defaultStorage above), returns a fresh
 * in-memory single-team index without persisting anything.
 */
export function ensureTeamsIndex(storage: Storage | null = defaultStorage()): TeamsIndex {
  if (!storage) {
    const id = uid();
    return { activeTeamId: id, teams: [{ id, name: defaultTeamName(), createdAt: Date.now() }] };
  }
  const existing = readIndex(storage);
  if (existing) return existing;

  const legacyBlob = storage.getItem(LEGACY_STATE_KEY);
  const id = uid();
  const idx: TeamsIndex = { activeTeamId: id, teams: [{ id, name: defaultTeamName(), createdAt: Date.now() }] };
  if (legacyBlob !== null) {
    storage.setItem(teamStateKey(id), legacyBlob);
    storage.removeItem(LEGACY_STATE_KEY);
  }
  writeIndex(storage, idx);
  return idx;
}

/** The localStorage key the Zustand store should persist to right now. */
export function activeStateKey(storage: Storage | null = defaultStorage()): string {
  const idx = ensureTeamsIndex(storage);
  return teamStateKey(idx.activeTeamId);
}

export function listTeams(storage: Storage | null = defaultStorage()): TeamsIndex {
  return ensureTeamsIndex(storage);
}

export function createTeam(name: string, storage: Storage = localStorage): Team {
  const idx = ensureTeamsIndex(storage);
  const team: Team = { id: uid(), name: name.trim() || defaultTeamName(), createdAt: Date.now() };
  idx.teams.push(team);
  writeIndex(storage, idx);
  return team;
}

export function renameTeam(id: string, name: string, storage: Storage = localStorage): void {
  const idx = ensureTeamsIndex(storage);
  const team = idx.teams.find((t) => t.id === id);
  if (!team) throw new Error("Unknown team.");
  const trimmed = name.trim();
  if (trimmed) team.name = trimmed;
  writeIndex(storage, idx);
}

/** Removes a team's index entry and its saved state. Refuses to remove the last team. */
export function deleteTeam(id: string, storage: Storage = localStorage): TeamsIndex {
  const idx = ensureTeamsIndex(storage);
  if (idx.teams.length <= 1) throw new Error("Can't delete the only team.");
  const remaining = idx.teams.filter((t) => t.id !== id);
  if (remaining.length === idx.teams.length) throw new Error("Unknown team.");
  idx.teams = remaining;
  storage.removeItem(teamStateKey(id));
  if (idx.activeTeamId === id) idx.activeTeamId = remaining[0]!.id;
  writeIndex(storage, idx);
  return idx;
}

/** Marks a team active. The caller reloads the page so the store re-persists from its key. */
export function switchTeam(id: string, storage: Storage = localStorage): TeamsIndex {
  const idx = ensureTeamsIndex(storage);
  if (!idx.teams.some((t) => t.id === id)) throw new Error("Unknown team.");
  idx.activeTeamId = id;
  writeIndex(storage, idx);
  return idx;
}

export function activeTeam(storage: Storage = localStorage): Team {
  const idx = ensureTeamsIndex(storage);
  return idx.teams.find((t) => t.id === idx.activeTeamId) ?? idx.teams[0]!;
}
