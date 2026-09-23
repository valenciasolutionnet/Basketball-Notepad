import { useMemo, useState } from "react";
import { Radio, LogOut, Undo2, Flag, Send, Cloud, CloudOff, Loader2, Minus, Plus, Save, Copy } from "lucide-react";
import { useNotepad } from "../../store";
import { useLiveGame, useLiveGameStore, fetchGame } from "./useLiveGame";
import { createGame, currentBatterId, generateGameCode, isGameOver, OPP, totals, weAreBatting, type GameAction } from "../../lib/game";
import { battingByPlayer, rate } from "../../lib/stats";
import { availability, CATCH_AFTER_PITCH_LIMIT, dailyMax, restDays, toDay } from "../../lib/pitching";
import type { BaseState, LiveGame, PlateResult } from "../../lib/types";
import { BASE_XY } from "../../lib/diamond";
import { Field } from "../../components/Field";
import { Button, Empty, Panel, Segmented, SubHeading, TextInput, cx, inputCls } from "../../components/ui";

/* ---------------------------------- setup --------------------------------- */

function StartGame({ onStart }: { onStart: (g: LiveGame, ackedRev?: number) => void }) {
  const players = useNotepad((s) => s.players);
  const lineups = useNotepad((s) => s.lineups);
  const teamName = useNotepad((s) => s.teamName);
  const setField = useNotepad((s) => s.set);
  const [opp, setOpp] = useState("");
  const [home, setHome] = useState<"home" | "away">("home");
  const [innings, setInnings] = useState(6);
  const [lineupId, setLineupId] = useState(lineups[0]?.id ?? "");
  const [pitcherId, setPitcherId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState("");

  const lineup = lineups.find((l) => l.id === lineupId);
  const present = players.filter((p) => p.present);
  const order = (lineup?.battingOrder ?? (present.length ? present : players).map((p) => p.id)).filter((id) => players.some((p) => p.id === id));

  const start = () => {
    const g = createGame({
      code: generateGameCode(),
      teamName: teamName.trim() || "Us",
      opponentName: opp.trim() || "Opponent",
      weAreHome: home === "home",
      scheduledInnings: innings,
      players: players.map((p) => ({ id: p.id, name: p.name, number: p.number })),
      battingOrder: order,
      pitcherId: pitcherId || null,
    });
    onStart(g);
  };

  const join = async () => {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    setJoinMsg("Joining…");
    try {
      const g = await fetchGame(c);
      if (!g) return setJoinMsg("Game not found — check the code.");
      onStart(g, g.rev);
      setJoinMsg("");
    } catch {
      setJoinMsg("Couldn't reach live sync. Check your connection.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel icon={Radio} title="Start a Game" subtitle="Score pitch-by-pitch; other coaches join with the game code">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <TextInput value={teamName} onChange={(v) => setField("teamName", v)} placeholder="Your team name" />
          <TextInput value={opp} onChange={setOpp} placeholder="Opponent" />
          <label className="flex flex-col gap-1 text-xs text-chalk-dim">Batting order
            <select value={lineupId} onChange={(e) => setLineupId(e.target.value)} className={inputCls}>
              <option value="">Today's attendance (roster order)</option>
              {lineups.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-chalk-dim">Starting pitcher
            <select value={pitcherId} onChange={(e) => setPitcherId(e.target.value)} className={inputCls}>
              <option value="">Choose later</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <Segmented ariaLabel="Home or away" value={home} onChange={setHome} options={[{ value: "home", label: "Home" }, { value: "away", label: "Away" }]} />
            <label className="flex items-center gap-2 text-xs text-chalk-dim">Innings
              <select value={innings} onChange={(e) => setInnings(Number(e.target.value))} className="min-h-9 rounded-lg border border-line bg-turf-950 px-2 font-mono text-sm text-chalk">
                {[3, 4, 5, 6, 7, 9].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] text-chalk-dim">{order.length} batters in the order.</p>
        <Button className="mt-3 w-full" onClick={start} disabled={!order.length}>Play ball</Button>
        {!players.length && <Empty>Add your roster in Plan → Roster first.</Empty>}
      </Panel>

      <Panel icon={Radio} title="Join a Game" subtitle="Enter the code from the scorekeeper's device">
        <div className="flex gap-2">
          <TextInput className="font-mono uppercase tracking-[0.3em]" value={joinCode} onChange={(v) => setJoinCode(v.toUpperCase())} onEnter={join} placeholder="CODE" />
          <Button onClick={join}>Join</Button>
        </div>
        {joinMsg && <p className="mt-2 text-[13px] text-clay">{joinMsg}</p>}
      </Panel>
    </div>
  );
}

/* -------------------------------- scoreboard ------------------------------- */

function LineScore({ g }: { g: LiveGame }) {
  const cols = Math.max(g.scheduledInnings, g.inning);
  const t = totals(g);
  const rows = g.weAreHome
    ? [{ name: g.opponentName, runs: g.runsThem, total: t.them }, { name: g.teamName, runs: g.runsUs, total: t.us }]
    : [{ name: g.teamName, runs: g.runsUs, total: t.us }, { name: g.opponentName, runs: g.runsThem, total: t.them }];
  const played = (row: number, i: number) => i + 1 < g.inning || (i + 1 === g.inning && (row === 0 || g.half === "bottom"));
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[300px] font-mono text-[13px]">
        <thead>
          <tr className="text-chalk-dim">
            <th className="text-left font-sans text-[11px] font-semibold" />
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} className={cx("w-6 text-center", i + 1 === g.inning && "text-clay")}>{i + 1}</th>
            ))}
            <th className="w-9 text-center text-chalk">R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-line">
              <td className="max-w-28 truncate py-1.5 pr-2 font-sans font-semibold">{r.name}</td>
              {Array.from({ length: cols }, (_, i) => (
                <td key={i} className="text-center">{played(ri, i) ? r.runs[i] ?? 0 : ""}</td>
              ))}
              <td className="text-center font-display text-xl text-clay">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dots({ n, of, color, label }: { n: number; of: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${label} ${n}`}>
      <span className="w-3 text-[11px] font-bold text-chalk-dim">{label}</span>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={cx("size-3.5 rounded-full border", i < n ? color : "border-line")} />
      ))}
    </div>
  );
}

const BASE_KEYS: (keyof BaseState)[] = ["first", "second", "third"];

function Bases({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  const [sel, setSel] = useState<keyof BaseState | null>(null);
  const name = (id: string | null) => (!id ? "" : id === OPP ? "R" : g.players.find((p) => p.id === id)?.name.split(" ")[0] ?? "R");
  const runner = sel ? g.bases[sel] : null;
  return (
    <div>
      <Field className="mx-auto block w-full max-w-[300px] rounded-lg" role="group" aria-label="Bases">
        {BASE_KEYS.map((b) => {
          const xy = BASE_XY[b];
          const occupied = g.bases[b];
          return (
            <g key={b} onClick={() => occupied && setSel(sel === b ? null : b)} className={occupied ? "cursor-pointer" : undefined}>
              <rect x={xy.x - 5} y={xy.y - 5} width={10} height={10} transform={`rotate(45 ${xy.x} ${xy.y})`}
                fill={occupied ? "#d9824b" : "transparent"} stroke={sel === b ? "#fff" : "transparent"} strokeWidth={0.8} />
              {occupied && (
                <text x={xy.x} y={xy.y - 7.5} textAnchor="middle" fontSize={4} fontWeight={700} fill="#f1ede2" fontFamily="Inter, sans-serif">{name(occupied)}</text>
              )}
            </g>
          );
        })}
      </Field>
      {sel && runner && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {(["advance", "steal", "score", "out", "remove"] as const).map((m) => (
            <Button key={m} variant={m === "out" ? "danger" : "ghost"} className="min-h-9 capitalize"
              onClick={() => { dispatch({ type: "runner", base: sel, move: m }); setSel(null); }}>
              {m === "advance" ? "Advance" : m === "steal" ? "Stole" : m === "score" ? "Scores" : m === "out" ? "Out" : "Clear"}
            </Button>
          ))}
        </div>
      )}
      {!sel && (g.bases.first || g.bases.second || g.bases.third) && <p className="mt-1 text-center text-[11px] text-chalk-dim">Tap a runner to move them</p>}
    </div>
  );
}

/* --------------------------------- controls -------------------------------- */

const OUR_RESULTS: { r: PlateResult; label: string; tone: "hit" | "on" | "out" }[] = [
  { r: "1B", label: "1B", tone: "hit" }, { r: "2B", label: "2B", tone: "hit" }, { r: "3B", label: "3B", tone: "hit" }, { r: "HR", label: "HR", tone: "hit" },
  { r: "BB", label: "BB", tone: "on" }, { r: "HBP", label: "HBP", tone: "on" }, { r: "ROE", label: "E", tone: "on" }, { r: "FC", label: "FC", tone: "on" },
  { r: "K", label: "K", tone: "out" }, { r: "OUT", label: "Out", tone: "out" }, { r: "SF", label: "SF", tone: "out" }, { r: "SH", label: "Sac", tone: "out" },
];
const OPP_RESULTS = ["1B", "2B", "3B", "HR", "BB", "HBP", "ROE", "K", "OUT"] as const;
const toneCls = { hit: "border-grass text-grass", on: "border-clay text-clay", out: "border-line text-chalk" };

function PitchPad({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button variant="ghost" className="min-h-14 text-base" onClick={() => dispatch({ type: "pitch", kind: "ball" })}>Ball</Button>
      <Button variant="ghost" className="min-h-14 text-base" onClick={() => dispatch({ type: "pitch", kind: "strike" })}>Strike</Button>
      <Button variant="ghost" className="min-h-14 text-base" onClick={() => dispatch({ type: "pitch", kind: "foul" })} disabled={g.final}>Foul</Button>
    </div>
  );
}

function OffenseControls({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  const batterId = currentBatterId(g);
  const batter = g.players.find((p) => p.id === batterId);
  const lines = useMemo(() => battingByPlayer(g.plateAppearances, g.runsScored, g.stolenBases), [g.plateAppearances, g.runsScored, g.stolenBases]);
  const today = batterId ? g.plateAppearances.filter((p) => p.playerId === batterId).map((p) => p.result) : [];
  const upNext = [1, 2].map((k) => g.players.find((p) => p.id === g.battingOrder[(g.batterIndex + k) % g.battingOrder.length]));
  const last = g.plateAppearances[g.plateAppearances.length - 1];
  const record = (r: PlateResult) => dispatch({ type: "result", result: r });

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-line bg-turf-950 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-grass">At bat · #{(g.batterIndex % Math.max(1, g.battingOrder.length)) + 1}</div>
            <div className="truncate font-display text-2xl uppercase">{batter ? `${batter.number ? `#${batter.number} ` : ""}${batter.name}` : "—"}</div>
          </div>
          <div className="text-right font-mono text-xs text-chalk-dim">
            {batterId && lines.get(batterId) ? `${lines.get(batterId)!.h}-${lines.get(batterId)!.ab}` : "0-0"}
            <div>{today.join(" ")}</div>
          </div>
        </div>
        <div className="mt-1 text-[11.5px] text-chalk-dim">On deck: {upNext[0]?.name ?? "—"} · In the hole: {upNext[1]?.name ?? "—"}</div>
      </div>

      <PitchPad g={g} dispatch={dispatch} />
      <p className="-mt-1 text-[11px] text-chalk-dim">Hits, outs in play, and HBP add the final pitch automatically.</p>

      <div className="grid grid-cols-4 gap-1.5">
        {OUR_RESULTS.map((o) => (
          <button key={o.r} type="button" onClick={() => record(o.r)}
            className={cx("min-h-12 rounded-lg border bg-turf-950 font-mono text-sm font-bold active:scale-95", toneCls[o.tone])}>
            {o.label}
          </button>
        ))}
      </div>
      {last && (
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5 text-[12.5px]">
          <span className="text-chalk-dim">Last: {g.players.find((p) => p.id === last.playerId)?.name} {last.result}</span>
          <span className="flex items-center gap-1.5">RBI
            <button type="button" aria-label="Fewer RBI" className="flex size-8 items-center justify-center rounded-md border border-line" onClick={() => dispatch({ type: "adjustRbi", delta: -1 })}><Minus size={13} /></button>
            <span className="w-4 text-center font-mono">{last.rbi}</span>
            <button type="button" aria-label="More RBI" className="flex size-8 items-center justify-center rounded-md border border-line" onClick={() => dispatch({ type: "adjustRbi", delta: 1 })}><Plus size={13} /></button>
          </span>
        </div>
      )}
      <p className="text-[11.5px] text-chalk-dim">Their pitcher: <span className="font-mono text-chalk">{g.oppPitches}</span> pitches seen</p>
    </div>
  );
}

function DefenseControls({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  const players = useNotepad((s) => s.players);
  const outings = useNotepad((s) => s.outings);
  const pitcher = players.find((p) => p.id === g.pitcherId);
  const count = g.pitcherId ? g.pitchCounts[g.pitcherId] ?? 0 : 0;
  // Count against the day the game started (games can run past midnight), and
  // skip this game's own saved outings so Save → Reopen doesn't double-count.
  const today = g.startedDay ?? toDay(new Date());
  const otherOutings = outings.filter((o) => o.gameId !== g.code);
  const prior = pitcher ? availability(otherOutings, pitcher.id, pitcher.age, today) : null;
  const max = pitcher ? dailyMax(pitcher.age) : null;
  const totalToday = count + (prior?.pitchesToday ?? 0);
  const pct = max ? Math.min(100, (totalToday / max) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-line bg-turf-950 p-3">
        <div className="flex items-center gap-2">
          <select aria-label="Our pitcher" value={g.pitcherId ?? ""} onChange={(e) => dispatch({ type: "setPitcher", playerId: e.target.value || null })} className={cx(inputCls, "flex-1")}>
            <option value="">Select pitcher…</option>
            {g.players.map((p) => <option key={p.id} value={p.id}>{p.name}{g.pitchCounts[p.id] ? ` (${g.pitchCounts[p.id]})` : ""}</option>)}
          </select>
          <div className="text-right">
            <div className="font-display text-3xl leading-none text-clay">{count}</div>
            <div className="text-[10px] uppercase text-chalk-dim">pitches</div>
          </div>
        </div>
        {pitcher && (
          <>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-turf-700">
              <div className={cx("h-full transition-all", pct >= 100 ? "bg-stitch" : pct >= 80 ? "bg-clay" : "bg-grass")} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[11.5px] text-chalk-dim">
              <span>{max ? `${Math.max(0, max - totalToday)} left of ${max}` : "Set league age in Roster for limits"}</span>
              <span>Rest needed: {restDays(totalToday, pitcher.age)} day(s)</span>
            </div>
            {prior && !prior.eligible && prior.nextEligible > today && (
              <p className="mt-1 text-[12px] font-semibold text-stitch">Not eligible today — resting until {prior.nextEligible}.</p>
            )}
            {max != null && totalToday >= max && <p className="mt-1 text-[12px] font-semibold text-stitch">Daily max reached — may finish the current batter only.</p>}
            {totalToday > CATCH_AFTER_PITCH_LIMIT && <p className="mt-1 text-[11.5px] text-clay">41+ pitches: can't catch the rest of today.</p>}
          </>
        )}
      </div>

      <PitchPad g={g} dispatch={dispatch} />
      <p className="-mt-1 text-[11px] text-chalk-dim">Hits, outs in play, and HBP add the final pitch automatically.</p>
      <div className="grid grid-cols-5 gap-1.5">
        {OPP_RESULTS.map((r) => (
          <button key={r} type="button"
            onClick={() => dispatch({ type: "oppResult", result: r })}
            className={cx("min-h-12 rounded-lg border bg-turf-950 font-mono text-sm font-bold active:scale-95", r === "K" || r === "OUT" ? "border-grass text-grass" : "border-line text-chalk")}>
            {r === "ROE" ? "E" : r}
          </button>
        ))}
        <button type="button" onClick={() => dispatch({ type: "oppRun", delta: 1 })} className="min-h-12 rounded-lg border border-stitch bg-turf-950 text-xs font-bold text-stitch">+Run</button>
      </div>
    </div>
  );
}

/* ---------------------------------- extras --------------------------------- */

function BoxScore({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  const lines = battingByPlayer(g.plateAppearances, g.runsScored, g.stolenBases);
  const [subSlot, setSubSlot] = useState<number | null>(null);
  const n = g.battingOrder.length;
  const upSlot = n ? g.batterIndex % n : -1;
  const bench = g.players.filter((p) => !g.battingOrder.includes(p.id));
  const editable = !g.final && weAreBatting(g);
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[440px] text-[12.5px]">
        <thead className="text-[11px] text-chalk-dim">
          <tr>{["", "Batter", "AB", "R", "H", "RBI", "BB", "K", "SB", "AVG"].map((h, i) => <th key={i} className={cx("py-1 font-semibold", h === "Batter" ? "text-left" : "text-center")}>{h}</th>)}</tr>
        </thead>
        <tbody className="font-mono">
          {g.battingOrder.map((id, slot) => {
            const p = g.players.find((x) => x.id === id);
            const l = lines.get(id);
            const up = slot === upSlot && !g.final;
            return (
              <tr key={id} className={cx("border-t border-line", up && weAreBatting(g) && "bg-clay/10")}>
                <td className="w-7 text-center">
                  {editable ? (
                    <button type="button" aria-label={`Set ${p?.name} as batter`} title="Now batting"
                      onClick={() => dispatch({ type: "setBatter", index: slot })}
                      className={cx("size-7 rounded-md text-xs", up ? "bg-clay font-bold text-clay-ink" : "text-chalk-dim hover:bg-turf-700")}>
                      {slot + 1}
                    </button>
                  ) : <span className="text-chalk-dim">{slot + 1}</span>}
                </td>
                <td className="max-w-36 py-1.5 font-sans font-semibold">
                  {subSlot === slot ? (
                    <select autoFocus aria-label={`Substitute for ${p?.name}`} defaultValue=""
                      onChange={(e) => { if (e.target.value) dispatch({ type: "substitute", slot, playerId: e.target.value }); setSubSlot(null); }}
                      onBlur={() => setSubSlot(null)}
                      className="w-full rounded-md border border-line bg-turf-950 py-1 text-xs">
                      <option value="">Sub in…</option>
                      {bench.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  ) : (
                    <button type="button" disabled={g.final || !bench.length} onClick={() => setSubSlot(slot)}
                      title={bench.length ? "Tap to substitute" : undefined}
                      className="block max-w-36 truncate text-left disabled:cursor-default disabled:opacity-100">
                      {p?.name}
                    </button>
                  )}
                </td>
                {[l?.ab, l?.r, l?.h, l?.rbi, l?.bb, l?.k, l?.sb].map((v, i) => <td key={i} className="text-center">{v ?? 0}</td>)}
                <td className="text-center text-clay">{l ? rate(l.avg) : ".000"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!g.final && <p className="mt-2 text-[11px] text-chalk-dim">Tap a number to set who's up{bench.length ? " · tap a name to substitute" : ""}.</p>}
    </div>
  );
}

function Messages({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  const myLabel = useLiveGameStore((s) => s.myLabel);
  const setMyLabel = useLiveGameStore((s) => s.setMyLabel);
  const [draft, setDraft] = useState("");
  const send = () => {
    dispatch({ type: "message", from: myLabel.trim() || "Coach", text: draft });
    setDraft("");
  };
  return (
    <div>
      <ul className="mb-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
        {g.messages.length === 0 && <Empty>No messages. Send signs, subs, or reminders to the other coaches.</Empty>}
        {[...g.messages].reverse().map((m) => (
          <li key={m.id} className="rounded-lg bg-turf-950 px-2.5 py-1.5 text-[13px]">
            <span className="font-semibold text-clay">{m.from}</span> <span className="text-chalk-dim">{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            <div>{m.text}</div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <TextInput className="w-24 shrink-0" value={myLabel} onChange={setMyLabel} ariaLabel="Your name" />
        <TextInput value={draft} onChange={setDraft} onEnter={send} placeholder="Message the dugout" />
        <Button onClick={send} disabled={!draft.trim()}><Send size={14} /></Button>
      </div>
    </div>
  );
}

function SyncBadge({ status, code }: { status: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const I = status === "syncing" ? Loader2 : status === "synced" ? Cloud : CloudOff;
  return (
    <div className="flex items-center gap-2">
      <button type="button" title="Copy game code" onClick={() => { void navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-sm tracking-[0.2em]">
        {code} <Copy size={12} className="text-chalk-dim" />
      </button>
      {copied && <span className="text-[11px] text-grass">Copied</span>}
      <I size={15} className={cx(status === "syncing" && "animate-spin", status === "synced" ? "text-grass" : status === "syncing" ? "text-chalk-dim" : "text-clay")} aria-label={`Sync ${status}`} />
    </div>
  );
}

/* ----------------------------------- tab ----------------------------------- */

export function LiveGameTab() {
  const { game: g, canUndo, status, message, dispatch, undo, start, leave } = useLiveGame();
  const archiveGame = useNotepad((s) => s.archiveGame);
  const finished = useNotepad((s) => s.finishedGames);
  const [view, setView] = useState<"box" | "chat" | "log">("box");

  if (!g) return <StartGame onStart={start} />;

  const batting = weAreBatting(g);
  const t = totals(g);
  const saved = finished.some((f) => f.id === g.code && f.plateAppearances.length === g.plateAppearances.length && f.runsThem === t.them && f.runsUs === t.us);
  const save = () => {
    archiveGame({
      id: g.code,
      date: new Date().toISOString(),
      teamName: g.teamName,
      opponentName: g.opponentName,
      runsUs: t.us,
      runsThem: t.them,
      plateAppearances: g.plateAppearances,
      runsScored: g.runsScored,
      stolenBases: g.stolenBases,
      pitchCounts: g.pitchCounts,
    }, g.startedDay ?? toDay(new Date()));
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-line bg-turf-800 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SyncBadge status={status} code={g.code} />
          <div className="flex gap-1.5">
            <Button variant="ghost" className="min-h-9" onClick={undo} disabled={!canUndo}><Undo2 size={14} /> Undo</Button>
            <Button variant="ghost" className="min-h-9" title="Leave game" onClick={() => confirm("Leave this game on this device? Others can keep scoring.") && leave()}><LogOut size={14} /></Button>
          </div>
        </div>
        {message && <p className="mb-2 text-[12px] text-clay">{message}</p>}
        <LineScore g={g} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="font-display text-xl uppercase">
            {g.final ? "Final" : `${g.half === "top" ? "▲ Top" : "▼ Bot"} ${g.inning}`}
            <span className="ml-2 font-sans text-xs font-semibold normal-case text-chalk-dim">{batting ? `${g.teamName} batting` : `${g.opponentName} batting`}</span>
          </div>
          <div className="flex gap-3">
            <Dots n={g.balls} of={4} color="border-grass bg-grass" label="B" />
            <Dots n={g.strikes} of={3} color="border-clay bg-clay" label="S" />
            <Dots n={g.outs} of={3} color="border-stitch bg-stitch" label="O" />
          </div>
        </div>
      </section>

      {!g.final && isGameOver(g) && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-grass bg-grass/15 px-4 py-3">
          <span className="text-[13.5px] font-semibold">
            Game decided: {t.us > t.them ? `${g.teamName} win` : `${g.opponentName} win`} {Math.max(t.us, t.them)}–{Math.min(t.us, t.them)}.
          </span>
          <Button className="min-h-9" onClick={() => dispatch({ type: "final", value: true })}><Flag size={14} /> Mark final</Button>
        </div>
      )}

      {!g.final && (
        <section className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-line bg-turf-800 p-4">
            <Bases g={g} dispatch={dispatch} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="danger" onClick={() => dispatch({ type: "out" })}>+ Out</Button>
              <Button variant="ghost" onClick={() => confirm("End this half-inning now?") && dispatch({ type: "endHalf" })}>End half</Button>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-turf-800 p-4">
            {batting ? <OffenseControls g={g} dispatch={dispatch} /> : <DefenseControls g={g} dispatch={dispatch} />}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-turf-800 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Segmented ariaLabel="Game detail" value={view} onChange={setView} options={[{ value: "box", label: "Box" }, { value: "chat", label: `Dugout${g.messages.length ? ` (${g.messages.length})` : ""}` }, { value: "log", label: "Plays" }]} />
          {g.final ? (
            <div className="flex gap-1.5">
              <Button variant="ghost" className="min-h-9" onClick={() => dispatch({ type: "final", value: false })}>Reopen</Button>
              <Button className="min-h-9" onClick={save} disabled={saved}><Save size={14} /> {saved ? "Saved" : finished.some((f) => f.id === g.code) ? "Update season" : "Save to season"}</Button>
            </div>
          ) : (
            <Button variant="ghost" className="min-h-9" onClick={() => confirm("Mark the game final?") && dispatch({ type: "final", value: true })}><Flag size={14} /> Final</Button>
          )}
        </div>
        {view === "box" && <BoxScore g={g} dispatch={dispatch} />}
        {view === "chat" && <Messages g={g} dispatch={dispatch} />}
        {view === "log" && (
          <ul className="max-h-72 overflow-y-auto text-[12.5px]">
            {g.events.length === 0 && <Empty>No plays yet.</Empty>}
            {g.events.map((e) => <li key={e.id} className="border-t border-line py-1.5 first:border-0">{e.text}</li>)}
          </ul>
        )}
        {g.final && !saved && <p className="mt-3 text-[12px] text-chalk-dim">Saving adds this game to season stats and logs every pitcher's count for rest-day tracking.</p>}
      </section>

      {g.players.length > 0 && batting === false && g.pitcherId == null && (
        <SubHeading>Pick your pitcher to start counting pitches</SubHeading>
      )}
    </div>
  );
}
