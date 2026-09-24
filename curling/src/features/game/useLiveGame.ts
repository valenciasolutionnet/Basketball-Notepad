import { useCallback } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LiveGame } from "../../lib/types";
import { reduce, type GameAction } from "../../lib/game";

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

  const start = useCallback((g: LiveGame) => useLiveGameStore.setState({ game: g, history: [] }), []);
  const leave = useCallback(() => useLiveGameStore.setState({ game: null, history: [] }), []);

  return { game, canUndo, dispatch, undo, start, leave };
}
