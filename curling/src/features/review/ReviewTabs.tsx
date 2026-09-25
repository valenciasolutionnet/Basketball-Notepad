import { useMemo, useState } from "react";
import { Award, Download, NotebookPen, Printer, Trophy, Trash2 } from "lucide-react";
import { useNotepad } from "../../store";
import { isHit, pct, shotPct } from "../../lib/stats";
import { buildCsv, downloadCsv } from "../../lib/csv";
import type { ReviewRatings, Shot } from "../../lib/types";
import { Button, Empty, IconBtn, Panel, Rating, SubHeading, TextArea, cx } from "../../components/ui";
import { SeasonPrintReport } from "./SeasonPrintReport";

const RATING_META: { key: keyof ReviewRatings; label: string; description: string; group: "coach" | "team" }[] = [
  { key: "prep", label: "Preparation", description: "Plan ready, sheets assigned, stones and stopwatches out before players arrived", group: "coach" },
  { key: "energy", label: "Energy", description: "Pace and enthusiasm you brought", group: "coach" },
  { key: "communication", label: "Communication", description: "Clear, short instructions; every player knew the why", group: "coach" },
  { key: "fun", label: "Fun", description: "Players enjoyed being on the ice", group: "team" },
  { key: "learning", label: "Learning", description: "Players got better at the targets you set", group: "team" },
  { key: "effort", label: "Effort", description: "Hustle between drills and hard sweeping on every stone", group: "team" },
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
        <TextArea label="Gratitude" value={notes.gratitude} onChange={note("gratitude")} placeholder="Parents, ice technicians, assistants to thank" />
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
  const teamName = useNotepad((s) => s.teamName);
  const set = useNotepad((s) => s.set);
  const [showReport, setShowReport] = useState(false);
  const names = new Map(players.map((p) => [p.id, p.name]));

  const { lines, record, team } = useMemo(() => {
    const byPlayer = new Map<string, { games: Set<string>; shots: Shot[] }>();
    const all: Shot[] = [];
    let w = 0, l = 0, t = 0;
    for (const g of games) {
      for (const s of g.shots) {
        all.push(s);
        if (!s.playerId) continue;
        const row = byPlayer.get(s.playerId) ?? { games: new Set<string>(), shots: [] };
        row.games.add(g.id);
        row.shots.push(s);
        byPlayer.set(s.playerId, row);
      }
      if (g.scoreUs > g.scoreThem) w++;
      else if (g.scoreUs < g.scoreThem) l++;
      else t++;
    }
    const lines = [...byPlayer.entries()]
      .map(([id, r]) => ({
        id,
        games: r.games.size,
        all: shotPct(r.shots),
        draws: shotPct(r.shots.filter((s) => !isHit(s.type))),
        hits: shotPct(r.shots.filter((s) => isHit(s.type))),
      }))
      .sort((a, b) => b.all.pct - a.all.pct || b.all.shots - a.all.shots);
    return { lines, record: { w, l, t }, team: shotPct(all) };
  }, [games]);

  const exportCsv = () => {
    const rows: unknown[][] = [["Games"], ["Date", "Opponent", "Result", "Score"]];
    for (const g of [...games].reverse()) {
      const res = g.scoreUs > g.scoreThem ? "W" : g.scoreUs < g.scoreThem ? "L" : "T";
      rows.push([new Date(g.date).toLocaleDateString(), g.opponentName, res, `${g.scoreUs}-${g.scoreThem}`]);
    }
    rows.push([]);
    rows.push(["Shooting percentage"]);
    rows.push(["Player", "GP", "Shots", "Points", "Draw %", "Hit %", "Shot %"]);
    for (const l of lines) {
      rows.push([names.get(l.id) ?? "Former player", l.games, l.all.shots, l.all.points, l.draws.shots ? pct(l.draws.pct) : "", l.hits.shots ? pct(l.hits.pct) : "", pct(l.all.pct)]);
    }
    rows.push(["Team", games.length, team.shots, team.points, "", "", pct(team.pct)]);
    downloadCsv(`${(teamName || "curling-notepad").replace(/[^a-z0-9]+/gi, "-")}-season-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(rows));
  };

  if (showReport) {
    return (
      <SeasonPrintReport
        teamName={teamName} games={games} lines={lines} record={record} team={team} names={names}
        onClose={() => setShowReport(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel
        icon={Trophy} title="Season"
        subtitle={games.length ? `${record.w}-${record.l}${record.t ? `-${record.t}` : ""} in ${games.length} saved game${games.length === 1 ? "" : "s"}` : "Save games from Live Game to build season stats"}
        action={
          <div className="flex gap-1.5">
            <Button variant="ghost" disabled={games.length === 0} onClick={exportCsv}><Download size={14} /> Export CSV</Button>
            <Button variant="ghost" disabled={games.length === 0} onClick={() => setShowReport(true)}><Printer size={14} /> Print Season Report</Button>
          </div>
        }
      >
        {games.length === 0 && <Empty>No saved games yet.</Empty>}
        <ul className="flex flex-col gap-1.5">
          {[...games].reverse().map((g) => {
            const res = g.scoreUs > g.scoreThem ? "W" : g.scoreUs < g.scoreThem ? "L" : "T";
            return (
              <li key={g.id} className="flex items-center gap-3 rounded-lg border border-line bg-turf-950 px-3 py-2 text-[13.5px]">
                <span className={cx("w-5 font-display text-lg", res === "W" ? "text-grass" : res === "L" ? "text-stitch" : "text-chalk-dim")}>{res}</span>
                <span className="flex-1 truncate">vs {g.opponentName}</span>
                <span className="font-mono">{g.scoreUs}–{g.scoreThem}</span>
                <span className="hidden w-12 text-right font-mono text-[12px] text-clay sm:inline" title="Team shot %">{g.shots.length ? pct(shotPct(g.shots).pct) : ""}</span>
                <span className="w-16 text-right text-[11px] text-chalk-dim">{new Date(g.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <IconBtn danger label="Delete game" onClick={() => {
                  if (!confirm(`Delete the game vs ${g.opponentName}?`)) return;
                  set("finishedGames", (gs) => gs.filter((x) => x.id !== g.id));
                }}><Trash2 size={13} /></IconBtn>
              </li>
            );
          })}
        </ul>

        {lines.length > 0 && (
          <>
            <SubHeading>Shooting percentage</SubHeading>
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[420px] text-[12.5px]">
                <thead className="text-[11px] text-chalk-dim">
                  <tr>{["Player", "GP", "Shots", "Pts", "Draw %", "Hit %", "Shot %"].map((h) => (
                    <th key={h} className={cx("py-1 font-semibold", h === "Player" ? "text-left" : "text-center")}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="font-mono">
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t border-line">
                      <td className="max-w-32 truncate py-1.5 font-sans font-semibold">{names.get(l.id) ?? "Former player"}</td>
                      {[l.games, l.all.shots, l.all.points].map((v, i) => <td key={i} className="text-center">{v}</td>)}
                      <td className="text-center">{l.draws.shots ? pct(l.draws.pct) : "—"}</td>
                      <td className="text-center">{l.hits.shots ? pct(l.hits.pct) : "—"}</td>
                      <td className="text-center font-bold text-clay">{pct(l.all.pct)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-line">
                    <td className="py-1.5 font-sans font-bold">Team</td>
                    <td className="text-center">{games.length}</td>
                    <td className="text-center">{team.shots}</td>
                    <td className="text-center">{team.points}</td>
                    <td /><td />
                    <td className="text-center font-bold text-clay">{pct(team.pct)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11.5px] text-chalk-dim">Shot % = rating points ÷ (4 × shots). Hits are takeouts, hit-and-rolls, and peels; everything else counts as a draw.</p>
          </>
        )}
      </Panel>
    </div>
  );
}
