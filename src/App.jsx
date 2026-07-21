import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Zap, Radio, Award, Target, Users, AlertTriangle, User,
} from "lucide-react";
import { C, uid, recoverIdCounter, defaultDrills, defaultWarmups, createDiagram, BasketballIcon } from "./theme.jsx";
import { PhaseButton, TabPill } from "./ui.jsx";
import { TargetsTab, PlayerNotesTab, PlayerProfilesTab, AttendanceTab, LogisticsTab } from "./planTabs.jsx";
import { WarmupTab, DrillsTab, PracticePlanTab, XOTab, DrawBoardTab } from "./deliverTabs.jsx";
import { CoachingTab, ExperienceTab, GratitudeTab, DevelopmentTab, ReviewNotesTab, TrendsTab } from "./reviewTabs.jsx";
import { LiveGameTab } from "./LiveGameTab.jsx";

const STORAGE_KEY = "basketballNotepad.state.v1";

function defaultState() {
  const diagram = createDiagram("Offense Play 1", "offense");
  const board = { id: uid(), name: "Sketch 1", strokes: [] };
  return {
    players: [],
    targets: [],
    equipment: [],
    reminders: [],
    notices: [],
    drills: defaultDrills(),
    warmups: defaultWarmups(),
    practicePlan: [],
    diagrams: [diagram],
    activeDiagramId: diagram.id,
    boards: [board],
    activeBoardId: board.id,
    coaching: { prep: 3, energy: 3, communication: 3 },
    experience: { fun: 3, problemSolving: 3, connection: 3 },
    gratitude: "",
    development: "",
    worked: "",
    positives: "",
    next: "",
    sessions: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    recoverIdCounter(parsed);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

const PHASES = [
  { key: "plan", label: "Plan", sub: "Before practice", icon: ClipboardList },
  { key: "deliver", label: "Deliver", sub: "During practice", icon: Zap },
  { key: "game", label: "Game", sub: "Game day", icon: Radio },
  { key: "review", label: "Review", sub: "After practice", icon: Award },
];

const PLAN_TABS = ["targets", "connections", "challenges", "players", "attendance", "logistics"];
const DELIVER_TABS = ["warmup", "drills", "plan", "xo", "draw"];
const REVIEW_TABS = ["coaching", "experience", "gratitude", "development", "notes", "trends"];

export default function App() {
  const [state, setState] = useState(loadState);
  const [phase, setPhase] = useState("plan");
  const [planTab, setPlanTab] = useState("targets");
  const [deliverTab, setDeliverTab] = useState("warmup");
  const [reviewTab, setReviewTab] = useState("coaching");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — practice continues, just unsaved */
    }
  }, [state]);

  const set = (key) => (value) => setState((s) => ({ ...s, [key]: typeof value === "function" ? value(s[key]) : value }));

  const players = state.players;
  const setPlayers = set("players");

  const addToPracticePlan = (activity, duration) => {
    setState((s) => ({ ...s, practicePlan: [...s.practicePlan, { id: uid(), activity, duration: duration || 0 }] }));
  };

  const saveSession = () => {
    const presentCount = players.filter((p) => p.present).length;
    const targetsDone = state.targets.filter((t) => t.done).length;
    const session = {
      id: uid(),
      date: new Date().toISOString(),
      coaching: state.coaching,
      experience: state.experience,
      attendance: presentCount,
      targetsDone,
      targetsTotal: state.targets.length,
    };
    setState((s) => ({
      ...s,
      sessions: [...s.sessions, session],
      targets: [],
      coaching: { prep: 3, energy: 3, communication: 3 },
      experience: { fun: 3, problemSolving: 3, connection: 3 },
      gratitude: "",
      development: "",
      worked: "",
      positives: "",
      next: "",
    }));
  };

  const planTabMeta = useMemo(() => ({
    targets: { icon: Target, label: "Targets" },
    connections: { icon: Users, label: "Connections" },
    challenges: { icon: AlertTriangle, label: "Challenges" },
    players: { icon: User, label: "Players" },
    attendance: { icon: ClipboardList, label: "Attendance" },
    logistics: { icon: ClipboardList, label: "Logistics" },
  }), []);
  const deliverTabMeta = useMemo(() => ({
    warmup: { icon: Zap, label: "Warm-Up" },
    drills: { icon: Zap, label: "Drills" },
    plan: { icon: ClipboardList, label: "Practice Plan" },
    xo: { icon: ClipboardList, label: "X's and O's" },
    draw: { icon: ClipboardList, label: "Draw Board" },
  }), []);
  const reviewTabMeta = useMemo(() => ({
    coaching: { icon: Award, label: "My Coaching" },
    experience: { icon: Award, label: "Experience" },
    gratitude: { icon: Award, label: "Gratitude" },
    development: { icon: Award, label: "Development" },
    notes: { icon: Award, label: "Notes" },
    trends: { icon: Award, label: "Trends" },
  }), []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
          borderBottom: `1px solid ${C.line}`, background: C.bg2,
        }}
      >
        <svg width={26} height={26} viewBox="0 0 26 26"><BasketballIcon cx={13} cy={13} r={12} /></svg>
        <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 19, letterSpacing: "0.03em", color: C.chalk, textTransform: "uppercase" }}>
          Basketball Notepad
        </span>
      </header>

      <nav style={{ display: "flex", background: C.bg2, borderBottom: `1px solid ${C.line}` }}>
        {PHASES.map((p) => (
          <PhaseButton key={p.key} active={phase === p.key} onClick={() => setPhase(p.key)} icon={p.icon} label={p.label} sub={p.sub} />
        ))}
      </nav>

      <main style={{ flex: 1, maxWidth: 760, width: "100%", margin: "0 auto", padding: 16, boxSizing: "border-box" }}>
        {phase === "plan" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              {PLAN_TABS.map((t) => (
                <TabPill key={t} active={planTab === t} onClick={() => setPlanTab(t)} icon={planTabMeta[t].icon} label={planTabMeta[t].label} />
              ))}
            </div>
            {planTab === "targets" && <TargetsTab targets={state.targets} setTargets={set("targets")} />}
            {planTab === "connections" && (
              <PlayerNotesTab
                icon={Users} title="Connections" subtitle="Notes on building a relationship with each player"
                players={players} setPlayers={setPlayers} field="connectionNote"
                placeholder="What connects with this player?"
              />
            )}
            {planTab === "challenges" && (
              <PlayerNotesTab
                icon={AlertTriangle} title="Challenges" subtitle="Notes on what's tough for each player right now"
                players={players} setPlayers={setPlayers} field="challengeNote"
                placeholder="What's this player struggling with?"
              />
            )}
            {planTab === "players" && <PlayerProfilesTab players={players} setPlayers={setPlayers} />}
            {planTab === "attendance" && <AttendanceTab players={players} setPlayers={setPlayers} />}
            {planTab === "logistics" && (
              <LogisticsTab
                equipment={state.equipment} setEquipment={set("equipment")}
                reminders={state.reminders} setReminders={set("reminders")}
                notices={state.notices} setNotices={set("notices")}
              />
            )}
          </>
        )}

        {phase === "deliver" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              {DELIVER_TABS.map((t) => (
                <TabPill key={t} active={deliverTab === t} onClick={() => setDeliverTab(t)} icon={deliverTabMeta[t].icon} label={deliverTabMeta[t].label} />
              ))}
            </div>
            {deliverTab === "warmup" && <WarmupTab warmups={state.warmups} setWarmups={set("warmups")} onAddToPlan={addToPracticePlan} />}
            {deliverTab === "drills" && <DrillsTab drills={state.drills} setDrills={set("drills")} onAddToPlan={addToPracticePlan} />}
            {deliverTab === "plan" && <PracticePlanTab items={state.practicePlan} setItems={set("practicePlan")} />}
            {deliverTab === "xo" && (
              <XOTab diagrams={state.diagrams} setDiagrams={set("diagrams")} activeId={state.activeDiagramId} setActiveId={set("activeDiagramId")} />
            )}
            {deliverTab === "draw" && (
              <DrawBoardTab boards={state.boards} setBoards={set("boards")} activeId={state.activeBoardId} setActiveId={set("activeBoardId")} />
            )}
          </>
        )}

        {phase === "game" && <LiveGameTab players={players} />}

        {phase === "review" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              {REVIEW_TABS.map((t) => (
                <TabPill key={t} active={reviewTab === t} onClick={() => setReviewTab(t)} icon={reviewTabMeta[t].icon} label={reviewTabMeta[t].label} />
              ))}
            </div>
            {reviewTab === "coaching" && <CoachingTab coaching={state.coaching} setCoaching={set("coaching")} />}
            {reviewTab === "experience" && <ExperienceTab experience={state.experience} setExperience={set("experience")} />}
            {reviewTab === "gratitude" && <GratitudeTab gratitude={state.gratitude} setGratitude={set("gratitude")} />}
            {reviewTab === "development" && <DevelopmentTab development={state.development} setDevelopment={set("development")} />}
            {reviewTab === "notes" && (
              <ReviewNotesTab
                worked={state.worked} setWorked={set("worked")}
                positives={state.positives} setPositives={set("positives")}
                next={state.next} setNext={set("next")}
              />
            )}
            {reviewTab === "trends" && <TrendsTab sessions={state.sessions} onSave={saveSession} />}
          </>
        )}
      </main>
    </div>
  );
}
