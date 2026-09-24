import { useMemo, useState } from "react";
import { Radio, LogOut, Undo2, Flag, Save, Hammer, X } from "lucide-react";
import { useNotepad } from "../../store";
import { useLiveGame } from "./useLiveGame";
import {
  createGame, currentEnd, hammer, hammerByEnd, isExtraEnd, isGameOver, MAX_END_POINTS, SHOT_LABELS, STONES_PER_END, throwerFor, totals, type GameAction,
} from "../../lib/game";
import { positionForStone, throwersFor } from "../../lib/lineup";
import { pct, shotPct, shotsByPlayer } from "../../lib/stats";
import { uid } from "../../lib/id";
import { SHOT_TYPES, type LiveGame, type ShotType, type Side } from "../../lib/types";
import { Button, Empty, Panel, Segmented, SubHeading, TextInput, cx, inputCls } from "../../components/ui";

/* ---------------------------------- setup --------------------------------- */

function StartGame({ onStart }: { onStart: (g: LiveGame) => void }) {
  const players = useNotepad((s) => s.players);
  const lineups = useNotepad((s) => s.lineups);
  const activeLineupId = useNotepad((s) => s.activeLineupId);
  const teamName = useNotepad((s) => s.teamName);
  const setField = useNotepad((s) => s.set);
  const [opp, setOpp] = useState("");
  const [firstHammer, setFirstHammer] = useState<Side>("us");
  const [ends, setEnds] = useState<"6" | "8" | "10">("8");
  const [lineupId, setLineupId] = useState(lineups.find((l) => l.id === activeLineupId)?.id ?? lineups[0]?.id ?? "");

  const lineup = lineups.find((l) => l.id === lineupId);
  const throwers = throwersFor(lineup);
  const name = (id: string | null) => players.find((p) => p.id === id)?.name;

  const start = () => {
    onStart(createGame({
      id: uid(),
      teamName: teamName.trim() || "Us",
      opponentName: opp.trim() || "Opponent",
      scheduledEnds: Number(ends),
      firstHammer,
      players: players.map((p) => ({ id: p.id, name: p.name })),
      throwers,
    }));
  };

  return (
    <Panel icon={Radio} title="Start a Game" subtitle="Score end by end and rate every one of your stones">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextInput value={teamName} onChange={(v) => setField("teamName", v)} placeholder="Your team name" />
        <TextInput value={opp} onChange={setOpp} placeholder="Opponent" />
        <label className="flex flex-col gap-1 text-xs text-chalk-dim sm:col-span-2">Lineup
          <select value={lineupId} onChange={(e) => setLineupId(e.target.value)} className={inputCls}>
            <option value="">No lineup (track shots without names)</option>
            {lineups.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs text-chalk-dim">
          Hammer in end 1
          <Segmented<Side> ariaLabel="Hammer in the first end" value={firstHammer} onChange={setFirstHammer} options={[{ value: "us", label: "Us" }, { value: "them", label: "Them" }]} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-chalk-dim">
          Ends
          <Segmented ariaLabel="Scheduled ends" value={ends} onChange={setEnds} options={[{ value: "6", label: "6" }, { value: "8", label: "8" }, { value: "10", label: "10" }]} />
        </div>
      </div>
      {lineup && (
        <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[12.5px] sm:grid-cols-4">
          {[1, 3, 5, 7].map((stone) => (
            <li key={stone} className="rounded-lg border border-line bg-turf-950 px-2.5 py-1.5">
              <span className="font-mono text-clay">{stone}–{stone + 1}</span> <span className="text-chalk-dim">{positionForStone(stone)}</span>
              <div className="truncate font-semibold">{name(throwers[stone - 1] ?? null) ?? "Open"}</div>
            </li>
          ))}
        </ul>
      )}
      <Button className="mt-3 w-full" onClick={start}>Start game</Button>
      {!players.length && <Empty>Add your roster in Plan → Roster and build a Lineup to rate shots by player.</Empty>}
    </Panel>
  );
}

/* -------------------------------- scoreboard ------------------------------- */

function Scoreboard({ g }: { g: LiveGame }) {
  const over = isGameOver(g);
  const cols = Math.max(g.scheduledEnds, g.ends.length + (over ? 0 : 1));
  const t = totals(g);
  const hammers = hammerByEnd(g);
  const now = hammer(g);
  const rows: { side: Side; name: string; total: number }[] = [
    { side: "us", name: g.teamName, total: t.us },
    { side: "them", name: g.opponentName, total: t.them },
  ];
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[320px] font-mono text-[13px]">
        <thead>
          <tr className="text-chalk-dim">
            <th className="text-left font-sans text-[11px] font-semibold" />
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} className={cx("w-6 text-center", i === g.ends.length && !g.final && !over && "text-clay", i >= g.scheduledEnds && "italic")}>{i + 1}</th>
            ))}
            <th className="w-9 text-center text-chalk">T</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.side} className="border-t border-line">
              <td className="max-w-32 truncate py-1.5 pr-2 font-sans font-semibold">
                {r.name}
                {!g.final && !over && now === r.side && <Hammer size={13} className="ml-1.5 inline text-clay" aria-label="Has the hammer" />}
              </td>
              {Array.from({ length: cols }, (_, i) => {
                const e = g.ends[i];
                const hadHammer = hammers[i] === r.side;
                return (
                  <td key={i} className={cx("text-center", hadHammer && "underline decoration-clay/60 underline-offset-4")}>
                    {e ? (e.scorer === r.side ? e.points : e.scorer ? 0 : "·") : ""}
                  </td>
                );
              })}
              <td className="text-center font-display text-xl text-clay">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-chalk-dim">Underlined score = that team had the hammer · a dot marks a blank end</p>
    </div>
  );
}

/* --------------------------------- controls -------------------------------- */

function EndControls({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {(["us", "them"] as const).map((side) => (
        <div key={side}>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-grass">{side === "us" ? g.teamName : g.opponentName} score</div>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: MAX_END_POINTS }, (_, i) => (
              <button key={i} type="button" aria-label={`${side === "us" ? g.teamName : g.opponentName} score ${i + 1}`} onClick={() => dispatch({ type: "scoreEnd", scorer: side, points: i + 1 })}
                className={cx("min-h-11 rounded-lg border bg-turf-950 font-mono text-sm font-bold active:scale-95", side === "us" ? "border-grass text-grass" : "border-stitch/70 text-stitch")}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button variant="ghost" onClick={() => dispatch({ type: "blankEnd" })}>
        Blank end (hammer stays)
      </Button>
    </div>
  );
}

function ShotPad({ g, dispatch }: { g: LiveGame; dispatch: (a: GameAction) => void }) {
  const end = currentEnd(g);
  const shots = g.shots.filter((s) => s.end === end);
  const [types, setTypes] = useState<Record<number, ShotType>>({});
  const typeFor = (stone: number): ShotType => shots.find((s) => s.stone === stone)?.type ?? types[stone] ?? "draw";

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-grass">Our stones · end {end}</h3>
        <span className="font-mono text-xs text-chalk-dim">{shots.length}/{STONES_PER_END} rated</span>
      </div>
      <ol className="flex flex-col gap-1.5">
        {Array.from({ length: STONES_PER_END }, (_, i) => {
          const stone = i + 1;
          const shot = shots.find((s) => s.stone === stone);
          const thrower = throwerFor(g, stone);
          return (
            <li key={stone} className={cx("rounded-lg border bg-turf-950 px-2 py-1.5", shot ? "border-line" : "border-dashed border-line")}>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center font-display text-lg text-clay">{stone}</span>
                <select aria-label={`Stone ${stone} thrower`} value={thrower ?? ""} title={`${positionForStone(stone)} — changes both ${positionForStone(stone).toLowerCase()} stones`}
                  onChange={(e) => dispatch({ type: "substitute", stone, playerId: e.target.value || null })}
                  className="min-h-8 min-w-0 flex-1 truncate rounded-md border border-line bg-turf-900 px-1.5 text-[13px] font-semibold">
                  <option value="">{positionForStone(stone)}</option>
                  {g.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select aria-label={`Stone ${stone} shot`} value={typeFor(stone)}
                  onChange={(e) => {
                    const t = e.target.value as ShotType;
                    setTypes((x) => ({ ...x, [stone]: t }));
                    if (shot) dispatch({ type: "shotType", stone, shotType: t });
                  }}
                  className="min-h-8 w-28 rounded-md border border-line bg-turf-900 px-1.5 text-[13px]">
                  {SHOT_TYPES.map((t) => <option key={t} value={t}>{SHOT_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((r) => (
                  <button key={r} type="button" aria-label={`Stone ${stone} rating ${r}`} aria-pressed={shot?.rating === r}
                    onClick={() => dispatch({ type: "shot", stone, shotType: typeFor(stone), rating: r })}
                    className={cx("min-h-9 flex-1 rounded-md border font-mono text-sm font-bold active:scale-95",
                      shot?.rating === r ? "border-clay bg-clay text-clay-ink" : "border-line text-chalk-dim")}>
                    {r}
                  </button>
                ))}
                <button type="button" aria-label={`Clear stone ${stone}`} disabled={!shot} onClick={() => dispatch({ type: "clearShot", stone })}
                  className="flex size-9 items-center justify-center rounded-md border border-line text-chalk-dim"><X size={13} /></button>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11px] text-chalk-dim">4 = made it · 3 = mostly · 2 = half · 1 = some value · 0 = missed.</p>
    </div>
  );
}

/* ---------------------------------- extras --------------------------------- */

function ShotTable({ g }: { g: LiveGame }) {
  const lines = useMemo(() => shotsByPlayer(g.shots), [g.shots]);
  const team = shotPct(g.shots);
  const order = [...new Set(g.throwers.filter((x): x is string => !!x)), ...[...lines.keys()].filter((id) => !g.throwers.includes(id))];
  if (!g.shots.length) return <Empty>Rate stones to see shot percentages.</Empty>;
  return (
    <table className="w-full text-[13px]">
      <thead className="text-[11px] text-chalk-dim">
        <tr>{["Player", "Shots", "Pts", "%"].map((h) => <th key={h} className={cx("py-1 font-semibold", h === "Player" ? "text-left" : "text-center")}>{h}</th>)}</tr>
      </thead>
      <tbody className="font-mono">
        {order.map((id) => {
          const l = lines.get(id);
          const stone = g.throwers.indexOf(id);
          return (
            <tr key={id} className="border-t border-line">
              <td className="py-1.5 font-sans font-semibold">
                {g.players.find((p) => p.id === id)?.name ?? "Former player"}
                {stone >= 0 && <span className="ml-1.5 text-[11px] font-normal text-chalk-dim">{positionForStone(stone + 1)}</span>}
              </td>
              <td className="text-center">{l?.shots ?? 0}</td>
              <td className="text-center">{l?.points ?? 0}</td>
              <td className="text-center text-clay">{l ? pct(l.pct) : "—"}</td>
            </tr>
          );
        })}
        <tr className="border-t-2 border-line">
          <td className="py-1.5 font-sans font-bold">Team</td>
          <td className="text-center">{team.shots}</td>
          <td className="text-center">{team.points}</td>
          <td className="text-center font-bold text-clay">{pct(team.pct)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/* ----------------------------------- tab ----------------------------------- */

export function LiveGameTab() {
  const { game: g, canUndo, dispatch, undo, start, leave } = useLiveGame();
  const archiveGame = useNotepad((s) => s.archiveGame);
  const finished = useNotepad((s) => s.finishedGames);
  const [view, setView] = useState<"shots" | "log">("shots");

  if (!g) return <StartGame onStart={start} />;

  const t = totals(g);
  const over = isGameOver(g);
  const end = currentEnd(g);
  const saved = finished.some((f) => f.id === g.id && f.ends.length === g.ends.length && f.shots.length === g.shots.length && f.shots.every((s, i) => s.rating === g.shots[i]?.rating));
  const save = () => {
    archiveGame({
      id: g.id,
      date: new Date().toISOString(),
      teamName: g.teamName,
      opponentName: g.opponentName,
      scoreUs: t.us,
      scoreThem: t.them,
      firstHammer: g.firstHammer,
      ends: g.ends,
      shots: g.shots,
    });
  };
  const hammerName = hammer(g) === "us" ? g.teamName : g.opponentName;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-line bg-turf-800 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="font-display text-xl uppercase">
            {g.final ? "Final" : over ? "Game decided" : isExtraEnd(g) ? `Extra end ${end}` : `End ${end} of ${g.scheduledEnds}`}
            {!g.final && !over && (
              <span className="ml-2 font-sans text-xs font-semibold normal-case text-chalk-dim">
                <Hammer size={12} className="mr-1 inline text-clay" />{hammerName}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" className="min-h-9" onClick={undo} disabled={!canUndo}><Undo2 size={14} /> Undo</Button>
            <Button variant="ghost" className="min-h-9" title="Leave game" onClick={() => confirm(saved ? "Close this game?" : "Close this game? Unsaved scoring is lost.") && leave()}><LogOut size={14} /></Button>
          </div>
        </div>
        <Scoreboard g={g} />
      </section>

      {!g.final && over && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-grass bg-grass/15 px-4 py-3">
          <span className="text-[13.5px] font-semibold">
            Game decided: {t.us > t.them ? `${g.teamName} win` : `${g.opponentName} win`} {Math.max(t.us, t.them)}–{Math.min(t.us, t.them)}.
          </span>
          <Button className="min-h-9" onClick={() => dispatch({ type: "final", value: true })}><Flag size={14} /> Mark final</Button>
        </div>
      )}
      {!g.final && !over && isExtraEnd(g) && (
        <div role="status" className="rounded-xl border border-clay bg-clay/10 px-4 py-3 text-[13.5px] font-semibold">
          Tied {t.us}–{t.them} after {g.scheduledEnds} ends — play an extra end. {hammerName} {hammerName === g.teamName ? "have" : "has"} the hammer.
        </div>
      )}

      {!g.final && !over && (
        <section className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-line bg-turf-800 p-4">
            <SubHeading>Score end {end}</SubHeading>
            <EndControls g={g} dispatch={dispatch} />
          </div>
          <div className="rounded-xl border border-line bg-turf-800 p-4">
            <ShotPad key={end} g={g} dispatch={dispatch} />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-turf-800 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Segmented ariaLabel="Game detail" value={view} onChange={setView} options={[{ value: "shots", label: "Shot %" }, { value: "log", label: "Ends" }]} />
          {g.final ? (
            <div className="flex gap-1.5">
              <Button variant="ghost" className="min-h-9" onClick={() => dispatch({ type: "final", value: false })}>Reopen</Button>
              <Button className="min-h-9" onClick={save} disabled={saved}><Save size={14} /> {saved ? "Saved" : finished.some((f) => f.id === g.id) ? "Update season" : "Save to season"}</Button>
            </div>
          ) : (
            <Button variant="ghost" className="min-h-9" onClick={() => confirm("Mark the game final? Use this for a conceded game too.") && dispatch({ type: "final", value: true })}><Flag size={14} /> Final</Button>
          )}
        </div>
        {view === "shots" && <ShotTable g={g} />}
        {view === "log" && (
          <ul className="max-h-72 overflow-y-auto text-[12.5px]">
            {g.events.length === 0 && <Empty>No ends scored yet.</Empty>}
            {g.events.map((e) => <li key={e.id} className="border-t border-line py-1.5 first:border-0">{e.text}</li>)}
          </ul>
        )}
        {g.final && !saved && <p className="mt-3 text-[12px] text-chalk-dim">Saving adds this game to your season record and each player's shot percentage.</p>}
      </section>
    </div>
  );
}
