import type { LiveGame } from "./types";
import { reduce, type GameAction } from "./game";

/**
 * Multi-device live-game sync with compare-and-set.
 *
 * Every local play is kept as a pending action until the server acknowledges
 * it. A push carries `baseRev` — the server revision the local state was
 * built on — and the server only accepts it if that is still the stored
 * revision. On conflict the client takes the server's game and replays its
 * pending actions on top, so no coach's play is lost.
 */

export type PushResult =
  | { kind: "ok" }
  | { kind: "conflict"; game: LiveGame | null }
  | { kind: "offline" }
  | { kind: "error" };

export interface Transport {
  push: (game: LiveGame, baseRev: number) => Promise<PushResult>;
  pull: (code: string) => Promise<LiveGame | null>;
}

export type SyncStatus = "local" | "synced" | "syncing" | "error" | "offline";

export interface SyncState {
  game: LiveGame | null;
  /** Last server revision this device has confirmed; -1 = not on the server yet. */
  ackedRev: number;
  pending: GameAction[];
  status: SyncStatus;
  message: string;
}

export interface SyncStore {
  get: () => SyncState;
  set: (patch: Partial<SyncState>) => void;
  /** Called when local history no longer applies (server state replaced it). */
  onRebased?: () => void;
}

/** Apply actions on top of a server game. `restore` snapshots can't be replayed safely. */
export function rebase(server: LiveGame, pending: GameAction[]): { game: LiveGame; pending: GameAction[]; dropped: boolean } {
  if (pending.some((a) => a.type === "restore")) return { game: server, pending: [], dropped: true };
  return { game: pending.reduce(reduce, server), pending, dropped: false };
}

export function createSync(store: SyncStore, transport: Transport) {
  let inflight = false;

  async function flush(): Promise<void> {
    if (inflight) return;
    const start = store.get();
    if (!start.game || (start.pending.length === 0 && start.ackedRev >= 0)) return;
    inflight = true;
    const snapshot = start.game;
    const sent = start.pending.length;
    store.set({ status: "syncing" });
    let again = false;
    try {
      const r = await transport.push(snapshot, start.ackedRev);
      const now = store.get();
      if (!now.game || now.game.code !== snapshot.code) return; // left the game meanwhile
      if (r.kind === "ok") {
        const pending = now.pending.slice(sent);
        store.set({ ackedRev: snapshot.rev, pending, status: pending.length ? "syncing" : "synced", message: "" });
        again = pending.length > 0;
      } else if (r.kind === "conflict") {
        if (!r.game) {
          // Expired on the server: republish our copy as a new game.
          store.set({ ackedRev: -1 });
          again = true;
        } else {
          const rb = rebase(r.game, now.pending);
          store.set({
            game: rb.game,
            ackedRev: r.game.rev,
            pending: rb.pending,
            status: rb.pending.length ? "syncing" : "synced",
            message: rb.dropped
              ? "Another coach updated the game while you undid a play — showing their latest. Check the last play."
              : "Merged a play from another coach.",
          });
          store.onRebased?.();
          again = rb.pending.length > 0;
        }
      } else if (r.kind === "offline") {
        store.set({ status: "offline", message: "Sync unavailable — scoring on this device only." });
      } else {
        store.set({ status: "error", message: "Couldn't sync — plays are saved here and will send when you're back online." });
      }
    } catch {
      store.set({ status: "error", message: "No connection — plays are saved here and will send when you're back online." });
    } finally {
      inflight = false;
    }
    if (again) await flush();
  }

  function dispatch(a: GameAction): boolean {
    const s = store.get();
    if (!s.game) return false;
    const next = reduce(s.game, a);
    if (next === s.game) return false;
    store.set({ game: next, pending: [...s.pending, a] });
    void flush();
    return true;
  }

  /** Start publishing a brand-new game (or a joined one we have no server state for). */
  function start(game: LiveGame, ackedRev = -1): void {
    store.set({ game, ackedRev, pending: [], status: ackedRev < 0 ? "syncing" : "synced", message: "" });
    void flush();
  }

  /** Poll: adopt other devices' plays, or retry our own unsent ones. */
  async function poll(): Promise<void> {
    const s = store.get();
    if (!s.game || inflight) return;
    if (s.ackedRev < 0 || s.pending.length) {
      if (s.status !== "offline") await flush();
      return;
    }
    const code = s.game.code;
    let remote: LiveGame | null;
    try {
      remote = await transport.pull(code);
    } catch {
      return;
    }
    const now = store.get();
    // Re-check: a play may have been tapped (or the game left) during the fetch.
    if (!remote || inflight || !now.game || now.game.code !== code || now.pending.length) return;
    if (remote.rev !== now.ackedRev) {
      store.set({ game: remote, ackedRev: remote.rev, status: "synced", message: "" });
      store.onRebased?.();
    }
  }

  return { dispatch, flush, poll, start };
}
