import { useMemo, useState } from "react";
import { Activity, Trash2 } from "lucide-react";
import { useNotepad } from "../../store";
import { availability, dailyMax, restDays, toDay } from "../../lib/pitching";
import { uid } from "../../lib/id";
import { Button, Empty, IconBtn, Panel, SubHeading, cx, inputCls } from "../../components/ui";

function fmtDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function PitchCountTab() {
  const players = useNotepad((s) => s.players);
  const outings = useNotepad((s) => s.outings);
  const set = useNotepad((s) => s.set);
  const today = toDay(new Date());
  const [playerId, setPlayerId] = useState("");
  const [date, setDate] = useState(today);
  const [pitches, setPitches] = useState("");

  const pitchers = useMemo(() => {
    const listed = players.filter((p) => p.positions.includes("P") || outings.some((o) => o.playerId === p.id));
    return listed.length ? listed : players;
  }, [players, outings]);
  const byId = new Map(players.map((p) => [p.id, p]));
  const selected = byId.get(playerId);
  const n = Number(pitches);

  const log = () => {
    if (!selected || !Number.isFinite(n) || n <= 0) return;
    set("outings", (os) => [...os, { id: uid(), playerId: selected.id, date, pitches: Math.round(n), source: "manual" }]);
    setPitches("");
  };

  return (
    <Panel icon={Activity} title="Pitch Count & Arm Care" subtitle="Who can pitch today, and when everyone is available again">
      {players.length === 0 && <Empty>Add players (with league age) in Roster first.</Empty>}

      {players.length > 0 && (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {pitchers.map((p) => {
              const a = availability(outings, p.id, p.age, today);
              const max = dailyMax(p.age);
              return (
                <li key={p.id} className="rounded-lg border border-line bg-turf-950 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{p.name}</span>
                    <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold", a.eligible ? "bg-grass/20 text-grass" : "bg-stitch/20 text-stitch")}>
                      {a.eligible ? "Available" : a.nextEligible > today ? `Rest until ${fmtDay(a.nextEligible)}` : "Maxed today"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[12px] text-chalk-dim">
                    <span>Age {p.age ?? "—"}</span>
                    <span>Daily max {max ?? "set age"}</span>
                    {a.pitchesToday > 0 && <span>Today {a.pitchesToday}{a.remainingToday != null && ` · ${a.remainingToday} left`}</span>}
                    {a.lastOuting && <span>Last {a.lastOuting.pitches} on {fmtDay(a.lastOuting.date)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>

          <SubHeading>Log an outing or bullpen</SubHeading>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <select aria-label="Pitcher" value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={inputCls}>
              <option value="">Select pitcher…</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input aria-label="Date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            <input aria-label="Pitches" type="number" inputMode="numeric" min={1} placeholder="Pitches" value={pitches} onChange={(e) => setPitches(e.target.value)} className={cx(inputCls, "sm:w-28")} />
            <Button onClick={log} disabled={!selected || !(n > 0)}>Log</Button>
          </div>
          {selected && n > 0 && (
            <p className="mt-2 text-[12.5px] text-chalk-dim">
              {Math.round(n)} pitches → {restDays(n, selected.age)} calendar day(s) of rest
              {dailyMax(selected.age) != null && n > dailyMax(selected.age)! && <span className="text-stitch"> · exceeds daily max of {dailyMax(selected.age)}</span>}
            </p>
          )}

          <SubHeading>History</SubHeading>
          {outings.length === 0 && <Empty>No outings logged. Games you score in Live Game are added automatically.</Empty>}
          <ul className="flex flex-col gap-1">
            {[...outings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40).map((o) => (
              <li key={o.id} className="flex items-center gap-2 rounded-lg border border-line bg-turf-950 px-3 py-1.5 text-[13px]">
                <span className="w-28 text-chalk-dim">{fmtDay(o.date)}</span>
                <span className="flex-1 truncate font-semibold">{byId.get(o.playerId)?.name ?? "Former player"}</span>
                <span className="font-mono text-clay">{o.pitches}</span>
                <span className="w-14 text-right text-[11px] uppercase text-chalk-dim">{o.source}</span>
                <IconBtn danger label="Delete outing" onClick={() => set("outings", (os) => os.filter((x) => x.id !== o.id))}><Trash2 size={13} /></IconBtn>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 text-[11.5px] leading-relaxed text-chalk-dim">
        Limits use Little League Baseball regular-season rules: daily max 50 (ages 7–8), 75 (9–10), 85 (11–12), 95 (13–16), 105 (17–18).
        Rest for ages 14 and under: 1–20 pitches 0 days, 21–35 1, 36–50 2, 51–65 3, 66+ 4. Ages 15–18: 1–30 0, 31–45 1, 46–60 2, 61–75 3, 76+ 4.
        A pitcher at the limit mid at-bat may finish that batter. Confirm against your league's rulebook.
      </p>
    </Panel>
  );
}
