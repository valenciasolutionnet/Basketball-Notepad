import { useState } from "react";
import { Dumbbell, Plus, Trash2, Check } from "lucide-react";
import { useNotepad } from "../../store";
import { DRILL_CATEGORIES } from "../../lib/defaults";
import type { DrillCategory } from "../../lib/types";
import { uid } from "../../lib/id";
import { Button, Empty, IconBtn, Panel, TextArea, TextInput, cx, inputCls } from "../../components/ui";

export function DrillsTab() {
  const drills = useNotepad((s) => s.drills);
  const set = useNotepad((s) => s.set);
  const addToPlan = useNotepad((s) => s.addToPlan);
  const [filter, setFilter] = useState<DrillCategory | "all">("all");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", category: "hitting" as DrillCategory, duration: "10", description: "", coachingPoint: "" });

  const shown = filter === "all" ? drills : drills.filter((d) => d.category === filter);
  const save = () => {
    if (!draft.name.trim()) return;
    set("drills", (ds) => [...ds, { id: uid(), ...draft, name: draft.name.trim(), duration: Number(draft.duration) || 5 }]);
    setDraft({ name: "", category: draft.category, duration: "10", description: "", coachingPoint: "" });
    setAdding(false);
  };

  return (
    <Panel
      icon={Dumbbell}
      title="Drill Library"
      subtitle="Tap + Plan to drop a drill into today's practice"
      action={<IconBtn label="New drill" onClick={() => setAdding((a) => !a)}><Plus size={15} /></IconBtn>}
    >
      {adding && (
        <div className="mb-4 rounded-lg border border-clay/50 bg-turf-950 p-3">
          <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <TextInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Drill name" />
            <select aria-label="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as DrillCategory })} className={inputCls}>
              {DRILL_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <input aria-label="Minutes" type="number" min={1} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} className={cx(inputCls, "sm:w-20")} />
          </div>
          <TextArea rows={2} value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} placeholder="Setup and how it runs" />
          <TextArea rows={2} value={draft.coachingPoint} onChange={(v) => setDraft({ ...draft, coachingPoint: v })} placeholder="The one coaching point" />
          <Button onClick={save} disabled={!draft.name.trim()}>Save drill</Button>
        </div>
      )}

      <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
        {[{ key: "all" as const, label: "All" }, ...DRILL_CATEGORIES].map((c) => (
          <button key={c.key} type="button" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}
            className={cx("min-h-8 shrink-0 rounded-full border px-3 text-xs font-semibold", filter === c.key ? "border-grass bg-grass/20 text-chalk" : "border-line text-chalk-dim")}>
            {c.label}
          </button>
        ))}
      </div>

      {shown.length === 0 && <Empty>No drills in this category.</Empty>}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {shown.map((d) => (
          <li key={d.id} className="flex flex-col rounded-lg border border-line bg-turf-950 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold leading-tight">{d.name}</h4>
                <span className="text-[11px] font-bold uppercase tracking-wider text-grass">
                  {DRILL_CATEGORIES.find((c) => c.key === d.category)?.label} · {d.duration} min
                </span>
              </div>
              <IconBtn danger label={`Delete ${d.name}`} onClick={() => confirm(`Delete "${d.name}"?`) && set("drills", (ds) => ds.filter((x) => x.id !== d.id))}>
                <Trash2 size={13} />
              </IconBtn>
            </div>
            {d.description && <p className="mt-1.5 text-[13px] text-chalk-dim">{d.description}</p>}
            {d.coachingPoint && <p className="mt-1.5 border-l-2 border-clay pl-2 text-[12.5px] text-chalk">{d.coachingPoint}</p>}
            <div className="mt-auto pt-2.5">
              <Button variant="ghost" className="min-h-9 w-full" onClick={() => {
                addToPlan(d.name, d.duration, DRILL_CATEGORIES.find((c) => c.key === d.category)?.label);
                setAdded(d.id);
                setTimeout(() => setAdded((x) => (x === d.id ? null : x)), 1200);
              }}>
                {added === d.id ? <><Check size={14} /> Added</> : <><Plus size={14} /> Plan</>}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
