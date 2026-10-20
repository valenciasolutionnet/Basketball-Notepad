import { useMemo, useState } from "react";
import { Crosshair, Trash2, X } from "lucide-react";
import { C } from "./theme.jsx";
import { Panel, IconBtn, SubHeading } from "./ui.jsx";

// Half court in feet x 10 (50ft wide, 47ft deep). Baseline at the top.
export const COURT_W = 500;
export const COURT_H = 470;
const HOOP = { x: 250, y: 52.5 };
const THREE_R = 197.5; // 19'9"
const LANE_HALF = 60; // 12ft lane
const FT_Y = 190; // free-throw line, 19ft from baseline

// Free throws stack along the free-throw line so repeated attempts stay visible.
export function freeThrowSpot(index) {
  const offsets = [0, -14, 14, -28, 28, -42, 42];
  return { x: HOOP.x + offsets[index % offsets.length], y: FT_Y };
}

export function shotSummary(shots) {
  const s = { fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };
  for (const shot of shots) {
    if (shot.pts === 1) {
      s.fta += 1;
      if (shot.made) s.ftm += 1;
    } else {
      s.fga += 1;
      if (shot.made) s.fgm += 1;
      if (shot.pts === 3) {
        s.tpa += 1;
        if (shot.made) s.tpm += 1;
      }
    }
  }
  return s;
}

function pct(m, a) {
  return a ? `${Math.round((m / a) * 100)}%` : "—";
}

function CourtLines() {
  const stroke = C.chalkFaint;
  const arcY = HOOP.y; // corner lines run straight from the baseline to hoop depth, then the arc takes over
  return (
    <g fill="none" stroke={stroke} strokeWidth={2}>
      <rect x={1} y={1} width={COURT_W - 2} height={COURT_H - 2} />
      <rect x={HOOP.x - LANE_HALF} y={0} width={LANE_HALF * 2} height={FT_Y} />
      <circle cx={HOOP.x} cy={FT_Y} r={60} />
      <line x1={HOOP.x - THREE_R} y1={0} x2={HOOP.x - THREE_R} y2={arcY} />
      <line x1={HOOP.x + THREE_R} y1={0} x2={HOOP.x + THREE_R} y2={arcY} />
      <path d={`M ${HOOP.x - THREE_R} ${arcY} A ${THREE_R} ${THREE_R} 0 0 0 ${HOOP.x + THREE_R} ${arcY}`} />
      <line x1={HOOP.x - 30} y1={40} x2={HOOP.x + 30} y2={40} strokeWidth={3} />
      <circle cx={HOOP.x} cy={HOOP.y} r={7.5} stroke={C.amber} />
      <path d={`M ${HOOP.x - 60} ${COURT_H} A 60 60 0 0 1 ${HOOP.x + 60} ${COURT_H}`} />
    </g>
  );
}

function ShotMark({ shot }) {
  const color = shot.pts === 3 ? C.amber : shot.pts === 1 ? C.chalk : C.sage;
  if (shot.made) {
    return <circle cx={shot.x} cy={shot.y} r={9} fill={color} fillOpacity={0.85} stroke={C.bg2} strokeWidth={1.5} />;
  }
  return (
    <g stroke={C.red} strokeWidth={3.5} strokeLinecap="round">
      <line x1={shot.x - 7} y1={shot.y - 7} x2={shot.x + 7} y2={shot.y + 7} />
      <line x1={shot.x + 7} y1={shot.y - 7} x2={shot.x - 7} y2={shot.y + 7} />
    </g>
  );
}

// Renders a half court. Pass onPick to make it tappable; it receives court coordinates.
export function Court({ shots = [], onPick, pending }) {
  const handleClick = (e) => {
    if (!onPick) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    onPick({
      x: Math.round(Math.min(COURT_W, Math.max(0, p.x))),
      y: Math.round(Math.min(COURT_H, Math.max(0, p.y))),
    });
  };
  return (
    <svg
      viewBox={`0 0 ${COURT_W} ${COURT_H}`}
      onClick={handleClick}
      style={{
        width: "100%", display: "block", background: C.bg2, borderRadius: 8, border: `1px solid ${C.line}`,
        cursor: onPick ? "crosshair" : "default", touchAction: "manipulation",
      }}
    >
      <CourtLines />
      {shots.filter((s) => s.x != null && s.y != null).map((s) => <ShotMark key={s.id} shot={s} />)}
      {pending && <circle cx={pending.x} cy={pending.y} r={11} fill="none" stroke={C.amber} strokeWidth={3} />}
    </svg>
  );
}

export function ShotLegend() {
  const item = (swatch, label) => (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {swatch}
      {label}
    </span>
  );
  const dot = (color) => <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />;
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.chalkDim, marginTop: 6 }}>
      {item(dot(C.sage), "2PT make")}
      {item(dot(C.amber), "3PT make")}
      {item(dot(C.chalk), "FT make")}
      {item(<span style={{ color: C.red, fontWeight: 800 }}>✕</span>, "Miss")}
    </div>
  );
}

export function ShotLine({ shots }) {
  const s = shotSummary(shots);
  return (
    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: C.chalkDim, margin: "6px 0 0" }}>
      FG {s.fgm}/{s.fga} ({pct(s.fgm, s.fga)}) · 3PT {s.tpm}/{s.tpa} ({pct(s.tpm, s.tpa)}) · FT {s.ftm}/{s.fta} ({pct(s.ftm, s.fta)})
    </p>
  );
}

// Popup shown after a coach taps +2/+3 Make or Miss.
export function ShotLocationPicker({ request, playerName, onPick, onSkip, onCancel }) {
  const label = `${request.made ? "Make" : "Miss"} · ${request.pts}PT`;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16, zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, color: C.chalk, letterSpacing: "0.02em" }}>
              Where was the shot?
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.chalkDim }}>
              {playerName} · {label}
            </div>
          </div>
          <IconBtn onClick={onCancel}><X size={14} /></IconBtn>
        </div>
        <Court onPick={onPick} />
        <button
          onClick={onSkip}
          style={{
            marginTop: 10, width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.line}`,
            background: "transparent", color: C.chalkDim, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          Skip — just log the stat
        </button>
      </div>
    </div>
  );
}

// Review phase: every finished game's shot chart, kept permanently.
export function ShotChartTab({ games, setGames }) {
  const sorted = useMemo(() => [...games].sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0)), [games]);
  const [gameCode, setGameCode] = useState(null);
  const [playerId, setPlayerId] = useState("all");
  const game = sorted.find((g) => g.code === gameCode) || sorted[0] || null;
  const shots = game ? game.shots || [] : [];
  const visible = playerId === "all" ? shots : shots.filter((s) => s.playerId === playerId);

  const removeGame = (code) => {
    if (!window.confirm("Delete this game's shot chart? This can't be undone.")) return;
    setGames((gs) => gs.filter((g) => g.code !== code));
    setGameCode(null);
    setPlayerId("all");
  };

  return (
    <Panel icon={Crosshair} title="Shot Chart" subtitle="Where your team shot from in each finished game">
      {!game ? (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.chalkFaint, fontStyle: "italic" }}>
          No finished games yet — log shots in the Game phase, then tap “End game” to save the chart here.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <select
              value={game.code}
              onChange={(e) => { setGameCode(e.target.value); setPlayerId("all"); }}
              style={{
                flex: 1, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px",
                color: C.chalk, fontFamily: "'Inter', sans-serif", fontSize: 13,
              }}
            >
              {sorted.map((g) => (
                <option key={g.code} value={g.code}>
                  {new Date(g.endedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {g.teamName} {g.usScore}–{g.oppScore} {g.opponentName}
                </option>
              ))}
            </select>
            <IconBtn onClick={() => removeGame(game.code)} danger><Trash2 size={14} /></IconBtn>
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
            {[{ id: "all", name: "Team" }, ...(game.players || [])].map((p) => (
              <button
                key={p.id}
                onClick={() => setPlayerId(p.id)}
                style={{
                  padding: "6px 11px", borderRadius: 999, border: `1px solid ${p.id === playerId ? C.amber : C.line}`,
                  background: p.id === playerId ? C.amber : "transparent", color: p.id === playerId ? C.amberInk : C.chalkDim,
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="np-court-cap">
            <Court shots={visible} />
            <ShotLegend />
            <ShotLine shots={visible} />
          </div>

          <div style={{ marginTop: 16 }}>
            <SubHeading>Box score</SubHeading>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Space Mono', monospace", fontSize: 11.5, color: C.chalk }}>
                <thead>
                  <tr style={{ color: C.chalkDim, textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "4px 6px" }}>Player</th>
                    {["PTS", "FG", "3PT", "FT", "REB", "AST", "STL", "BLK", "TO", "PF"].map((h) => (
                      <th key={h} style={{ padding: "4px 6px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(game.players || []).map((p) => {
                    const s = shotSummary(shots.filter((x) => x.playerId === p.id));
                    return (
                      <tr key={p.id} style={{ borderTop: `1px solid ${C.line}`, textAlign: "right" }}>
                        <td style={{ textAlign: "left", padding: "5px 6px", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: "5px 6px", color: C.amber }}>{p.pts || 0}</td>
                        <td style={{ padding: "5px 6px" }}>{p.fgm || 0}/{p.fga || 0}</td>
                        <td style={{ padding: "5px 6px" }}>{s.tpm}/{s.tpa}</td>
                        <td style={{ padding: "5px 6px" }}>{p.ftm || 0}/{p.fta || 0}</td>
                        {["reb", "ast", "stl", "blk", "to", "foul"].map((k) => (
                          <td key={k} style={{ padding: "5px 6px" }}>{p[k] || 0}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
