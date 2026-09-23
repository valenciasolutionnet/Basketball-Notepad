import { Target, ClipboardCheck, Package } from "lucide-react";
import { useNotepad } from "../../store";
import { Checklist, Empty, Panel, SubHeading, cx } from "../../components/ui";

export function TargetsTab() {
  const targets = useNotepad((s) => s.targets);
  const set = useNotepad((s) => s.set);
  return (
    <Panel icon={Target} title="Practice Targets" subtitle="Two or three things this practice must accomplish">
      <Checklist items={targets} setItems={(fn) => set("targets", fn)} placeholder="e.g. Every infielder turns 10 double plays" empty="No targets yet." />
    </Panel>
  );
}

export function AttendanceTab() {
  const players = useNotepad((s) => s.players);
  const update = useNotepad((s) => s.updatePlayer);
  const set = useNotepad((s) => s.set);
  const present = players.filter((p) => p.present).length;
  return (
    <Panel
      icon={ClipboardCheck}
      title="Attendance"
      subtitle={`${present} of ${players.length} present`}
      action={
        players.length > 0 && (
          <button type="button" className="text-xs font-semibold text-clay" onClick={() => set("players", (ps) => ps.map((p) => ({ ...p, present: true })))}>
            All present
          </button>
        )
      }
    >
      {players.length === 0 && <Empty>Add players in Roster first.</Empty>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={p.present}
              onClick={() => update(p.id, { present: !p.present })}
              className={cx(
                "flex min-h-12 w-full items-center gap-2 rounded-lg border px-3 text-left text-[14px] font-semibold",
                p.present ? "border-grass bg-grass/15 text-chalk" : "border-line text-chalk-dim/60 line-through",
              )}
            >
              <span className="w-7 font-mono text-xs text-chalk-dim">{p.number ? `#${p.number}` : ""}</span>
              <span className="truncate">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function LogisticsTab() {
  const equipment = useNotepad((s) => s.equipment);
  const reminders = useNotepad((s) => s.reminders);
  const set = useNotepad((s) => s.set);
  return (
    <Panel icon={Package} title="Logistics" subtitle="Gear bag and reminders">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <SubHeading>Equipment</SubHeading>
          <Checklist items={equipment} setItems={(fn) => set("equipment", fn)} placeholder="Buckets, L-screen, catcher's gear…" empty="Nothing packed yet." />
        </div>
        <div>
          <SubHeading>Reminders</SubHeading>
          <Checklist items={reminders} setItems={(fn) => set("reminders", fn)} placeholder="Field permit, snack schedule…" empty="No reminders." />
        </div>
      </div>
    </Panel>
  );
}
