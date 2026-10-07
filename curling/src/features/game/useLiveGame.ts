import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LiveGame } from "../../lib/types";
import { reduce, type GameAction } from "../../lib/game";
import { fetchGame, generateGameCode, normalizeCode, saveGame } from "../../lib/liveSync";

interface LiveGameStore {
  game: LiveGame | null;
  history: LiveGame[];
}

export const useLiveGameStore = create<LiveGameStore>()(
  persist(
    (): LiveGameStore => ({ game: null, history: [] }),
    {
      name: "curlingNotepad.liveGame.v1",
      storage: createJSONStorage(() => localStorage),
      // The game and its undo trail survive a reload or a dead phone battery.
      partialize: (s) => ({ game: s.game, history: s.history }),
    },
  ),
);

/* ------------------------- cross-device sharing -------------------------- */
// Every local change to a shared game (one with a code) is pushed to
// /api/game; other devices poll and take any copy with a higher `rev`.

export type SyncStatus = "off" | "syncing" | "synced" | "offline";
const syncStatus = create<{ status: SyncStatus }>(() => ({ status: "off" }));
const setStatus = (status: SyncStatus) => syncStatus.setState({ status });

let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function takeRemote(remote: LiveGame) {
  applyingRemote = true;
  // Undo history is per device; a newer score from another phone starts fresh.
  useLiveGameStore.setState({ game: remote, history: [] });
  applyingRemote = false;
}

async function pushNow() {
  const g = useLiveGameStore.getState().game;
  if (!g?.code) return;
  try {
    const { newer } = await saveGame(g.code, g);
    if (newer && newer.rev > (useLiveGameStore.getState().game?.rev ?? -1)) takeRemote(newer);
    setStatus("synced");
  } catch {
    setStatus("offline");
  }
}

useLiveGameStore.subscribe((s, prev) => {
  if (applyingRemote || !s.game?.code || s.game === prev.game) return;
  setStatus("syncing");
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 300);
});

/** Poll for the other device's changes while a shared game is open. */
export function useLiveGameSync(intervalMs = 3000) {
  const code = useLiveGameStore((s) => s.game?.code);
  const status = syncStatus((s) => s.status);
  useEffect(() => {
    if (!code) {
      setStatus("off");
      return;
    }
    let stopped = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const remote = await fetchGame(code);
        if (stopped) return;
        const local = useLiveGameStore.getState().game;
        if (remote && local?.code === code && remote.rev > local.rev) takeRemote(remote);
        else if (!remote && local?.code === code) await pushNow(); // server copy expired — re-share
        if (syncStatus.getState().status !== "syncing") setStatus("synced");
      } catch {
        if (!stopped) setStatus("offline");
      }
    };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [code, intervalMs]);
  return status;
}

/** Join another coach's game by its code. */
export function useJoinGame() {
  const [state, setState] = useState<{ busy: boolean; error: string }>({ busy: false, error: "" });
  const join = useCallback(async (raw: string) => {
    const code = normalizeCode(raw);
    if (code.length < 3) {
      setState({ busy: false, error: "Enter the game code from the other coach's screen." });
      return;
    }
    setState({ busy: true, error: "" });
    try {
      const remote = await fetchGame(code);
      if (!remote) {
        setState({ busy: false, error: `No live game with code ${code}. Check the code and try again.` });
        return;
      }
      takeRemote({ ...remote, code });
      setState({ busy: false, error: "" });
    } catch {
      setState({ busy: false, error: "Couldn't reach the game server. Check your connection." });
    }
  }, []);
  return { join, ...state };
}

/** The game being scored on this device, with undo. */
export function useLiveGame() {
  const game = useLiveGameStore((s) => s.game);
  const canUndo = useLiveGameStore((s) => s.history.length > 0);

  const dispatch = useCallback((a: GameAction) => {
    const { game: before, history } = useLiveGameStore.getState();
    if (!before) return;
    const next = reduce(before, a);
    if (next === before) return;
    useLiveGameStore.setState({ game: next, history: [...history, before].slice(-50) });
  }, []);

  const undo = useCallback(() => {
    const { game: g, history } = useLiveGameStore.getState();
    const prev = history[history.length - 1];
    if (!prev || !g) return;
    useLiveGameStore.setState({ game: reduce(g, { type: "restore", game: prev }), history: history.slice(0, -1) });
  }, []);

  // Every new game gets a share code, so a second coach can join at any time.
  const start = useCallback((g: LiveGame) => useLiveGameStore.setState({ game: { ...g, code: g.code ?? generateGameCode() }, history: [] }), []);
  const leave = useCallback(() => useLiveGameStore.setState({ game: null, history: [] }), []);

  return { game, canUndo, dispatch, undo, start, leave };
}
