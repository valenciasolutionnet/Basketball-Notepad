import { useState, useEffect, useRef } from "react";
import { Radio, RefreshCw, LogOut, Minus, Plus, Undo2, Flag } from "lucide-react";
import { C, syncId } from "./theme.jsx";
import { Panel, TextInput, IconBtn, SubHeading } from "./ui.jsx";
import { Court, ShotLegend, ShotLine, ShotLocationPicker, freeThrowSpot } from "./ShotChartTab.jsx";
import { applyOps, emptyStats, normalizeGame } from "./gameOps.js";

const CODE_KEY = "basketballNotepad.liveGameCode";
const MAX_SAVE_ATTEMPTS = 5;

function readSavedCode() {
  try {
    return localStorage.getItem(CODE_KEY) || "";
  } catch {
    return "";
  }
}
function writeSavedCode(code) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* storage unavailable — game still works, just won't resume after reload */
  }
}

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const STAT_LABELS = { reb: "REB", ast: "AST", stl: "STL", blk: "BLK", foul: "FOUL", to: "TO" };

function formatMinutes(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function livePlayedSeconds(p) {
  const extra = p.onCourt && p.checkedInAt ? (Date.now() - p.checkedInAt) / 1000 : 0;
  return (p.secondsPlayed || 0) + extra;
}

// Returns { game, version } or null when the code doesn't exist.
async function fetchGame(code) {
  const res = await fetch(`/api/game?code=${encodeURIComponent(code)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);
  const data = await res.json();
  return { game: normalizeGame(data.game), version: Number(data.version || 0) };
}

// Returns { ok: true, version } | { conflict: true, game, version } | { taken: true }.
async function saveGameRemote(code, game, baseVersion, create = false) {
  const res = await fetch(`/api/game?code=${encodeURIComponent(code)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game, baseVersion, create }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409) {
    if (data.taken) return { taken: true };
    return { conflict: true, game: data.game ? normalizeGame(data.game) : null, version: Number(data.version || 0) };
  }
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);
  return { ok: true, version: Number(data.version) };
}

const miniBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6,
  border: `1px solid ${C.line}`, background: "transparent", color: C.chalkDim, cursor: "pointer", padding: 0,
};

function shotBtnStyle(accent) {
  return {
    padding: "7px 11px", borderRadius: 7, border: `1px solid ${accent}`, background: "transparent",
    color: accent, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
  };
}

export function LiveGameTab({ players, onEndGame }) {
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [game, setGame] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [status, setStatus] = useState("");
  const [lastSynced, setLastSynced] = useState(null);
  const [myLabel, setMyLabel] = useState("Coach");
  const [messageDraft, setMessageDraft] = useState("");
  const [pendingShot, setPendingShot] = useState(null);
  const [chartScope, setChartScope] = useState("player");
  const [, setTick] = useState(0);

  // Sync model: `base` is the last game the server confirmed, with its version.
  // `queue` holds this tablet's actions not yet saved. What the coach sees is
  // always base + queue, so a newer copy from the other coach never hides a
  // local tap, and a rejected save just re-applies the queue on the newer base.
  const baseRef = useRef(null); // { game, version }
  const queueRef = useRef([]);
  const flushingRef = useRef(false);
  const codeRef = useRef("");

  const current = () => (baseRef.current ? applyOps(baseRef.current.game, queueRef.current) : null);
  const render = () => setGame(current());

  const applyCode = (c) => {
    codeRef.current = c;
    setCode(c);
    writeSavedCode(c);
  };
  const setBase = (game, version) => {
    baseRef.current = { game, version };
    render();
  };

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const flush = async () => {
    if (flushingRef.current || !baseRef.current || queueRef.current.length === 0) return;
    flushingRef.current = true;
    const c = codeRef.current;
    try {
      for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS && queueRef.current.length > 0; attempt++) {
        const sent = queueRef.current.length;
        const base = baseRef.current;
        const next = { ...applyOps(base.game, queueRef.current.slice(0, sent)), updatedAt: Date.now() };
        const result = await saveGameRemote(c, next, base.version);
        if (codeRef.current !== c) return; // coach left this game mid-save
        if (result.ok) {
          queueRef.current = queueRef.current.slice(sent);
          setBase(next, result.version);
          setLastSynced(new Date());
          setStatus("");
          attempt = -1; // saved; keep going if more taps queued up meanwhile
        } else if (result.conflict && result.game) {
          // The other coach saved first: take their game and re-apply ours on top.
          setBase(result.game, result.version);
        } else {
          setStatus("This game has expired or was removed — start a new one.");
          return;
        }
      }
      if (queueRef.current.length > 0) {
        // Lost the race several times in a row: back off briefly (randomized so
        // both tablets don't retry in lockstep) instead of waiting for the next refresh.
        setTimeout(() => {
          if (codeRef.current === c) flush();
        }, 200 + Math.random() * 400);
      }
    } catch (e) {
      if (codeRef.current === c) setStatus("Couldn't sync — your taps are kept and will retry automatically.");
    } finally {
      flushingRef.current = false;
    }
  };

  const dispatch = (op) => {
    if (!baseRef.current) return;
    const q = queueRef.current;
    const last = q[q.length - 1];
    // Typing a team name sends one op per keystroke; keep only the latest.
    if (op.type === "setText" && last && last.type === "setText" && last.field === op.field && !flushingRef.current) {
      queueRef.current = [...q.slice(0, -1), op];
    } else {
      queueRef.current = [...q, op];
    }
    render();
    flush();
  };

  const pullGame = async (c) => {
    if (flushingRef.current) return;
    try {
      const remote = await fetchGame(c);
      if (!remote || c !== codeRef.current || flushingRef.current) return;
      if (!baseRef.current || remote.version > baseRef.current.version) setBase(remote.game, remote.version);
      setLastSynced(new Date());
      if (queueRef.current.length > 0) flush(); // retry taps that failed to save earlier
    } catch (e) {
      /* transient network hiccup while polling — ignore */
    }
  };

  const startNewGame = async () => {
    const source = players.some((p) => p.present) ? players.filter((p) => p.present) : players;
    const initial = {
      teamName: "Us",
      opponentName: "Opponent",
      usScore: 0,
      oppScore: 0,
      players: source.map((p) => ({ id: p.id, name: p.name, ...emptyStats() })),
      messages: [],
      shots: [],
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    setStatus("Starting…");
    try {
      for (let i = 0; i < MAX_SAVE_ATTEMPTS; i++) {
        const c = generateGameCode();
        const result = await saveGameRemote(c, initial, 0, true);
        if (result.taken) continue; // code already used by another live game
        if (!result.ok) break;
        queueRef.current = [];
        applyCode(c);
        setBase(initial, result.version);
        setSelectedPlayerId(initial.players[0] ? initial.players[0].id : null);
        setLastSynced(new Date());
        setStatus("");
        return;
      }
      setStatus("Couldn't create a game code — try again.");
    } catch (e) {
      setStatus("Couldn't start the game — check your connection and try again.");
    }
  };

  const joinCode = async (raw, { silent } = {}) => {
    const c = raw.trim().toUpperCase();
    if (!c) return;
    if (!silent) setStatus("Joining…");
    try {
      const remote = await fetchGame(c);
      if (remote) {
        queueRef.current = [];
        applyCode(c);
        setBase(remote.game, remote.version);
        setSelectedPlayerId(remote.game.players[0] ? remote.game.players[0].id : null);
        setLastSynced(new Date());
        setStatus("");
      } else {
        if (silent) writeSavedCode("");
        setStatus(silent ? "" : "Game not found — double-check the code.");
      }
    } catch (e) {
      setStatus(silent ? `Couldn't reconnect to game ${c} — tap Join to retry.` : "Couldn't reach the game — check your connection and try again.");
      if (silent) setCodeInput(c);
    }
  };
  const joinGame = () => joinCode(codeInput);

  // Resume the game this tablet was in before a reload.
  useEffect(() => {
    const saved = readSavedCode();
    if (saved) joinCode(saved, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetLocal = () => {
    applyCode("");
    baseRef.current = null;
    queueRef.current = [];
    setGame(null);
    setSelectedPlayerId(null);
    setPendingShot(null);
    setStatus("");
  };

  const leaveGame = () => {
    const unsaved = queueRef.current.length > 0 ? " Some recent taps haven't synced yet and will be lost." : "";
    if (!window.confirm(`Leave game ${code}? You can rejoin later with the code.${unsaved}`)) return;
    resetLocal();
  };

  const endGame = () => {
    if (!window.confirm("End this game and save the stats and shot chart to Review?")) return;
    const g = current();
    if (g && onEndGame) onEndGame({ ...g, code: codeRef.current, endedAt: Date.now() });
    resetLocal();
  };

  useEffect(() => {
    if (!code) return undefined;
    const id = setInterval(() => pullGame(code), 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const addTeamScore = (n) => dispatch({ type: "score", side: "us", delta: n });
  const addOppScore = (n) => dispatch({ type: "score", side: "opp", delta: n });
  const bumpStat = (playerId, key, delta) => dispatch({ type: "stat", playerId, key, delta });
  const setTeamText = (field, value) => dispatch({ type: "setText", field, value });

  // loc is { x, y } on the court, or null when the coach skips placing it.
  const logShot = (playerId, points, made, loc) => {
    const g = current();
    if (!g) return;
    const spot = points === 1 ? freeThrowSpot(g.shots.filter((s) => s.playerId === playerId && s.pts === 1).length) : loc;
    dispatch({
      type: "shot",
      shot: { id: syncId(), playerId, pts: points, made, x: spot ? spot.x : null, y: spot ? spot.y : null, t: Date.now() },
    });
  };

  const undoLastShot = (playerId) => {
    const g = current();
    if (!g) return;
    const mine = g.shots.filter((s) => s.playerId === playerId);
    if (mine.length === 0) return;
    dispatch({ type: "undoShot", shotId: mine[mine.length - 1].id });
  };

  const requestShot = (playerId, points, made) => {
    if (points === 1) logShot(playerId, 1, made, null);
    else setPendingShot({ playerId, pts: points, made });
  };
  const finishShot = (loc) => {
    if (!pendingShot) return;
    logShot(pendingShot.playerId, pendingShot.pts, pendingShot.made, loc);
    setPendingShot(null);
  };

  const toggleCourt = (playerId) => {
    const g = current();
    const p = g && g.players.find((x) => x.id === playerId);
    if (!p) return;
    dispatch({ type: "court", playerId, on: !p.onCourt, at: Date.now() });
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;
    dispatch({ type: "message", message: { id: syncId(), text: text.trim(), from: myLabel || "Coach", time: Date.now() } });
    setMessageDraft("");
  };

  const subtitle = code ? `Game code ${code} · shared with your assistant coach` : "Track score and player stats, synced across coaches' tablets";
  const selectedPlayer = game ? game.players.find((p) => p.id === selectedPlayerId) : null;
  const allShots = game ? game.shots || [] : [];
  const chartShots = chartScope === "team" || !selectedPlayer ? allShots : allShots.filter((s) => s.playerId === selectedPlayer.id);
  const selectedHasShots = selectedPlayer ? allShots.some((s) => s.playerId === selectedPlayer.id) : false;

  return (
    <Panel icon={Radio} title="Live Game" subtitle={subtitle}>
      {!code || !game ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <button
              onClick={startNewGame}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "10px 14px",
                borderRadius: 8, border: "none", background: C.amber, color: C.amberInk, fontFamily: "'Inter', sans-serif",
                fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              }}
            >
              <Radio size={15} /> Start a new game
            </button>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.chalkDim, margin: "8px 0 0" }}>
              Creates a game code. Share it with your assistant coach so their tablet syncs to this same game.
            </p>
          </div>

          <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 16 }}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: C.sage,
                textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px",
              }}
            >
              Already have a code?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <TextInput value={codeInput} onChange={(v) => setCodeInput(v.toUpperCase())} placeholder="Enter game code" onEnter={joinGame} />
              <button
                onClick={joinGame}
                style={{
                  padding: "0 16px", borderRadius: 7, border: `1px solid ${C.amberDim}`, background: "transparent", color: C.amber,
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                Join
              </button>
            </div>
          </div>

          {status && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: status.includes("Couldn't") || status.includes("not found") ? C.red : C.chalkDim }}>
              {status}
            </p>
          )}
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: C.chalkFaint }}>
            Anyone with the game code can view and update this game's score and stats — great for you and an assistant coach, just don't post the code publicly.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.amber, letterSpacing: "0.05em" }}>
                CODE {code}
              </span>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.chalkFaint }}>
                {lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Not yet synced"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={endGame}
                style={{
                  display: "flex", alignItems: "center", gap: 5, height: 30, padding: "0 10px", borderRadius: 7,
                  border: `1px solid ${C.amberDim}`, background: "transparent", color: C.amber,
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}
              >
                <Flag size={13} /> End game
              </button>
              <IconBtn onClick={() => pullGame(code)}><RefreshCw size={14} /></IconBtn>
              <IconBtn onClick={leaveGame} danger><LogOut size={14} /></IconBtn>
            </div>
          </div>

          {status && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.red, margin: "0 0 12px" }}>
              {status}
            </p>
          )}

          <div
            style={{
              display: "flex", alignItems: "center", gap: 10, background: C.bg2, border: `1px solid ${C.line}`,
              borderRadius: 10, padding: "16px 10px", marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, textAlign: "center" }}>
              <input
                value={game.teamName}
                onChange={(e) => setTeamText("teamName", e.target.value)}
                style={{
                  width: "100%", textAlign: "center", background: "transparent", border: "none", outline: "none",
                  color: C.chalk, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, marginBottom: 2,
                }}
              />
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 38, fontWeight: 700, color: C.amber, lineHeight: 1 }}>
                {game.usScore}
              </div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => addTeamScore(n)}
                    style={{
                      width: 30, height: 26, borderRadius: 6, border: `1px solid ${C.amberDim}`, background: "rgba(224,135,44,0.14)",
                      color: C.amber, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}
                  >
                    +{n}
                  </button>
                ))}
                <button onClick={() => addTeamScore(-1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.line}`, background: "transparent", color: C.chalkDim, cursor: "pointer" }}>
                  <Minus size={12} style={{ margin: "0 auto" }} />
                </button>
              </div>
            </div>

            <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, color: C.chalkFaint, flexShrink: 0 }}>VS</span>

            <div style={{ flex: 1, textAlign: "center" }}>
              <input
                value={game.opponentName}
                onChange={(e) => setTeamText("opponentName", e.target.value)}
                style={{
                  width: "100%", textAlign: "center", background: "transparent", border: "none", outline: "none",
                  color: C.chalk, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, marginBottom: 2,
                }}
              />
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 38, fontWeight: 700, color: C.chalk, lineHeight: 1 }}>
                {game.oppScore}
              </div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => addOppScore(n)}
                    style={{
                      width: 30, height: 26, borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel3,
                      color: C.chalk, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}
                  >
                    +{n}
                  </button>
                ))}
                <button onClick={() => addOppScore(-1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.line}`, background: "transparent", color: C.chalkDim, cursor: "pointer" }}>
                  <Minus size={12} style={{ margin: "0 auto" }} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SubHeading>Coach comms</SubHeading>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.chalkDim, flexShrink: 0 }}>Sending as</span>
              <input
                value={myLabel}
                onChange={(e) => setMyLabel(e.target.value)}
                placeholder="Coach"
                style={{
                  flex: 1, maxWidth: 140, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 9px",
                  color: C.chalk, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {["Timeout!", "Foul trouble", "Sub out", "Sub now", "Nice adjustment"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => sendMessage(preset)}
                  style={{
                    padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.amberDim}`, background: "rgba(224,135,44,0.1)",
                    color: C.amber, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <TextInput value={messageDraft} onChange={setMessageDraft} placeholder="Type a quick message…" onEnter={() => sendMessage(messageDraft)} />
              <button
                onClick={() => sendMessage(messageDraft)}
                style={{
                  padding: "0 14px", borderRadius: 7, border: "none", background: C.amber, color: C.amberInk,
                  fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                Send
              </button>
            </div>

            {(game.messages || []).length === 0 ? (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.chalkFaint, fontStyle: "italic" }}>
                No messages yet — send one and it'll show up on the other coach's tablet within a few seconds.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column-reverse", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {(game.messages || []).slice().reverse().map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, color: C.sage }}>{m.from}</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.chalkFaint }}>
                        {new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalk }}>{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {game.players.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkFaint, fontStyle: "italic" }}>
              No players in this game — mark players Present in Attendance before starting your next game.
            </p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
                {game.players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 12px", borderRadius: 999, border: `1px solid ${p.id === selectedPlayerId ? C.amber : C.line}`,
                      background: p.id === selectedPlayerId ? C.amber : "transparent", color: p.id === selectedPlayerId ? C.amberInk : C.chalkDim,
                      fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    {p.onCourt && <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.id === selectedPlayerId ? C.amberInk : C.sage, flexShrink: 0 }} />}
                    {p.name}
                  </button>
                ))}
              </div>

              {selectedPlayer && (
                <div style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 17, color: C.chalk, letterSpacing: "0.02em" }}>
                      {selectedPlayer.name}
                    </span>
                    <button
                      onClick={() => toggleCourt(selectedPlayer.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999,
                        border: `1px solid ${selectedPlayer.onCourt ? C.sage : C.line}`,
                        background: selectedPlayer.onCourt ? "rgba(121,160,122,0.16)" : "transparent",
                        color: selectedPlayer.onCourt ? C.sage : C.chalkDim,
                        fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer",
                      }}
                    >
                      {selectedPlayer.onCourt ? "ON COURT" : "ON BENCH"}
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 30, color: C.amber, fontWeight: 700, lineHeight: 1 }}>
                        {selectedPlayer.pts}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: C.chalkDim, textTransform: "uppercase" }}>Points</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: C.chalk, fontWeight: 700, lineHeight: 1 }}>
                        {formatMinutes(livePlayedSeconds(selectedPlayer))}
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: C.chalkDim, textTransform: "uppercase" }}>Minutes</div>
                    </div>
                  </div>

                  <SubHeading>Shooting</SubHeading>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <button onClick={() => requestShot(selectedPlayer.id, 2, true)} style={shotBtnStyle(C.sage)}>+2 Make</button>
                    <button onClick={() => requestShot(selectedPlayer.id, 2, false)} style={shotBtnStyle(C.chalkDim)}>2 Miss</button>
                    <button onClick={() => requestShot(selectedPlayer.id, 3, true)} style={shotBtnStyle(C.amber)}>+3 Make</button>
                    <button onClick={() => requestShot(selectedPlayer.id, 3, false)} style={shotBtnStyle(C.chalkDim)}>3 Miss</button>
                    <button onClick={() => requestShot(selectedPlayer.id, 1, true)} style={shotBtnStyle(C.sage)}>+1 FT Make</button>
                    <button onClick={() => requestShot(selectedPlayer.id, 1, false)} style={shotBtnStyle(C.chalkDim)}>FT Miss</button>
                    <button
                      onClick={() => undoLastShot(selectedPlayer.id)}
                      disabled={!selectedHasShots}
                      style={{ ...shotBtnStyle(C.chalkDim), display: "flex", alignItems: "center", gap: 4, opacity: selectedHasShots ? 1 : 0.4, cursor: selectedHasShots ? "pointer" : "default" }}
                    >
                      <Undo2 size={12} /> Undo shot
                    </button>
                  </div>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.chalkDim, margin: "0 0 14px" }}>
                    FG {selectedPlayer.fgm}/{selectedPlayer.fga} · FT {selectedPlayer.ftm}/{selectedPlayer.fta}
                  </p>

                  <SubHeading>Stats</SubHeading>
                  <div className="np-stat-grid">
                    {Object.keys(STAT_LABELS).map((key) => (
                      <div key={key} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 700, color: C.chalkDim, marginBottom: 4 }}>
                          {STAT_LABELS[key]}
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: C.chalk, fontWeight: 700, marginBottom: 6 }}>
                          {selectedPlayer[key] || 0}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                          <button aria-label={`Remove ${STAT_LABELS[key]}`} onClick={() => bumpStat(selectedPlayer.id, key, -1)} style={miniBtnStyle}><Minus size={11} /></button>
                          <button aria-label={`Add ${STAT_LABELS[key]}`} onClick={() => bumpStat(selectedPlayer.id, key, 1)} style={miniBtnStyle}><Plus size={11} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <SubHeading>Shot Chart</SubHeading>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["player", selectedPlayer ? selectedPlayer.name : "Player"], ["team", "Team"]].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setChartScope(key)}
                        style={{
                          padding: "4px 10px", borderRadius: 999, border: `1px solid ${chartScope === key ? C.amber : C.line}`,
                          background: chartScope === key ? C.amber : "transparent", color: chartScope === key ? C.amberInk : C.chalkDim,
                          fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="np-court-cap">
                  <Court shots={chartShots} />
                  <ShotLegend />
                  <ShotLine shots={chartShots} />
                </div>
              </div>
            </>
          )}

          {pendingShot && (
            <ShotLocationPicker
              request={pendingShot}
              playerName={(game.players.find((p) => p.id === pendingShot.playerId) || {}).name || ""}
              onPick={finishShot}
              onSkip={() => finishShot(null)}
              onCancel={() => setPendingShot(null)}
            />
          )}
        </>
      )}
    </Panel>
  );
}
