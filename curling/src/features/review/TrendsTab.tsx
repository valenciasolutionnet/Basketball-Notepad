import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useNotepad } from "../../store";
import { shotsByPlayer } from "../../lib/stats";
import { Empty, Panel, SubHeading } from "../../components/ui";

const SERIES = ["#d9824b", "#7fae7b", "#f1ede2", "#6fa8dc", "#d0413a", "#c9a6e0", "#e8c547"];
const tooltip = { background: "#10231a", border: "1px solid rgba(241,237,226,0.14)", borderRadius: 8 };

export default function TrendsTab() {
  const sessions = useNotepad((s) => s.sessions);
  const games = useNotepad((s) => s.finishedGames);
  const players = useNotepad((s) => s.players);
  const names = new Map(players.map((p) => [p.id, p.name]));

  const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const shooterIds = [...new Set(ordered.flatMap((g) => g.shots.map((s) => s.playerId).filter((x): x is string => !!x)))];
  const shooting = ordered.map((g, i) => {
    const row: Record<string, string | number> = { name: `#${i + 1} ${g.opponentName.replace(/^Team /, "")}` };
    for (const [id, l] of shotsByPlayer(g.shots)) row[id] = Math.round(l.pct * 100);
    return row;
  });

  const data = sessions.map((s, i) => ({
    name: `#${i + 1}`,
    coaching: +((s.ratings.prep + s.ratings.energy + s.ratings.communication) / 3).toFixed(2),
    team: +((s.ratings.fun + s.ratings.learning + s.ratings.effort) / 3).toFixed(2),
    attendance: s.attendance,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Panel icon={TrendingUp} title="Shooting" subtitle={`Shot % by game · ${games.length} saved game${games.length === 1 ? "" : "s"}`}>
        {games.length < 2 || !shooterIds.length ? (
          <Empty>Save at least two games with rated stones to see shooting trends.</Empty>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={shooting} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="rgba(241,237,226,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#aebcab" fontSize={11} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" stroke="#aebcab" fontSize={11} />
                <Tooltip contentStyle={tooltip} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {shooterIds.map((id, i) => (
                  <Line key={id} type="monotone" dataKey={id} name={names.get(id) ?? "Former player"} stroke={SERIES[i % SERIES.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel icon={TrendingUp} title="Practices" subtitle={`${sessions.length} practice${sessions.length === 1 ? "" : "s"} saved`}>
        {sessions.length < 2 ? (
          <Empty>Save at least two practices from Reflect to see trends.</Empty>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <SubHeading>Ratings (1–5)</SubHeading>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid stroke="rgba(241,237,226,0.08)" vertical={false} />
                    <XAxis dataKey="name" stroke="#aebcab" fontSize={11} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#aebcab" fontSize={11} />
                    <Tooltip contentStyle={tooltip} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="coaching" name="My coaching" stroke="#d9824b" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="team" name="Team experience" stroke="#7fae7b" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <SubHeading>Attendance</SubHeading>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid stroke="rgba(241,237,226,0.08)" vertical={false} />
                    <XAxis dataKey="name" stroke="#aebcab" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#aebcab" fontSize={11} />
                    <Tooltip contentStyle={tooltip} />
                    <Line type="monotone" dataKey="attendance" name="Players" stroke="#f1ede2" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
