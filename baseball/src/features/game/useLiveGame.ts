import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LiveGame } from "../../lib/types";
import type { GameAction } from "../../lib/game";
import { createSync, type PushResult, type SyncState, type Transport } from "../../lib/sync";

export type { SyncStatus } from "../../lib/sync";

interface LiveGameStore extends SyncState {
  history: LiveGame[];
  myLabel: string;
  setMyLabel: (l: string) => void;
}

export const useLiveGameStore = create<LiveGameStore>()(
  persist(
    (set) => ({
      game: null,
      ackedRev: -1,
      pending: [],
      status: "local",
      message: "",
      history: [],
      myLabel: "Coach",
      setMyLabel: (myLabel) => set({ myLabel }),
    }),
    {
      name: "baseballNotepad.liveGame.v2",
      storage: createJSONStorage(() => localStorage),
      // Unsent plays survive a reload or a dead phone battery.
      partialize: (s) => ({ game: s.game, ackedRev: s.ackedRev, pending: s.pending, myLabel: s.myLabel }),
    },
  ),
);

export async function fetchGame(code: string): Promise<LiveGame | null> {
  const res = await fetch(`/api/game?code=${encodeURIComponent(code)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) throw new Error(String(res.status));
  return ((await res.json()) as { game: LiveGame }).game;
}

const transport: Transport = {
  pull: fetchGame,
  async push(game, baseRev): Promise<PushResult> {
    const res = await fetch(`/api/game?code=${encodeURIComponent(game.code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, baseRev }),
    });
    if (res.ok) return { kind: "ok" };
    if (res.status === 409) return { kind: "conflict", game: ((await res.json()) as { game: LiveGame | null }).game };
    if (res.status === 503 || res.status === 404 || res.status === 405) return { kind: "offline" };
    return { kind: "error" };
  },
};

const sync = createSync(
  {
    get: () => useLiveGameStore.getState(),
    set: (patch) => useLiveGameStore.setState(patch),
    onRebased: () => useLiveGameStore.setState({ history: [] }),
  },
  transport,
);

const POLL_MS = 2500;

/** Shared live game: optimistic local plays, undo, and conflict-safe sync. */
export function useLiveGame() {
  const game = useLiveGameStore((s) => s.game);
  const status = useLiveGameStore((s) => s.status);
  const message = useLiveGameStore((s) => s.message);
  const canUndo = useLiveGameStore((s) => s.history.length > 0);

  const dispatch = useCallback((a: GameAction) => {
    const before = useLiveGameStore.getState().game;
    if (sync.dispatch(a) && before) {
      useLiveGameStore.setState((s) => ({ history: [...s.history, before].slice(-50) }));
    }
  }, []);

  const undo = useCallback(() => {
    const { history } = useLiveGameStore.getState();
    const prev = history[history.length - 1];
    if (!prev) return;
    if (sync.dispatch({ type: "restore", game: prev })) useLiveGameStore.setState({ history: history.slice(0, -1) });
  }, []);

  const start = useCallback((g: LiveGame, ackedRev = -1) => {
    useLiveGameStore.setState({ history: [] });
    sync.start(g, ackedRev);
  }, []);

  const leave = useCallback(() => {
    useLiveGameStore.setState({ game: null, ackedRev: -1, pending: [], history: [], status: "local", message: "" });
  }, []);

  const code = game?.code;
  useEffect(() => {
    if (!code) return;
    const tick = () => {
      if (!document.hidden) void sync.poll();
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    window.addEventListener("online", tick);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", tick);
    };
  }, [code]);

  return { game, canUndo, status, message, dispatch, undo, start, leave };
}
