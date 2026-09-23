import { lazy, Suspense, useState } from "react";
import {
  ClipboardList, Zap, Radio, Award, Target, Users, ClipboardCheck, ListOrdered, Activity, Package,
  Dumbbell, Map as MapIcon, Trophy, TrendingUp, NotebookPen, Download, Upload, type LucideIcon,
} from "lucide-react";
import { useNotepad } from "./store";
import { Tabs, cx } from "./components/ui";
import { TargetsTab, AttendanceTab, LogisticsTab } from "./features/plan/basicTabs";
import { RosterTab } from "./features/plan/RosterTab";
import { LineupTab } from "./features/plan/LineupTab";
import { PitchCountTab } from "./features/plan/PitchCountTab";
import { DrillsTab } from "./features/deliver/DrillsTab";
import { PracticePlanTab } from "./features/deliver/PracticePlanTab";
import { DiamondBoardTab } from "./features/deliver/DiamondBoardTab";
import { LiveGameTab } from "./features/game/LiveGameTab";
import { ReflectTab, SeasonTab } from "./features/review/ReviewTabs";

// Recharts is the heaviest dependency; load it only when Trends is opened.
const TrendsTab = lazy(() => import("./features/review/TrendsTab"));

type Icon = LucideIcon;
type Phase = "plan" | "deliver" | "game" | "review";

const PHASES: { key: Phase; label: string; sub: string; icon: Icon }[] = [
  { key: "plan", label: "Plan", sub: "Before practice", icon: ClipboardList },
  { key: "deliver", label: "Deliver", sub: "On the field", icon: Zap },
  { key: "game", label: "Game", sub: "Game day", icon: Radio },
  { key: "review", label: "Review", sub: "After", icon: Award },
];

const PLAN_TABS = [
  { key: "targets", label: "Targets", icon: Target },
  { key: "roster", label: "Roster", icon: Users },
  { key: "attendance", label: "Attendance", icon: ClipboardCheck },
  { key: "lineup", label: "Lineup", icon: ListOrdered },
  { key: "pitch", label: "Pitch Count", icon: Activity },
  { key: "logistics", label: "Logistics", icon: Package },
] as const;
const DELIVER_TABS = [
  { key: "plan", label: "Practice Plan", icon: ClipboardList },
  { key: "drills", label: "Drills", icon: Dumbbell },
  { key: "board", label: "Diamond Board", icon: MapIcon },
] as const;
const REVIEW_TABS = [
  { key: "reflect", label: "Reflect", icon: NotebookPen },
  { key: "season", label: "Season", icon: Trophy },
  { key: "trends", label: "Trends", icon: TrendingUp },
] as const;

type PlanKey = (typeof PLAN_TABS)[number]["key"];
type DeliverKey = (typeof DELIVER_TABS)[number]["key"];
type ReviewKey = (typeof REVIEW_TABS)[number]["key"];

function BaseballMark() {
  return (
    <svg width={28} height={28} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="#F4F1E8" stroke="#8C8778" strokeWidth="2" />
      <path d="M14 10c8 7 10 16 10 22s-2 15-10 22M50 10c-8 7-10 16-10 22s2 15 10 22" fill="none" stroke="#C8322B" strokeWidth="2.5" strokeDasharray="3 3" />
    </svg>
  );
}

function exportData() {
  const { set: _s, addPlayer: _a, updatePlayer: _u, removePlayer: _r, addToPlan: _p, saveSession: _v, archiveGame: _g, removeFrom: _f, resetAll: _x, ...data } = useNotepad.getState();
  const blob = new Blob([JSON.stringify({ app: "baseball-notepad", version: 1, data }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `baseball-notepad-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { app?: string; data?: Record<string, unknown> };
      if (parsed.app !== "baseball-notepad" || !parsed.data || typeof parsed.data !== "object") throw new Error("format");
      if (!confirm("Replace everything on this device with the backup?")) return;
      useNotepad.setState(parsed.data);
    } catch {
      alert("That file isn't a Baseball Notepad backup.");
    }
  };
  input.click();
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("plan");
  const [planTab, setPlanTab] = useState<PlanKey>("roster");
  const [deliverTab, setDeliverTab] = useState<DeliverKey>("plan");
  const [reviewTab, setReviewTab] = useState<ReviewKey>("reflect");
  const teamName = useNotepad((s) => s.teamName);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-turf-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-3">
          <BaseballMark />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl uppercase leading-none tracking-wide">Baseball Notepad</h1>
            {teamName && <p className="truncate text-[11px] text-chalk-dim">{teamName}</p>}
          </div>
          <button type="button" onClick={exportData} aria-label="Back up data" title="Back up data" className="flex size-9 items-center justify-center rounded-lg text-chalk-dim hover:bg-turf-700"><Download size={16} /></button>
          <button type="button" onClick={importData} aria-label="Restore backup" title="Restore backup" className="flex size-9 items-center justify-center rounded-lg text-chalk-dim hover:bg-turf-700"><Upload size={16} /></button>
        </div>
        <nav className="mx-auto flex max-w-4xl" aria-label="Phases">
          {PHASES.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-current={phase === p.key ? "page" : undefined}
              onClick={() => setPhase(p.key)}
              className={cx(
                "flex flex-1 flex-col items-center gap-0.5 border-b-[3px] px-1 py-2.5 transition",
                phase === p.key ? "border-clay bg-turf-700" : "border-transparent hover:bg-turf-800",
              )}
            >
              <p.icon size={18} strokeWidth={2.25} className={phase === p.key ? "text-clay" : "text-chalk-dim"} />
              <span className={cx("font-display text-[13px] uppercase tracking-widest", phase === p.key ? "text-chalk" : "text-chalk-dim")}>{p.label}</span>
              <span className="hidden text-[10px] text-chalk-dim/70 sm:block">{p.sub}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4">
        {phase === "plan" && (
          <>
            <Tabs tabs={[...PLAN_TABS]} active={planTab} onChange={setPlanTab} />
            {planTab === "targets" && <TargetsTab />}
            {planTab === "roster" && <RosterTab />}
            {planTab === "attendance" && <AttendanceTab />}
            {planTab === "lineup" && <LineupTab />}
            {planTab === "pitch" && <PitchCountTab />}
            {planTab === "logistics" && <LogisticsTab />}
          </>
        )}
        {phase === "deliver" && (
          <>
            <Tabs tabs={[...DELIVER_TABS]} active={deliverTab} onChange={setDeliverTab} />
            {deliverTab === "plan" && <PracticePlanTab />}
            {deliverTab === "drills" && <DrillsTab />}
            {deliverTab === "board" && <DiamondBoardTab />}
          </>
        )}
        {phase === "game" && <LiveGameTab />}
        {phase === "review" && (
          <>
            <Tabs tabs={[...REVIEW_TABS]} active={reviewTab} onChange={setReviewTab} />
            {reviewTab === "reflect" && <ReflectTab />}
            {reviewTab === "season" && <SeasonTab />}
            {reviewTab === "trends" && (
              <Suspense fallback={<p className="text-sm text-chalk-dim">Loading charts…</p>}>
                <TrendsTab />
              </Suspense>
            )}
          </>
        )}
      </main>

      <footer className="no-print border-t border-line py-4 text-center text-[11px] text-chalk-dim/70">
        Baseball Notepad · Valencia Solution · Data stays on this device unless you share a live game.
      </footer>
    </div>
  );
}
