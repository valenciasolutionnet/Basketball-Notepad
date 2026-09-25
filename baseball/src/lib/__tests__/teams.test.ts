import { beforeEach, describe, expect, it } from "vitest";
import { activeStateKey, activeTeam, createTeam, deleteTeam, ensureTeamsIndex, listTeams, renameTeam, switchTeam, teamStateKey } from "../teams";

// vitest runs this file under the "node" environment (see package.json's
// plain `vitest run`), which has no localStorage. teams.ts takes an
// injectable Storage, so a minimal in-memory polyfill is enough here.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
});

describe("ensureTeamsIndex", () => {
  it("creates one empty default team on a fresh device", () => {
    const idx = ensureTeamsIndex(storage);
    expect(idx.teams).toHaveLength(1);
    expect(idx.teams[0]?.name).toBe("My Team");
    expect(idx.activeTeamId).toBe(idx.teams[0]?.id);
    // Idempotent: reading again doesn't create a second team.
    expect(ensureTeamsIndex(storage).teams).toHaveLength(1);
  });

  it("migrates a legacy single-blob state into a team called 'My Team'", () => {
    storage.setItem("baseballNotepad.state.v1", JSON.stringify({ state: { teamName: "Wildcats" }, version: 1 }));
    const idx = ensureTeamsIndex(storage);
    expect(idx.teams).toHaveLength(1);
    expect(idx.teams[0]?.name).toBe("My Team");
    // The legacy bare key is gone, replaced by a team-scoped one with the same content.
    expect(storage.getItem("baseballNotepad.state.v1")).toBeNull();
    const migrated = storage.getItem(teamStateKey(idx.teams[0]!.id));
    expect(migrated && JSON.parse(migrated).state.teamName).toBe("Wildcats");
  });

  it("only migrates once — a second read after migration is a no-op", () => {
    storage.setItem("baseballNotepad.state.v1", JSON.stringify({ state: { teamName: "Wildcats" }, version: 1 }));
    const first = ensureTeamsIndex(storage);
    const second = ensureTeamsIndex(storage);
    expect(second).toEqual(first);
  });
});

describe("activeStateKey", () => {
  it("points at the active team's own state key", () => {
    const key = activeStateKey(storage);
    const idx = listTeams(storage);
    expect(key).toBe(teamStateKey(idx.activeTeamId));
  });
});

describe("createTeam / switchTeam / renameTeam", () => {
  it("creates a new team without touching the active one", () => {
    const idx0 = ensureTeamsIndex(storage);
    const created = createTeam("JV", storage);
    const idx1 = listTeams(storage);
    expect(idx1.teams).toHaveLength(2);
    expect(idx1.activeTeamId).toBe(idx0.activeTeamId); // creating doesn't switch
    expect(idx1.teams.map((t) => t.id)).toContain(created.id);
  });

  it("switches the active team", () => {
    const created = createTeam("JV", storage);
    switchTeam(created.id, storage);
    expect(listTeams(storage).activeTeamId).toBe(created.id);
    expect(activeTeam(storage).name).toBe("JV");
  });

  it("rejects switching to an unknown team", () => {
    expect(() => switchTeam("no-such-id", storage)).toThrow();
  });

  it("renames a team, trimming whitespace and ignoring an empty name", () => {
    const idx = ensureTeamsIndex(storage);
    const id = idx.teams[0]!.id;
    renameTeam(id, "  Varsity  ", storage);
    expect(listTeams(storage).teams[0]?.name).toBe("Varsity");
    renameTeam(id, "   ", storage);
    expect(listTeams(storage).teams[0]?.name).toBe("Varsity"); // unchanged
  });
});

describe("deleteTeam", () => {
  it("removes a team's index entry and its saved state", () => {
    const idx = ensureTeamsIndex(storage);
    const original = idx.teams[0]!.id;
    const jv = createTeam("JV", storage);
    storage.setItem(teamStateKey(jv.id), JSON.stringify({ state: {}, version: 1 }));

    deleteTeam(jv.id, storage);

    const after = listTeams(storage);
    expect(after.teams.map((t) => t.id)).toEqual([original]);
    expect(storage.getItem(teamStateKey(jv.id))).toBeNull();
  });

  it("falls back the active id when deleting the active team", () => {
    const jv = createTeam("JV", storage);
    switchTeam(jv.id, storage);
    deleteTeam(jv.id, storage);
    const after = listTeams(storage);
    expect(after.activeTeamId).toBe(after.teams[0]?.id);
    expect(after.activeTeamId).not.toBe(jv.id);
  });

  it("refuses to delete the only remaining team", () => {
    const idx = ensureTeamsIndex(storage);
    expect(() => deleteTeam(idx.teams[0]!.id, storage)).toThrow();
  });
});
