import { Printer, X } from "lucide-react";
import type { BattingLine } from "../../lib/stats";
import { rate } from "../../lib/stats";
import type { FinishedGame, Id } from "../../lib/types";
import { Button } from "../../components/ui";

// A dedicated, print-only layout: coaches use the browser's "Save as PDF"
// from the print dialog. It replaces the Season tab's normal content while
// open (see SeasonTab) — the app header/nav/footer stay hidden at print
// time via the existing .no-print rule, so only this report is printed.
export function SeasonPrintReport({
  teamName, games, lines, pitching, record, names, onClose,
}: {
  teamName: string;
  games: FinishedGame[];
  lines: [Id, BattingLine][];
  pitching: [Id, number][];
  record: { w: number; l: number; t: number };
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
        Record: {record.w}-{record.l}{record.t ? `-${record.t}` : ""} · {games.length} game{games.length === 1 ? "" : "s"} · Generated {new Date().toLocaleDateString()}
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
            const res = g.runsUs > g.runsThem ? "W" : g.runsUs < g.runsThem ? "L" : "T";
            return (
              <tr key={g.id} className="border-b border-black/10">
                <td className="py-1 pr-2">{new Date(g.date).toLocaleDateString()}</td>
                <td className="py-1 pr-2">{g.opponentName}</td>
                <td className="py-1 pr-2">{res}</td>
                <td className="py-1">{g.runsUs}–{g.runsThem}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mb-1 mt-5 text-lg font-bold">Batting</h2>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-black/30 text-left">
            {["Player", "PA", "AB", "H", "2B", "3B", "HR", "RBI", "R", "BB", "K", "SB", "AVG", "OBP", "SLG", "OPS"].map((h) => (
              <th key={h} className="py-1 pr-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map(([id, l]) => (
            <tr key={id} className="border-b border-black/10">
              <td className="py-1 pr-2">{names.get(id) ?? "Former player"}</td>
              {[l.pa, l.ab, l.h, l.doubles, l.triples, l.hr, l.rbi, l.r, l.bb, l.k, l.sb].map((v, i) => <td key={i} className="py-1 pr-2">{v}</td>)}
              {[l.avg, l.obp, l.slg, l.ops].map((v, i) => <td key={i} className="py-1 pr-2">{rate(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      {pitching.length > 0 && (
        <>
          <h2 className="mb-1 mt-5 text-lg font-bold">Pitches thrown</h2>
          <table className="w-full max-w-xs border-collapse text-[11px]">
            <tbody>
              {pitching.map(([id, n]) => (
                <tr key={id} className="border-b border-black/10">
                  <td className="py-1 pr-2">{names.get(id) ?? "Former player"}</td>
                  <td className="py-1">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
