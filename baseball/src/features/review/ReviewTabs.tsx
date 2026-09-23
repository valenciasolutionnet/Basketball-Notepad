import { useMemo } from "react";
import { Award, NotebookPen, Trophy, Trash2 } from "lucide-react";
import { useNotepad } from "../../store";
import { battingByPlayer, rate } from "../../lib/stats";
import type { PlateAppearance, ReviewRatings } from "../../lib/types";
import { Button, Empty, IconBtn, Panel, Rating, SubHeading, TextArea, cx } from "../../components/ui";

const RATING_META: { key: keyof ReviewRatings; label: string; description: string; group: "coach" | "team" }[] = [
  { key: "prep", label: "Preparation", description: "Plan ready, stations set, gear on the field before players arrived", group: "coach" },
  { key: "energy", label: "Energy", description: "Pace and enthusiasm you brought", group: "coach" },
  { key: "communication", label: "Communication", description: "Clear, short instructions; every player knew the why", group: "coach" },
  { key: "fun", label: "Fun", description: "Players enjoyed being at the field", group: "team" },
  { key: "learning", label: "Learning", description: "Players got better at the targets you set", group: "team" },
  { key: "effort", label: "Effort", description: "Hustle between drills, on and off the field", group: "team" },
];

export function ReflectTab() {
  const ratings = useNotepad((s) => s.ratings);
  const notes = useNotepad((s) => s.notes);
  const set = useNotepad((s) => s.set);
  const saveSession = useNotepad((s) => s.saveSession);
  const rate_ = (k: keyof ReviewRatings) => (n: number) => set("ratings", (r) => ({ ...r, [k]: n }));
  const note = (k: keyof typeof notes) => (v: string) => set("notes", (n) => ({ ...n, [k]: v }));
  return (
    <div className="flex flex-col gap-4">
      <Panel icon={Award} title="Rate the Practice" subtitle="Honest 1–5 scores build your trend line">
        <div className="grid gap-x-6 md:grid-cols-2">
          <div>
            <SubHeading>My coaching</SubHeading>
            {RATING_META.filter((m) => m.group === "coach").map((m) => <Rating key={m.key} label={m.label} description={m.description} value={ratings[m.key]} onChange={rate_(m.key)} />)}
          </div>
          <div>
            <SubHeading>Team experience</SubHeading>
            {RATING_META.filter((m) => m.group === "team").map((m) => <Rating key={m.key} label={m.label} description={m.description} value={ratings[m.key]} onChange={rate_(m.key)} />)}
          </div>
        </div>
      </Panel>
      <Panel icon={NotebookPen} title="Notes" subtitle="Capture it before you leave the parking lot">
        <TextArea label="What worked" value={notes.worked} onChange={note("worked")} placeholder="Drills, cues, or groupings that clicked" />
        <TextArea label="Player highlights" value={notes.positives} onChange={note("positives")} placeholder="Who stood out, and why — tell them next practice" />
        <TextArea label="Next practice" value={notes.next} onChange={note("next")} placeholder="What to fix or build on" />
        <TextArea label="Gratitude" value={notes.gratitude} onChange={note("gratitude")} placeholder="Parents, umpires, assistants to thank" />
        <Button className="w-full" onClick={() => confirm("Save this practice to Trends and clear today's targets, ratings, and notes?") && saveSession()}>
          Save practice to trends
        </Button>
      </Panel>
    </div>
  );
}

export function SeasonTab() {
  const games = useNotepad((s) => s.finishedGames);
  const players = useNotepad((s) => s.players);
  const set = useNotepad((s) => s.set);
  const names = new Map(players.map((p) => [p.id, p.name]));

  const { lines, pitching, record } = useMemo(() => {
    const pas: PlateAppearance[] = [];
    const runs: Record<string, number> = {};
    const sb: Record<string, number> = {};
    const pitches: Record<string, number> = {};
    let w = 0, l = 0, t = 0;
    for (const g of games) {
      pas.push(...g.plateAppearances);
      for (const [id, n] of Object.entries(g.runsScored)) runs[id] = (runs[id] ?? 0) + n;
      for (const [id, n] of Object.entries(g.stolenBases)) sb[id] = (sb[id] ?? 0) + n;
      for (const [id, n] of Object.entries(g.pitchCounts)) pitches[id] = (pitches[id] ?? 0) + n;
      if (g.runsUs > g.runsThem) w++;
      else if (g.runsUs < g.runsThem) l++;
      else t++;
    }
    const lines = [...battingByPlayer(pas, runs, sb).entries()].sort((a, b) => b[1].obp - a[1].obp || b[1].pa - a[1].pa);
    return { lines, pitching: Object.entries(pitches).sort((a, b) => b[1] - a[1]), record: { w, l, t } };
  }, [games]);

  return (
    <div className="flex flex-col gap-4">
      <Panel icon={Trophy} title="Season" subtitle={games.length ? `${record.w}-${record.l}${record.t ? `-${record.t}` : ""} in ${games.length} saved game${games.length === 1 ? "" : "s"}` : "Save games from Live Game to build season stats"}>
        {games.length === 0 && <Empty>No saved games yet.</Empty>}
        <ul className="flex flex-col gap-1.5">
          {[...games].reverse().map((g) => {
            const res = g.runsUs > g.runsThem ? "W" : g.runsUs < g.runsThem ? "L" : "T";
            return (
              <li key={g.id} className="flex items-center gap-3 rounded-lg border border-line bg-turf-950 px-3 py-2 text-[13.5px]">
                <span className={cx("w-5 font-display text-lg", res === "W" ? "text-grass" : res === "L" ? "text-stitch" : "text-chalk-dim")}>{res}</span>
                <span className="flex-1 truncate">vs {g.opponentName}</span>
                <span className="font-mono">{g.runsUs}–{g.runsThem}</span>
                <span className="w-16 text-right text-[11px] text-chalk-dim">{new Date(g.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <IconBtn danger label="Delete game" onClick={() => {
                  if (!confirm(`Delete the game vs ${g.opponentName}? Its pitch counts stay in arm-care history.`)) return;
                  set("finishedGames", (gs) => gs.filter((x) => x.id !== g.id));
                }}><Trash2 size={13} /></IconBtn>
              </li>
            );
          })}
        </ul>

        {lines.length > 0 && (
          <>
            <SubHeading>Batting</SubHeading>
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[560px] text-[12.5px]">
                <thead className="text-[11px] text-chalk-dim">
                  <tr>{["Player", "PA", "AB", "H", "2B", "3B", "HR", "RBI", "R", "BB", "K", "SB", "AVG", "OBP", "SLG", "OPS"].map((h) => (
                    <th key={h} className={cx("py-1 font-semibold", h === "Player" ? "text-left" : "text-center")}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="font-mono">
                  {lines.map(([id, l]) => (
                    <tr key={id} className="border-t border-line">
                      <td className="max-w-32 truncate py-1.5 font-sans font-semibold">{names.get(id) ?? "Former player"}</td>
                      {[l.pa, l.ab, l.h, l.doubles, l.triples, l.hr, l.rbi, l.r, l.bb, l.k, l.sb].map((v, i) => <td key={i} className="text-center">{v}</td>)}
                      {[l.avg, l.obp, l.slg, l.ops].map((v, i) => <td key={i} className="text-center text-clay">{rate(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pitching.length > 0 && (
          <>
            <SubHeading>Pitches thrown in saved games</SubHeading>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {pitching.map(([id, n]) => (
                <li key={id} className="flex justify-between rounded-lg border border-line bg-turf-950 px-3 py-1.5 text-[13px]">
                  <span>{names.get(id) ?? "Former player"}</span><span className="font-mono text-clay">{n}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
