import { lazy, Suspense, useState } from "react";
import {
  ClipboardList, Zap, Radio, Award, Target, Users, ClipboardCheck, ListOrdered, Package,
  Dumbbell, Map as MapIcon, Trophy, TrendingUp, NotebookPen, Download, Upload, type LucideIcon,
} from "lucide-react";
import { useNotepad } from "./store";
import { Tabs, cx } from "./components/ui";
import { TargetsTab, AttendanceTab, LogisticsTab } from "./features/plan/basicTabs";
import { RosterTab } from "./features/plan/RosterTab";
import { LineupTab } from "./features/plan/LineupTab";
import { DrillsTab } from "./features/deliver/DrillsTab";
import { PracticePlanTab } from "./features/deliver/PracticePlanTab";
import { SheetBoardTab } from "./features/deliver/SheetBoardTab";
import { LiveGameTab } from "./features/game/LiveGameTab";
import { ReflectTab, SeasonTab } from "./features/review/ReviewTabs";
import { CoverPage } from "./components/CoverPage";
import { TeamSwitcher } from "./components/TeamSwitcher";
import { useLiveGameStore } from "./features/game/useLiveGame";
import { isDemoHost } from "./lib/demo";
import { activeTeam } from "./lib/teams";

// Recharts is the heaviest dependency; load it only when Trends is opened.
const TrendsTab = lazy(() => import("./features/review/TrendsTab"));

type Icon = LucideIcon;
type Phase = "plan" | "deliver" | "game" | "review";

const PHASES: { key: Phase; label: string; sub: string; icon: Icon }[] = [
  { key: "plan", label: "Plan", sub: "Before practice", icon: ClipboardList },
  { key: "deliver", label: "Deliver", sub: "On the ice", icon: Zap },
  { key: "game", label: "Game", sub: "Game day", icon: Radio },
  { key: "review", label: "Review", sub: "After", icon: Award },
];

const PLAN_TABS = [
  { key: "targets", label: "Targets", icon: Target },
  { key: "roster", label: "Roster", icon: Users },
  { key: "attendance", label: "Attendance", icon: ClipboardCheck },
  { key: "lineup", label: "Lineup", icon: ListOrdered },
  { key: "logistics", label: "Logistics", icon: Package },
] as const;
const DELIVER_TABS = [
  { key: "plan", label: "Practice Plan", icon: ClipboardList },
  { key: "drills", label: "Drills", icon: Dumbbell },
  { key: "board", label: "Sheet Board", icon: MapIcon },
] as const;
const REVIEW_TABS = [
  { key: "reflect", label: "Reflect", icon: NotebookPen },
  { key: "season", label: "Season", icon: Trophy },
  { key: "trends", label: "Trends", icon: TrendingUp },
] as const;

type PlanKey = (typeof PLAN_TABS)[number]["key"];
type DeliverKey = (typeof DELIVER_TABS)[number]["key"];
type ReviewKey = (typeof REVIEW_TABS)[number]["key"];

function StoneMark() {
  return (
    <svg width={28} height={28} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M22 22h20a4 4 0 0 1 0 8H22" fill="none" stroke="#C8322B" strokeWidth="5" strokeLinecap="round" />
      <path d="M8 40c0-8 10-12 24-12s24 4 24 12v4c0 8-10 12-24 12S8 52 8 44z" fill="#8C8F94" stroke="#5E6166" strokeWidth="2" />
      <path d="M8 42c0 6 10 9 24 9s24-3 24-9" fill="none" stroke="#C8322B" strokeWidth="3" />
      <ellipse cx="32" cy="36" rx="18" ry="5" fill="#C8322B" />
    </svg>
  );
}

function exportData() {
  const { set: _s, addPlayer: _a, updatePlayer: _u, removePlayer: _r, addToPlan: _p, saveSession: _v, archiveGame: _g, removeFrom: _f, resetAll: _x, ...data } = useNotepad.getState();
  const blob = new Blob([JSON.stringify({ app: "curling-notepad", version: 1, data }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const team = activeTeam().name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "team";
  a.download = `curling-notepad-${team}-${new Date().toISOString().slice(0, 10)}.json`;
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
      if (parsed.app !== "curling-notepad" || !parsed.data || typeof parsed.data !== "object") throw new Error("format");
      if (!confirm("Replace everything on this device with the backup?")) return;
      useNotepad.setState(parsed.data);
    } catch {
      alert("That file isn't a Curling Notepad backup.");
    }
  };
  input.click();
}

const DEMO = isDemoHost(location.hostname);

export default function App() {
  // A live game in progress on launch: skip the cover and land on scoring.
  const [phase, setPhase] = useState<Phase>(() => (useLiveGameStore.getState().game ? "game" : "plan"));
  const [planTab, setPlanTab] = useState<PlanKey>("roster");
  const [deliverTab, setDeliverTab] = useState<DeliverKey>("plan");
  const [reviewTab, setReviewTab] = useState<ReviewKey>("reflect");
  const teamName = useNotepad((s) => s.teamName);
  const [showCover, setShowCover] = useState(() => !useLiveGameStore.getState().game);

  if (showCover) {
    return (
      <CoverPage onEnter={() => { setShowCover(false); window.scrollTo(0, 0); }} />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-turf-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-3">
          <button type="button" onClick={() => setShowCover(true)} aria-label="Show cover page" title="Home" className="shrink-0 rounded-full">
            <StoneMark />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-xl uppercase leading-none tracking-wide">
              Curling Notepad
              {DEMO && (
                <span className="rounded-full border border-clay px-2 py-0.5 font-sans text-[10px] font-bold tracking-wider text-clay" title="Sample data for trying the app">
                  Demo
                </span>
              )}
            </h1>
            {teamName && <p className="truncate text-[11px] text-chalk-dim">{teamName}</p>}
          </div>
          <TeamSwitcher />
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
            {planTab === "logistics" && <LogisticsTab />}
          </>
        )}
        {phase === "deliver" && (
          <>
            <Tabs tabs={[...DELIVER_TABS]} active={deliverTab} onChange={setDeliverTab} />
            {deliverTab === "plan" && <PracticePlanTab />}
            {deliverTab === "drills" && <DrillsTab />}
            {deliverTab === "board" && <SheetBoardTab />}
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
        Curling Notepad · Valencia Solution · Data stays on this device.
      </footer>
    </div>
  );
}
