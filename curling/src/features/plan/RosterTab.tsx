import { useState } from "react";
import { Users, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useNotepad } from "../../store";
import { POSITIONS, type Hand, type Player } from "../../lib/types";
import { AddRow, Empty, IconBtn, Panel, Segmented, TextArea, TextInput, cx } from "../../components/ui";

function PlayerCard({ p }: { p: Player }) {
  const update = useNotepad((s) => s.updatePlayer);
  const remove = useNotepad((s) => s.removePlayer);
  const [open, setOpen] = useState(false);
  const patch = (x: Partial<Player>) => update(p.id, x);

  return (
    <li className="rounded-xl border border-line bg-turf-950 p-3">
      <div className="flex items-center gap-2">
        <TextInput value={p.name} onChange={(v) => patch({ name: v })} ariaLabel="Player name" />
        <Segmented<Hand> ariaLabel="Throwing hand" value={p.hand} onChange={(v) => patch({ hand: v })} options={[{ value: "R", label: "R" }, { value: "L", label: "L" }]} />
        <IconBtn label={open ? "Collapse" : "Expand"} onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </IconBtn>
        <IconBtn danger label={`Remove ${p.name}`} onClick={() => confirm(`Remove ${p.name} from the roster?`) && remove(p.id)}>
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
              className={cx("min-h-8 rounded-md border px-2.5 text-xs font-bold", on ? "border-clay bg-clay text-clay-ink" : "border-line text-chalk-dim")}
            >
              {pos}
            </button>
          );
        })}
      </div>

      {p.deliveryNotes && !open && <p className="mt-2 line-clamp-2 text-[12.5px] text-chalk-dim">{p.deliveryNotes}</p>}

      {open && (
        <div className="mt-3 space-y-3">
          <TextArea label="Delivery" rows={2} value={p.deliveryNotes} onChange={(v) => patch({ deliveryNotes: v })} placeholder="Slide, release, turn tendencies, stabilizer or stick" />
          <TextArea label="Strengths" rows={2} value={p.strengths} onChange={(v) => patch({ strengths: v })} placeholder="What this player does well" />
          <TextArea label="Working on" rows={2} value={p.workOn} onChange={(v) => patch({ workOn: v })} placeholder="Current development focus" />
          <TextArea label="Connection" rows={2} value={p.connectionNote} onChange={(v) => patch({ connectionNote: v })} placeholder="What connects with this player — interests, family, motivation" />
        </div>
      )}
    </li>
  );
}

export function RosterTab() {
  const players = useNotepad((s) => s.players);
  const addPlayer = useNotepad((s) => s.addPlayer);
  return (
    <Panel icon={Users} title="Roster" subtitle="Positions, throwing hand, and delivery notes">
      <AddRow placeholder="Add player name" onAdd={addPlayer} />
      {players.length === 0 && <Empty>No players yet. Add your team to unlock lineups and live scoring.</Empty>}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {players.map((p) => <PlayerCard key={p.id} p={p} />)}
      </ul>
    </Panel>
  );
}
