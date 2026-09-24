import { ListOrdered, Wand2, Printer, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useNotepad } from "../../store";
import { POSITIONS, type Lineup, type Position } from "../../lib/types";
import { autoFill, duplicateIds, newLineup, relievingPosition, THROWING } from "../../lib/lineup";
import { Button, Empty, IconBtn, Panel, SubHeading, TextInput, cx, inputCls } from "../../components/ui";

export function LineupTab() {
  const players = useNotepad((s) => s.players);
  const lineups = useNotepad((s) => s.lineups);
  const activeId = useNotepad((s) => s.activeLineupId);
  const set = useNotepad((s) => s.set);
  const lineup = lineups.find((l) => l.id === activeId) ?? lineups[0];
  const byId = new Map(players.map((p) => [p.id, p]));

  const update = (patch: Partial<Lineup> | ((l: Lineup) => Partial<Lineup>)) => {
    if (!lineup) return;
    set("lineups", (ls) => ls.map((l) => (l.id === lineup.id ? { ...l, ...(typeof patch === "function" ? patch(l) : patch) } : l)));
  };
  const create = () => {
    const l = autoFill(newLineup(`Lineup ${lineups.length + 1}`), players);
    set("lineups", (ls) => [...ls, l]);
    set("activeLineupId", l.id);
  };

  if (!players.length) {
    return (
      <Panel icon={ListOrdered} title="Lineup" subtitle="Positions, throwing order, and who holds the broom">
        <Empty>Add players in Roster first.</Empty>
      </Panel>
    );
  }
  if (!lineup) {
    return (
      <Panel icon={ListOrdered} title="Lineup" subtitle="Positions, throwing order, and who holds the broom">
        <Button onClick={create}><Plus size={15} /> Build a lineup from today's attendance</Button>
      </Panel>
    );
  }

  const dups = duplicateIds(lineup);
  const setSlot = (pos: Position, id: string) =>
    update((l) => {
      const slots = { ...l.slots, [pos]: id || null };
      // The caller defaults to whoever skips.
      const broomId = l.broomId && Object.values(slots).includes(l.broomId) ? l.broomId : slots.Skip;
      return { slots, broomId };
    });
  const name = (id: string | null) => (id ? byId.get(id)?.name ?? "—" : "—");
  const throwingIds = THROWING.map((p) => lineup.slots[p]).filter((x): x is string => !!x);

  return (
    <Panel
      icon={ListOrdered}
      title="Lineup"
      subtitle="Positions, throwing order, and who holds the broom"
      action={
        <div className="no-print flex gap-1.5">
          <IconBtn label="Print lineup card" onClick={() => window.print()}><Printer size={15} /></IconBtn>
          <IconBtn label="New lineup" onClick={create}><Plus size={15} /></IconBtn>
        </div>
      }
    >
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        {lineups.length > 1 && (
          <select
            aria-label="Choose lineup"
            value={lineup.id}
            onChange={(e) => set("activeLineupId", e.target.value)}
            className="min-h-10 rounded-lg border border-line bg-turf-950 px-2 text-sm"
          >
            {lineups.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <TextInput className="max-w-52" value={lineup.name} onChange={(v) => update({ name: v })} ariaLabel="Lineup name" />
        <Button variant="ghost" className="min-h-10" onClick={() => update((l) => autoFill(l, players))}>
          <Wand2 size={14} /> Fill open spots
        </Button>
        <IconBtn danger label="Delete lineup" onClick={() => {
          if (!confirm(`Delete ${lineup.name}?`)) return;
          set("lineups", (ls) => ls.filter((l) => l.id !== lineup.id));
          set("activeLineupId", null);
        }}><Trash2 size={14} /></IconBtn>
      </div>

      <SubHeading>Positions</SubHeading>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {POSITIONS.map((pos) => {
          const id = lineup.slots[pos];
          return (
            <li key={pos} className="flex items-center gap-2 rounded-lg border border-line bg-turf-950 px-2 py-1.5">
              <span className="w-20 font-display text-lg uppercase text-clay">{pos}</span>
              <select
                aria-label={pos}
                value={id ?? ""}
                onChange={(e) => setSlot(pos, e.target.value)}
                className={cx(inputCls, "py-2", id && dups.includes(id) && "border-stitch text-stitch")}
              >
                <option value="">—</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}{p.present ? "" : " (away)"}</option>)}
              </select>
            </li>
          );
        })}
      </ul>
      {dups.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-stitch">
          <AlertTriangle size={12} /> {dups.map(name).join(", ")} {dups.length === 1 ? "is" : "are"} in more than one spot.
        </p>
      )}

      <SubHeading>Throwing order</SubHeading>
      <table className="w-full text-[13.5px]">
        <thead className="text-[11px] text-chalk-dim">
          <tr><th className="text-left font-semibold">Stones</th><th className="text-left font-semibold">Position</th><th className="text-left font-semibold">Player</th><th className="text-center font-semibold">Hand</th></tr>
        </thead>
        <tbody>
          {THROWING.map((pos, i) => {
            const p = lineup.slots[pos] ? byId.get(lineup.slots[pos]!) : undefined;
            return (
              <tr key={pos} className="border-t border-line">
                <td className="py-1.5 font-mono text-clay">{i * 2 + 1}–{i * 2 + 2}</td>
                <td>{pos}</td>
                <td className="font-semibold">{p?.name ?? <span className="text-chalk-dim/60">Open</span>}</td>
                <td className="text-center font-mono text-chalk-dim">{p?.hand ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SubHeading>Broom and calls</SubHeading>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-chalk-dim">Holds the broom and calls the game
          <select aria-label="Holds the broom" value={lineup.broomId ?? ""} onChange={(e) => update({ broomId: e.target.value || null })} className={inputCls}>
            <option value="">—</option>
            {throwingIds.map((id) => <option key={id} value={id}>{name(id)}</option>)}
          </select>
        </label>
      </div>
      {lineup.broomId && (
        <p className="mt-2 text-[12.5px] text-chalk-dim">
          When {name(lineup.broomId)} throws, the {relievingPosition(lineup).toLowerCase()} ({name(lineup.slots[relievingPosition(lineup)])}) holds the broom.
        </p>
      )}
    </Panel>
  );
}
