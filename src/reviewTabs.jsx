import { Gauge, Smile, Heart, TrendingUp, NotebookPen, Activity, Save } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { C } from "./theme.jsx";
import { Panel, RatingRow, TextAreaField, SubHeading } from "./ui.jsx";

export function CoachingTab({ coaching, setCoaching }) {
  const set = (k) => (v) => setCoaching((c) => ({ ...c, [k]: v }));
  return (
    <Panel icon={Gauge} title="My Coaching" subtitle="Rate your preparation, energy and communication">
      <RatingRow label="Preparation" description="How ready were you for this session?" value={coaching.prep} onChange={set("prep")} />
      <RatingRow label="Energy" description="How was your energy on the floor?" value={coaching.energy} onChange={set("energy")} />
      <RatingRow label="Communication" description="How clearly did you get your points across?" value={coaching.communication} onChange={set("communication")} />
    </Panel>
  );
}

export function ExperienceTab({ experience, setExperience }) {
  const set = (k) => (v) => setExperience((c) => ({ ...c, [k]: v }));
  return (
    <Panel icon={Smile} title="Player Experience" subtitle="Track player fun, problem solving and connections">
      <RatingRow label="Fun" description="Did players enjoy the session?" value={experience.fun} onChange={set("fun")} />
      <RatingRow label="Problem solving" description="Did players think for themselves?" value={experience.problemSolving} onChange={set("problemSolving")} />
      <RatingRow label="Connection" description="Did players connect with you and each other?" value={experience.connection} onChange={set("connection")} />
    </Panel>
  );
}

export function GratitudeTab({ gratitude, setGratitude }) {
  return (
    <Panel icon={Heart} title="Gratitude" subtitle="Gain motivation, focus and purpose">
      <TextAreaField value={gratitude} onChange={setGratitude} placeholder="What are you grateful for from today's session?" rows={5} />
    </Panel>
  );
}

export function DevelopmentTab({ development, setDevelopment }) {
  return (
    <Panel icon={TrendingUp} title="Development" subtitle="Grow as a coach by reflecting on what you learned">
      <TextAreaField value={development} onChange={setDevelopment} placeholder="What did you learn today? How will you grow from it?" rows={5} />
    </Panel>
  );
}

export function ReviewNotesTab({ worked, setWorked, positives, setPositives, next, setNext }) {
  return (
    <Panel icon={NotebookPen} title="Notes" subtitle="Record what worked and reminders for next session">
      <TextAreaField label="What worked" value={worked} onChange={setWorked} placeholder="Drills or moments that landed well" rows={3} />
      <TextAreaField label="Positives" value={positives} onChange={setPositives} placeholder="Highlights from the session" rows={3} />
      <TextAreaField label="Reminders for next session" value={next} onChange={setNext} placeholder="What to carry into the next practice" rows={3} />
    </Panel>
  );
}

export function TrendsTab({ sessions, onSave }) {
  const data = sessions.map((s, i) => ({
    label: `#${i + 1}`,
    date: new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    Preparation: s.coaching.prep,
    Energy: s.coaching.energy,
    Communication: s.coaching.communication,
    Fun: s.experience.fun,
    "Problem solving": s.experience.problemSolving,
    Connection: s.experience.connection,
  }));

  const tooltipStyle = {
    background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 12,
  };
  const legendStyle = { fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.chalkDim };

  return (
    <Panel icon={Activity} title="Trends" subtitle="See how practices are trending over time">
      <button
        onClick={onSave}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "10px 14px",
          borderRadius: 8, border: "none", background: C.amber, color: C.amberInk, fontFamily: "'Inter', sans-serif",
          fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginBottom: 6,
        }}
      >
        <Save size={15} strokeWidth={2.5} /> Save this session &amp; start a new one
      </button>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.chalkFaint, margin: "0 0 4px" }}>
        Archives today's ratings and targets, then clears Targets, ratings, gratitude, development and notes for your next practice. Roster and saved plays stay put.
      </p>

      {sessions.length === 0 ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkFaint, fontStyle: "italic", marginTop: 14 }}>
          No sessions saved yet — save your first one above to start tracking trends.
        </p>
      ) : (
        <>
          <div className="np-charts-grid">
            <div>
              <SubHeading>My Coaching</SubHeading>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={C.line} vertical={false} />
                  <XAxis dataKey="date" stroke={C.chalkDim} fontSize={10.5} tickLine={false} />
                  <YAxis domain={[1, 5]} allowDecimals={false} stroke={C.chalkDim} fontSize={10.5} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: C.chalk }} />
                  <Legend wrapperStyle={legendStyle} />
                  <Line type="monotone" dataKey="Preparation" stroke={C.amber} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Energy" stroke={C.sage} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Communication" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <SubHeading>Player Experience</SubHeading>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={C.line} vertical={false} />
                  <XAxis dataKey="date" stroke={C.chalkDim} fontSize={10.5} tickLine={false} />
                  <YAxis domain={[1, 5]} allowDecimals={false} stroke={C.chalkDim} fontSize={10.5} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: C.chalk }} />
                  <Legend wrapperStyle={legendStyle} />
                  <Line type="monotone" dataKey="Fun" stroke={C.amber} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Problem solving" stroke={C.sage} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Connection" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <SubHeading>Session log</SubHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...sessions].reverse().map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg2,
                  border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px",
                }}
              >
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.chalk }}>
                  {new Date(s.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, color: C.chalkDim }}>
                  {s.attendance} present · {s.targetsDone}/{s.targetsTotal} targets
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
