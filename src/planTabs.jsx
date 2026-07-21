import { useState } from "react";
import { Target, ClipboardCheck, StickyNote, User, Shuffle, Trash2 } from "lucide-react";
import { C, uid } from "./theme.jsx";
import { Panel, Checklist, IconBtn, AddRow } from "./ui.jsx";

export function TargetsTab({ targets, setTargets }) {
  return (
    <Panel icon={Target} title="Targets" subtitle="Set 2–4 specific targets for today's practice">
      <Checklist items={targets} setItems={setTargets} placeholder="e.g. Hit 70% on free-throw drill" empty="No targets yet — add your first one above." />
    </Panel>
  );
}

export function PlayerNotesTab({ icon, title, subtitle, players, setPlayers, field, placeholder }) {
  return (
    <Panel icon={icon} title={title} subtitle={subtitle}>
      {players.length === 0 ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkFaint, fontStyle: "italic" }}>
          No players on your roster yet. Add players from the Attendance tab.
        </p>
      ) : (
        <div className="np-roster-list">
          {players.map((p) => (
            <div key={p.id} style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, color: C.chalk, marginBottom: 6 }}>
                {p.name}
              </div>
              <textarea
                value={p[field]}
                onChange={(e) =>
                  setPlayers((ps) => ps.map((x) => (x.id === p.id ? { ...x, [field]: e.target.value } : x)))
                }
                placeholder={placeholder}
                rows={2}
                style={{
                  width: "100%",
                  resize: "vertical",
                  background: C.bg,
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  padding: "8px 9px",
                  color: C.chalk,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

function ProfileLabel({ children }) {
  return (
    <label
      style={{
        display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: C.sage,
        textTransform: "uppercase", letterSpacing: "0.04em", margin: "8px 0 5px",
      }}
    >
      {children}
    </label>
  );
}

function PlayerProfileCard({ player, setPlayers }) {
  const update = (patch) => setPlayers((ps) => ps.map((p) => (p.id === player.id ? { ...p, ...patch } : p)));
  const textareaStyle = {
    width: "100%", resize: "vertical", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6,
    padding: "8px 9px", color: C.chalk, fontFamily: "'Inter', sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <input
          value={player.jerseyNumber || ""}
          onChange={(e) => update({ jerseyNumber: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })}
          placeholder="#"
          style={{
            width: 38, textAlign: "center", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6,
            padding: "6px 2px", color: C.amber, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, outline: "none",
          }}
        />
        <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.chalk }}>
          {player.name}
        </span>
        <input
          value={player.yearsOnTeam || ""}
          onChange={(e) => update({ yearsOnTeam: e.target.value })}
          placeholder="Yrs on team"
          style={{
            width: 78, textAlign: "center", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 6,
            padding: "6px 4px", color: C.chalkDim, fontFamily: "'Inter', sans-serif", fontSize: 11, outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => update({ position: player.position === pos ? "" : pos })}
            style={{
              padding: "5px 11px", borderRadius: 999, border: `1px solid ${player.position === pos ? C.amber : C.line}`,
              background: player.position === pos ? C.amber : "transparent", color: player.position === pos ? C.amberInk : C.chalkDim,
              fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11.5, cursor: "pointer",
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      <ProfileLabel>Strengths</ProfileLabel>
      <textarea
        value={player.strengths || ""}
        onChange={(e) => update({ strengths: e.target.value })}
        placeholder="What this player does well"
        rows={2}
        style={textareaStyle}
      />
      <ProfileLabel>Weaknesses</ProfileLabel>
      <textarea
        value={player.weaknesses || ""}
        onChange={(e) => update({ weaknesses: e.target.value })}
        placeholder="What to work on"
        rows={2}
        style={textareaStyle}
      />
    </div>
  );
}

export function PlayerProfilesTab({ players, setPlayers }) {
  return (
    <Panel icon={User} title="Players" subtitle="Position, experience, strengths and weaknesses">
      {players.length === 0 ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkFaint, fontStyle: "italic" }}>
          No players on your roster yet. Add players from the Attendance tab.
        </p>
      ) : (
        <div className="np-roster-list">
          {players.map((p) => <PlayerProfileCard key={p.id} player={p} setPlayers={setPlayers} />)}
        </div>
      )}
    </Panel>
  );
}

export function AttendanceTab({ players, setPlayers }) {
  const [name, setName] = useState("");

  const addPlayer = () => {
    if (!name.trim()) return;
    setPlayers((ps) => [
      ...ps,
      {
        id: uid(), name: name.trim(), present: true, team: null, connectionNote: "", challengeNote: "",
        position: "", jerseyNumber: "", yearsOnTeam: "", strengths: "", weaknesses: "",
      },
    ]);
    setName("");
  };
  const removePlayer = (id) => setPlayers((ps) => ps.filter((p) => p.id !== id));
  const togglePresent = (id) =>
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, present: !p.present, team: !p.present ? p.team : null } : p)));
  const cycleTeam = (id) =>
    setPlayers((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const next = p.team === "A" ? "B" : p.team === "B" ? null : "A";
        return { ...p, team: next };
      })
    );
  const shuffleTeams = () => {
    setPlayers((ps) => {
      const present = ps.filter((p) => p.present);
      const shuffled = [...present].sort(() => Math.random() - 0.5);
      const half = Math.ceil(shuffled.length / 2);
      const teamA = new Set(shuffled.slice(0, half).map((p) => p.id));
      return ps.map((p) => (p.present ? { ...p, team: teamA.has(p.id) ? "A" : "B" } : { ...p, team: null }));
    });
  };

  const presentCount = players.filter((p) => p.present).length;

  return (
    <Panel icon={ClipboardCheck} title="Attendance" subtitle="Track who's here and split scrimmage teams">
      <AddRow value={name} setValue={setName} placeholder="Player name" onAdd={addPlayer} />

      {players.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12.5, color: C.sage }}>
            {presentCount} / {players.length} present
          </span>
          <button
            onClick={shuffleTeams}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 11px",
              borderRadius: 7,
              border: `1px solid ${C.amberDim}`,
              background: "transparent",
              color: C.amber,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <Shuffle size={13} /> Shuffle teams
          </button>
        </div>
      )}

      {players.length === 0 ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkFaint, fontStyle: "italic" }}>
          No players yet — add your roster above.
        </p>
      ) : (
        <div className="np-roster-list">
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: C.bg2,
                border: `1px solid ${C.line}`,
                borderRadius: 7,
                padding: "8px 10px",
              }}
            >
              <button
                onClick={() => togglePresent(p.id)}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 10.5,
                  letterSpacing: "0.04em",
                  padding: "4px 8px",
                  borderRadius: 5,
                  border: `1px solid ${p.present ? C.sage : C.line}`,
                  background: p.present ? "rgba(121,160,122,0.18)" : "transparent",
                  color: p.present ? C.sage : C.chalkFaint,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {p.present ? "PRESENT" : "ABSENT"}
              </button>
              <span
                style={{
                  flex: 1,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13.5,
                  color: p.present ? C.chalk : C.chalkFaint,
                }}
              >
                {p.name}
              </span>
              {p.present && (
                <button
                  onClick={() => cycleTeam(p.id)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: `1px solid ${p.team ? C.amber : C.line}`,
                    background: p.team ? C.amber : "transparent",
                    color: p.team ? C.amberInk : C.chalkFaint,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  title="Click to assign team"
                >
                  {p.team || "–"}
                </button>
              )}
              <IconBtn onClick={() => removePlayer(p.id)} danger>
                <Trash2 size={14} />
              </IconBtn>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function LogisticsTab({ equipment, setEquipment, reminders, setReminders, notices, setNotices }) {
  return (
    <div className="np-logistics">
      <Panel icon={StickyNote} title="Equipment" subtitle="What to bring or set up before players arrive">
        <Checklist items={equipment} setItems={setEquipment} placeholder="e.g. Cones, extra balls, scrimmage vests" empty="Nothing on the equipment list yet." />
      </Panel>
      <Panel icon={StickyNote} title="Reminders" subtitle="Things to remember for this session">
        <Checklist items={reminders} setItems={setReminders} placeholder="e.g. Check in with injured player" empty="No reminders yet." />
      </Panel>
      <Panel icon={StickyNote} title="Notices" subtitle="Announcements for players or parents">
        <Checklist items={notices} setItems={setNotices} placeholder="e.g. Tournament sign-up closes Friday" empty="No notices yet." />
      </Panel>
    </div>
  );
}
