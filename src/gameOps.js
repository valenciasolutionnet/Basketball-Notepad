// Live Game changes are recorded as small actions ("ops") instead of whole-game
// snapshots. When two tablets save at the same time, the one that loses the
// race re-applies its own ops on top of the other coach's newer game, so
// neither coach's taps are lost. Every op must be safe to apply to any version
// of the game.

export function emptyStats() {
  return {
    pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, foul: 0, to: 0,
    fgm: 0, fga: 0, ftm: 0, fta: 0,
    onCourt: false, secondsPlayed: 0, checkedInAt: null,
  };
}

export const STAT_KEYS = ["reb", "ast", "stl", "blk", "foul", "to"];
const TEXT_FIELDS = ["teamName", "opponentName"];
const MAX_MESSAGES = 30;

export function normalizeGame(g) {
  return { ...g, messages: g.messages || [], shots: g.shots || [], players: g.players || [] };
}

function shotStats(p, pts, made, sign) {
  const m = made ? sign : 0;
  if (pts === 1) {
    return { ...p, ftm: Math.max(0, (p.ftm || 0) + m), fta: Math.max(0, (p.fta || 0) + sign), pts: Math.max(0, (p.pts || 0) + m) };
  }
  return { ...p, fgm: Math.max(0, (p.fgm || 0) + m), fga: Math.max(0, (p.fga || 0) + sign), pts: Math.max(0, (p.pts || 0) + m * pts) };
}

function mapPlayer(g, playerId, fn) {
  return { ...g, players: g.players.map((p) => (p.id === playerId ? fn(p) : p)) };
}

export function applyOp(game, op) {
  const g = normalizeGame(game);
  switch (op.type) {
    case "score": {
      const key = op.side === "opp" ? "oppScore" : "usScore";
      return { ...g, [key]: Math.max(0, (g[key] || 0) + op.delta) };
    }
    case "stat":
      if (!STAT_KEYS.includes(op.key)) return g;
      return mapPlayer(g, op.playerId, (p) => ({ ...p, [op.key]: Math.max(0, (p[op.key] || 0) + op.delta) }));
    case "shot": {
      const { shot } = op;
      if (g.shots.some((s) => s.id === shot.id)) return g; // already applied
      const next = mapPlayer(g, shot.playerId, (p) => shotStats(p, shot.pts, shot.made, 1));
      return {
        ...next,
        usScore: shot.made ? Math.max(0, (g.usScore || 0) + shot.pts) : g.usScore,
        shots: [...g.shots, shot],
      };
    }
    case "undoShot": {
      const shot = g.shots.find((s) => s.id === op.shotId);
      if (!shot) return g; // already undone, possibly by the other coach
      const next = mapPlayer(g, shot.playerId, (p) => shotStats(p, shot.pts, shot.made, -1));
      return {
        ...next,
        usScore: shot.made ? Math.max(0, (g.usScore || 0) - shot.pts) : g.usScore,
        shots: g.shots.filter((s) => s.id !== op.shotId),
      };
    }
    case "court":
      // Explicit on/off (not a toggle) so two coaches tapping the same player don't cancel out.
      return mapPlayer(g, op.playerId, (p) => {
        if (op.on && !p.onCourt) return { ...p, onCourt: true, checkedInAt: op.at };
        if (!op.on && p.onCourt) {
          const elapsed = p.checkedInAt ? Math.max(0, (op.at - p.checkedInAt) / 1000) : 0;
          return { ...p, onCourt: false, secondsPlayed: (p.secondsPlayed || 0) + elapsed, checkedInAt: null };
        }
        return p;
      });
    case "message":
      if (g.messages.some((m) => m.id === op.message.id)) return g;
      return { ...g, messages: [...g.messages, op.message].slice(-MAX_MESSAGES) };
    case "setText":
      if (!TEXT_FIELDS.includes(op.field)) return g;
      return { ...g, [op.field]: op.value };
    default:
      return g;
  }
}

export function applyOps(game, ops) {
  return ops.reduce(applyOp, normalizeGame(game));
}
