import { Target, ClipboardCheck, Package } from "lucide-react";
import { useNotepad } from "../../store";
import { Checklist, Empty, Panel, SubHeading, TextInput, cx } from "../../components/ui";

const SHORT: Record<string, string> = { Lead: "L", Second: "2", Vice: "V", Skip: "S", Alternate: "A" };

export function TargetsTab() {
  const targets = useNotepad((s) => s.targets);
  const set = useNotepad((s) => s.set);
  return (
    <Panel icon={Target} title="Practice Targets" subtitle="Two or three things this practice must accomplish">
      <Checklist items={targets} setItems={(fn) => set("targets", fn)} placeholder="e.g. Every draw finishes inside the 12-foot" empty="No targets yet." />
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
              <span className="w-7 font-mono text-xs text-chalk-dim">{p.positions.map((x) => SHORT[x]).join("")}</span>
              <span className="truncate">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function LogisticsTab() {
  const iceTime = useNotepad((s) => s.iceTime);
  const sheet = useNotepad((s) => s.sheet);
  const equipment = useNotepad((s) => s.equipment);
  const reminders = useNotepad((s) => s.reminders);
  const set = useNotepad((s) => s.set);
  return (
    <Panel icon={Package} title="Logistics" subtitle="Ice booking, gear bag, and reminders">
      <div className="grid gap-2.5 sm:grid-cols-[1fr_8rem]">
        <label className="flex flex-col gap-1 text-xs text-chalk-dim">Ice time
          <TextInput value={iceTime} onChange={(v) => set("iceTime", v)} placeholder="e.g. Tuesdays 7:00 pm" ariaLabel="Ice time" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-chalk-dim">Sheet
          <TextInput className="font-mono" value={sheet} onChange={(v) => set("sheet", v.slice(0, 6))} placeholder="#" ariaLabel="Sheet number" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <SubHeading>Equipment</SubHeading>
          <Checklist items={equipment} setItems={(fn) => set("equipment", fn)} placeholder="Brooms, stopwatch, sliders, helmets…" empty="Nothing packed yet." />
        </div>
        <div>
          <SubHeading>Reminders</SubHeading>
          <Checklist items={reminders} setItems={(fn) => set("reminders", fn)} placeholder="Book ice, league fees…" empty="No reminders." />
        </div>
      </div>
    </Panel>
  );
}
