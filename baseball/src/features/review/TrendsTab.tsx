import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useNotepad } from "../../store";
import { Empty, Panel, SubHeading } from "../../components/ui";

export default function TrendsTab() {
  const sessions = useNotepad((s) => s.sessions);
  const data = sessions.map((s, i) => ({
    name: `#${i + 1}`,
    coaching: +((s.ratings.prep + s.ratings.energy + s.ratings.communication) / 3).toFixed(2),
    team: +((s.ratings.fun + s.ratings.learning + s.ratings.effort) / 3).toFixed(2),
    attendance: s.attendance,
  }));
  return (
    <Panel icon={TrendingUp} title="Trends" subtitle={`${sessions.length} practice${sessions.length === 1 ? "" : "s"} saved`}>
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
                  <Tooltip contentStyle={{ background: "#10231a", border: "1px solid rgba(241,237,226,0.14)", borderRadius: 8 }} />
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
                  <Tooltip contentStyle={{ background: "#10231a", border: "1px solid rgba(241,237,226,0.14)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="attendance" name="Players" stroke="#f1ede2" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
