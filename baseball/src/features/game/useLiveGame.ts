import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LiveGame } from "../../lib/types";
import { reduce, type GameAction } from "../../lib/game";

export type SyncStatus = "local" | "synced" | "syncing" | "error" | "offline";

interface LiveGameStore {
  game: LiveGame | null;
  history: LiveGame[];
  status: SyncStatus;
  message: string;
  myLabel: string;
  setGame: (g: LiveGame | null, keepHistory?: boolean) => void;
  setStatus: (s: SyncStatus, message?: string) => void;
  setMyLabel: (l: string) => void;
}

export const useLiveGameStore = create<LiveGameStore>()(
  persist(
    (set) => ({
      game: null,
      history: [],
      status: "local",
      message: "",
      myLabel: "Coach",
      setGame: (game, keepHistory = false) => set((s) => ({ game, history: keepHistory ? s.history : [] })),
      setStatus: (status, message = "") => set({ status, message }),
      setMyLabel: (myLabel) => set({ myLabel }),
    }),
    {
      name: "baseballNotepad.liveGame.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ game: s.game, myLabel: s.myLabel }),
    },
  ),
);

export async function fetchGame(code: string): Promise<LiveGame | null> {
  const res = await fetch(`/api/game?code=${encodeURIComponent(code)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as { game: LiveGame }).game;
}

type PushResult = { ok: true } | { ok: false; conflict?: LiveGame; status: number };

async function pushGame(game: LiveGame): Promise<PushResult> {
  const res = await fetch(`/api/game?code=${encodeURIComponent(game.code)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(game),
  });
  if (res.ok) return { ok: true };
  if (res.status === 409) return { ok: false, status: 409, conflict: ((await res.json()) as { game: LiveGame }).game };
  return { ok: false, status: res.status };
}

const POLL_MS = 2500;

/** Shared live game with optimistic local updates, undo, and polling sync. */
export function useLiveGame() {
  const { game, history, status, message, setGame, setStatus } = useLiveGameStore();
  const inflight = useRef(0);

  const push = useCallback(async (g: LiveGame) => {
    inflight.current++;
    setStatus("syncing");
    try {
      const r = await pushGame(g);
      if (r.ok) setStatus("synced");
      else if (r.conflict) {
        // Another coach recorded a play first — take theirs.
        setGame(r.conflict);
        setStatus("synced", "Another device updated the game — refreshed to the latest.");
      } else if (r.status === 503 || r.status === 404) setStatus("offline", "Sync unavailable — scoring on this device only.");
      else setStatus("error", "Couldn't sync that play. It's saved here and will sync on the next play.");
    } catch {
      setStatus("error", "No connection. Plays are saved on this device.");
    } finally {
      inflight.current--;
    }
  }, [setGame, setStatus]);

  const dispatch = useCallback((a: GameAction) => {
    const cur = useLiveGameStore.getState().game;
    if (!cur) return;
    const next = reduce(cur, a);
    if (next === cur) return;
    useLiveGameStore.setState((s) => ({ game: next, history: [...s.history, cur].slice(-50) }));
    void push(next);
  }, [push]);

  const undo = useCallback(() => {
    const { game: cur, history: h } = useLiveGameStore.getState();
    const prev = h[h.length - 1];
    if (!cur || !prev) return;
    const restored = { ...prev, rev: cur.rev + 1, updatedAt: Date.now() };
    useLiveGameStore.setState({ game: restored, history: h.slice(0, -1) });
    void push(restored);
  }, [push]);

  const start = useCallback((g: LiveGame) => {
    setGame(g);
    void push(g);
  }, [push, setGame]);

  // Poll for other devices' plays.
  const code = game?.code;
  useEffect(() => {
    if (!code) return;
    let stop = false;
    const tick = async () => {
      if (inflight.current > 0 || document.hidden) return;
      try {
        const remote = await fetchGame(code);
        const local = useLiveGameStore.getState().game;
        if (stop || !remote || !local || local.code !== code) return;
        if (remote.rev > local.rev) setGame(remote);
        else if (remote.rev < local.rev && useLiveGameStore.getState().status !== "offline") void push(local);
      } catch {
        /* transient — next tick retries */
      }
    };
    void tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [code, push, setGame]);

  return { game, canUndo: history.length > 0, status, message, dispatch, undo, start, leave: () => setGame(null) };
}
