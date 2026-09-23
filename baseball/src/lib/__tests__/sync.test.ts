import { describe, expect, it } from "vitest";
import { createGame, totals } from "../game";
import { createSync, type SyncState, type Transport } from "../sync";
import type { LiveGame } from "../types";

/** In-memory server with the same compare-and-set rule as api/game.ts. */
function fakeServer() {
  let stored: LiveGame | null = null;
  let rev = -1;
  const gates: (() => void)[] = [];
  let hold = false;
  const transport: Transport = {
    async push(game, baseRev) {
      if (hold) await new Promise<void>((r) => gates.push(r));
      if (rev !== baseRev) return { kind: "conflict", game: stored ? structuredClone(stored) : null };
      stored = structuredClone(game);
      rev = game.rev;
      return { kind: "ok" };
    },
    async pull() {
      return stored ? structuredClone(stored) : null;
    },
  };
  return {
    transport,
    get stored() { return stored; },
    hold() { hold = true; },
    release() { hold = false; gates.splice(0).forEach((g) => g()); },
  };
}

function client(transport: Transport) {
  let state: SyncState = { game: null, ackedRev: -1, pending: [], status: "local", message: "" };
  const sync = createSync({ get: () => state, set: (p) => { state = { ...state, ...p }; } }, transport);
  return { sync, get state() { return state; } };
}

const newGame = () =>
  createGame({
    code: "SYNC1", teamName: "Us", opponentName: "Them", weAreHome: false, scheduledInnings: 6,
    players: [{ id: "a", name: "A", number: "" }], battingOrder: ["a"], pitcherId: null,
  });
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("sync engine", () => {
  it("publishes a new game and acknowledges plays", async () => {
    const srv = fakeServer();
    const a = client(srv.transport);
    a.sync.start(newGame());
    await settle();
    a.sync.dispatch({ type: "result", result: "HR" });
    await settle();
    expect(a.state.pending).toEqual([]);
    expect(a.state.ackedRev).toBe(a.state.game!.rev);
    expect(totals(srv.stored!).us).toBe(1);
  });

  it("simultaneous plays from two devices both survive (conflict → rebase)", async () => {
    const srv = fakeServer();
    const a = client(srv.transport);
    a.sync.start(newGame());
    await settle();
    const b = client(srv.transport);
    b.sync.start(structuredClone(srv.stored!), srv.stored!.rev);
    await settle();

    srv.hold(); // both push at the same base revision
    a.sync.dispatch({ type: "result", result: "HR" });
    b.sync.dispatch({ type: "result", result: "HR" });
    srv.release();
    for (let i = 0; i < 5; i++) await settle();

    expect(totals(srv.stored!).us).toBe(2);
    await a.sync.poll();
    await b.sync.poll();
    expect(a.state.game).toEqual(srv.stored);
    expect(b.state.game).toEqual(srv.stored);
    expect(b.state.pending.length + a.state.pending.length).toBe(0);
  });

  it("plays made offline are kept and sent later", async () => {
    const srv = fakeServer();
    let down = true;
    const flaky: Transport = {
      push: (g, base) => (down ? Promise.reject(new Error("offline")) : srv.transport.push(g, base)),
      pull: (c) => (down ? Promise.reject(new Error("offline")) : srv.transport.pull(c)),
    };
    const a = client(flaky);
    a.sync.start(newGame());
    a.sync.dispatch({ type: "result", result: "HR" });
    await settle();
    expect(a.state.status).toBe("error");
    expect(a.state.pending.length).toBe(1);
    down = false;
    await a.sync.poll();
    await settle();
    expect(a.state.pending).toEqual([]);
    expect(totals(srv.stored!).us).toBe(1);
  });

  it("a response arriving after leaving the game is ignored", async () => {
    const srv = fakeServer();
    const a = client(srv.transport);
    srv.hold();
    a.sync.start(newGame());
    (a.state as SyncState).game = null; // leave while the push is in flight
    srv.release();
    await settle();
    expect(a.state.game).toBeNull();
  });
});
