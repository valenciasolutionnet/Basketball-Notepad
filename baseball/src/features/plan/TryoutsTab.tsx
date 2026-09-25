import { ClipboardX, Trash2, UserPlus } from "lucide-react";
import { useNotepad } from "../../store";
import { POSITIONS, type Prospect, type TryoutStatus } from "../../lib/types";
import { AddRow, Empty, IconBtn, Panel, Segmented, TextArea, cx } from "../../components/ui";

const STATUS_OPTIONS: { value: TryoutStatus; label: string }[] = [
  { value: "trying-out", label: "Trying out" },
  { value: "kept", label: "Kept" },
  { value: "cut", label: "Cut" },
];

function ProspectCard({ p }: { p: Prospect }) {
  const update = useNotepad((s) => s.updateProspect);
  const remove = useNotepad((s) => s.removeFrom);
  const promote = useNotepad((s) => s.promoteProspect);
  const patch = (x: Partial<Prospect>) => update(p.id, x);

  return (
    <li className={cx("rounded-xl border border-line bg-turf-950 p-3", p.status === "cut" && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={p.name}
          aria-label="Prospect name"
          onChange={(e) => patch({ name: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-line bg-turf-900 px-3 py-2 text-[14px] text-chalk outline-none focus:border-clay"
        />
        <Segmented<TryoutStatus> ariaLabel={`Status for ${p.name}`} value={p.status} onChange={(v) => patch({ status: v })} options={STATUS_OPTIONS} />
        <IconBtn danger label={`Remove ${p.name}`} onClick={() => confirm(`Remove ${p.name} from tryouts?`) && remove("tryouts", p.id)}>
          <Trash2 size={14} />
        </IconBtn>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {POSITIONS.map((pos) => {
          const on = p.positions.includes(pos);
          return (
            <button
              key={pos}
              type="button"
              aria-pressed={on}
              onClick={() => patch({ positions: on ? p.positions.filter((x) => x !== pos) : [...p.positions, pos] })}
              className={cx("min-h-8 min-w-10 rounded-md border px-2 font-mono text-xs font-bold", on ? "border-clay bg-clay text-clay-ink" : "border-line text-chalk-dim")}
            >
              {pos}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-grass">Rating</span>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={p.rating === n}
            aria-label={`Rate ${p.name} ${n}`}
            onClick={() => patch({ rating: n })}
            className={cx("flex size-8 items-center justify-center rounded-md border font-mono text-xs font-bold", p.rating === n ? "border-clay bg-clay text-clay-ink" : "border-line text-chalk-dim")}
          >
            {n}
          </button>
        ))}
      </div>

      <TextArea rows={2} value={p.notes} onChange={(v) => patch({ notes: v })} placeholder="Notes from the tryout" />

      <div className="flex items-center justify-between">
        {p.promotedPlayerId ? (
          <span className="text-[12.5px] text-grass">Promoted to roster</span>
        ) : p.status === "kept" ? (
          <button
            type="button"
            onClick={() => promote(p.id)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-clay px-3 text-[13px] font-bold text-clay-ink hover:bg-clay-dim"
          >
            <UserPlus size={14} /> Promote to roster
          </button>
        ) : (
          <span />
        )}
      </div>
    </li>
  );
}

export function TryoutsTab() {
  const tryouts = useNotepad((s) => s.tryouts);
  const addProspect = useNotepad((s) => s.addProspect);
  return (
    <Panel icon={ClipboardX} title="Tryouts" subtitle="Cut list and roster history — kept, cut, and promoted prospects stay here">
      <AddRow placeholder="Add prospect name" onAdd={addProspect} />
      {tryouts.length === 0 && <Empty>No prospects yet. Add everyone trying out to track ratings and notes.</Empty>}
      <ul className="flex flex-col gap-2.5">
        {tryouts.map((p) => <ProspectCard key={p.id} p={p} />)}
      </ul>
    </Panel>
  );
}
