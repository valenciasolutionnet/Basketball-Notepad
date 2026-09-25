import { Printer, X } from "lucide-react";
import { pct } from "../../lib/stats";
import type { FinishedGame, Id } from "../../lib/types";
import { Button } from "../../components/ui";

interface ShotLineRow {
  id: Id;
  games: number;
  all: { shots: number; points: number; pct: number };
  draws: { shots: number; points: number; pct: number };
  hits: { shots: number; points: number; pct: number };
}

// A dedicated, print-only layout: coaches use the browser's "Save as PDF"
// from the print dialog. It replaces the Season tab's normal content while
// open (see SeasonTab) — the app header/nav/footer stay hidden at print
// time via the existing .no-print rule, so only this report is printed.
export function SeasonPrintReport({
  teamName, games, lines, record, team, names, onClose,
}: {
  teamName: string;
  games: FinishedGame[];
  lines: ShotLineRow[];
  record: { w: number; l: number; t: number };
  team: { shots: number; points: number; pct: number };
  names: Map<Id, string>;
  onClose: () => void;
}) {
  return (
    <div className="bg-white p-4 text-black">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-chalk-dim">Print preview — use your browser's print dialog to save as PDF.</p>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}><Printer size={14} /> Print</Button>
          <Button variant="ghost" onClick={onClose}><X size={14} /> Back</Button>
        </div>
      </div>

      <h1 className="text-2xl font-bold">{teamName || "Season Report"}</h1>
      <p className="mb-4 text-sm">
        Record: {record.w}-{record.l}{record.t ? `-${record.t}` : ""} · {games.length} game{games.length === 1 ? "" : "s"} · Team shot % {pct(team.pct)} · Generated {new Date().toLocaleDateString()}
      </p>

      <h2 className="mb-1 mt-4 text-lg font-bold">Game log</h2>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-black/30 text-left">
            <th className="py-1 pr-2">Date</th><th className="py-1 pr-2">Opponent</th><th className="py-1 pr-2">Result</th><th className="py-1">Score</th>
          </tr>
        </thead>
        <tbody>
          {[...games].reverse().map((g) => {
            const res = g.scoreUs > g.scoreThem ? "W" : g.scoreUs < g.scoreThem ? "L" : "T";
            return (
              <tr key={g.id} className="border-b border-black/10">
                <td className="py-1 pr-2">{new Date(g.date).toLocaleDateString()}</td>
                <td className="py-1 pr-2">{g.opponentName}</td>
                <td className="py-1 pr-2">{res}</td>
                <td className="py-1">{g.scoreUs}–{g.scoreThem}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mb-1 mt-5 text-lg font-bold">Shooting percentage</h2>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-black/30 text-left">
            {["Player", "GP", "Shots", "Pts", "Draw %", "Hit %", "Shot %"].map((h) => <th key={h} className="py-1 pr-2">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-black/10">
              <td className="py-1 pr-2">{names.get(l.id) ?? "Former player"}</td>
              <td className="py-1 pr-2">{l.games}</td>
              <td className="py-1 pr-2">{l.all.shots}</td>
              <td className="py-1 pr-2">{l.all.points}</td>
              <td className="py-1 pr-2">{l.draws.shots ? pct(l.draws.pct) : "—"}</td>
              <td className="py-1 pr-2">{l.hits.shots ? pct(l.hits.pct) : "—"}</td>
              <td className="py-1 pr-2 font-bold">{pct(l.all.pct)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-black/30">
            <td className="py-1 pr-2 font-bold">Team</td>
            <td className="py-1 pr-2">{games.length}</td>
            <td className="py-1 pr-2">{team.shots}</td>
            <td className="py-1 pr-2">{team.points}</td>
            <td /><td />
            <td className="py-1 pr-2 font-bold">{pct(team.pct)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
