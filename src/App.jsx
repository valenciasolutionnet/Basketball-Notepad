import { useEffect, useState } from "react";
import {
  ClipboardList, Zap, Radio, Award, Target, Users, AlertTriangle, User, Crosshair,
} from "lucide-react";
import { C, uid, recoverIdCounter, defaultDrills, defaultWarmups, createDiagram, BasketballIcon } from "./theme.jsx";
import { PhaseButton, TabPill } from "./ui.jsx";
import { TargetsTab, PlayerNotesTab, PlayerProfilesTab, AttendanceTab, LogisticsTab } from "./planTabs.jsx";
import { WarmupTab, DrillsTab, PracticePlanTab, XOTab, DrawBoardTab } from "./deliverTabs.jsx";
import { CoachingTab, ExperienceTab, GratitudeTab, DevelopmentTab, ReviewNotesTab, TrendsTab } from "./reviewTabs.jsx";
import { LiveGameTab } from "./LiveGameTab.jsx";
import { ShotChartTab } from "./ShotChartTab.jsx";

const STORAGE_KEY = "basketballNotepad.state.v1";
const PHASE_KEY = "basketballNotepad.phase";

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
    games: [],
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
const REVIEW_TABS = ["coaching", "experience", "gratitude", "development", "notes", "shots", "trends"];

const PLAN_TAB_META = {
  targets: { icon: Target, label: "Targets" },
  connections: { icon: Users, label: "Connections" },
  challenges: { icon: AlertTriangle, label: "Challenges" },
  players: { icon: User, label: "Players" },
  attendance: { icon: ClipboardList, label: "Attendance" },
  logistics: { icon: ClipboardList, label: "Logistics" },
};
const DELIVER_TAB_META = {
  warmup: { icon: Zap, label: "Warm-Up" },
  drills: { icon: Zap, label: "Drills" },
  plan: { icon: ClipboardList, label: "Practice Plan" },
  xo: { icon: ClipboardList, label: "X's and O's" },
  draw: { icon: ClipboardList, label: "Draw Board" },
};
const REVIEW_TAB_META = {
  coaching: { icon: Award, label: "My Coaching" },
  experience: { icon: Award, label: "Experience" },
  gratitude: { icon: Award, label: "Gratitude" },
  development: { icon: Award, label: "Development" },
  notes: { icon: Award, label: "Notes" },
  shots: { icon: Crosshair, label: "Shot Chart" },
  trends: { icon: Award, label: "Trends" },
};

function loadPhase() {
  try {
    const p = localStorage.getItem(PHASE_KEY);
    return PHASES.some((x) => x.key === p) ? p : "plan";
  } catch {
    return "plan";
  }
}

// Keep only what Review needs from a finished live game.
function archiveGame(game) {
  return {
    code: game.code,
    endedAt: game.endedAt,
    teamName: game.teamName,
    opponentName: game.opponentName,
    usScore: game.usScore,
    oppScore: game.oppScore,
    players: (game.players || []).map(({ id, name, pts, reb, ast, stl, blk, foul, to, fgm, fga, ftm, fta, secondsPlayed }) => ({
      id, name, pts, reb, ast, stl, blk, foul, to, fgm, fga, ftm, fta, secondsPlayed,
    })),
    shots: game.shots || [],
  };
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [phase, setPhase] = useState(loadPhase);
  const [planTab, setPlanTab] = useState("targets");
  const [deliverTab, setDeliverTab] = useState("warmup");
  const [reviewTab, setReviewTab] = useState("coaching");

  // Debounced so rapid changes (Draw Board strokes) don't re-serialize everything each time.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage full or unavailable — practice continues, just unsaved */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(PHASE_KEY, phase);
    } catch {
      /* ignore */
    }
  }, [phase]);

  // One entry per game code: ending the same game again (e.g. after re-joining) replaces it.
  const saveFinishedGame = (game) => {
    const entry = archiveGame(game);
    setState((s) => ({ ...s, games: [...(s.games || []).filter((g) => g.code !== entry.code), entry] }));
  };

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
      gratitude: state.gratitude,
      development: state.development,
      worked: state.worked,
      positives: state.positives,
      next: state.next,
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
                <TabPill key={t} active={planTab === t} onClick={() => setPlanTab(t)} icon={PLAN_TAB_META[t].icon} label={PLAN_TAB_META[t].label} />
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
                <TabPill key={t} active={deliverTab === t} onClick={() => setDeliverTab(t)} icon={DELIVER_TAB_META[t].icon} label={DELIVER_TAB_META[t].label} />
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

        {/* Stays mounted so switching phases mid-game keeps the code, score and sync alive. */}
        <div style={{ display: phase === "game" ? "block" : "none" }}>
          <LiveGameTab players={players} onEndGame={saveFinishedGame} />
        </div>

        {phase === "review" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              {REVIEW_TABS.map((t) => (
                <TabPill key={t} active={reviewTab === t} onClick={() => setReviewTab(t)} icon={REVIEW_TAB_META[t].icon} label={REVIEW_TAB_META[t].label} />
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
            {reviewTab === "shots" && <ShotChartTab games={state.games || []} setGames={set("games")} />}
            {reviewTab === "trends" && <TrendsTab sessions={state.sessions} onSave={saveSession} />}
          </>
        )}
      </main>
    </div>
  );
}
