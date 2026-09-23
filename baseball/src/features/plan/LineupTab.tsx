import { ListOrdered, ArrowUp, ArrowDown, X, Wand2, Printer, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useNotepad } from "../../store";
import { POSITIONS, type FieldSlot, type Lineup, type Player } from "../../lib/types";
import { autoFill, catcherPitcherConflict, inningIssues, usage } from "../../lib/lineup";
import { uid } from "../../lib/id";
import { Button, Empty, IconBtn, Panel, SubHeading, TextInput, cx } from "../../components/ui";

const SLOTS: FieldSlot[] = [...POSITIONS, "BN"];

function newLineup(n: number, players: Player[]): Lineup {
  const present = players.filter((p) => p.present);
  return { id: uid(), name: `Lineup ${n}`, battingOrder: (present.length ? present : players).map((p) => p.id), innings: 6, defense: {} };
}

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
    const l = newLineup(lineups.length + 1, players);
    set("lineups", (ls) => [...ls, l]);
    set("activeLineupId", l.id);
  };

  if (!players.length) {
    return (
      <Panel icon={ListOrdered} title="Lineup" subtitle="Batting order and defensive rotation">
        <Empty>Add players in Roster first.</Empty>
      </Panel>
    );
  }
  if (!lineup) {
    return (
      <Panel icon={ListOrdered} title="Lineup" subtitle="Batting order and defensive rotation">
        <Button onClick={create}><Plus size={15} /> Build a lineup from today's attendance</Button>
      </Panel>
    );
  }

  const order = lineup.battingOrder.filter((id) => byId.has(id));
  const notInOrder = players.filter((p) => !order.includes(p.id));
  const move = (i: number, d: -1 | 1) =>
    update((l) => {
      const o = [...l.battingOrder];
      const j = i + d;
      if (j < 0 || j >= o.length) return {};
      [o[i], o[j]] = [o[j]!, o[i]!];
      return { battingOrder: o };
    });
  const setSlot = (inning: number, id: string, slot: FieldSlot) =>
    update((l) => ({ defense: { ...l.defense, [inning]: { ...(l.defense[inning] ?? {}), [id]: slot } } }));
  const innings = Array.from({ length: lineup.innings }, (_, i) => i);

  return (
    <Panel
      icon={ListOrdered}
      title="Lineup"
      subtitle="Batting order and inning-by-inning defense"
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
        <label className="flex items-center gap-2 text-xs text-chalk-dim">
          Innings
          <select
            value={lineup.innings}
            onChange={(e) => update({ innings: Number(e.target.value) })}
            className="min-h-10 rounded-lg border border-line bg-turf-950 px-2 font-mono text-sm text-chalk"
          >
            {[3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <IconBtn danger label="Delete lineup" onClick={() => {
          if (!confirm(`Delete ${lineup.name}?`)) return;
          set("lineups", (ls) => ls.filter((l) => l.id !== lineup.id));
          set("activeLineupId", null);
        }}><Trash2 size={14} /></IconBtn>
      </div>

      <SubHeading>Batting order</SubHeading>
      <ol className="flex flex-col gap-1.5">
        {order.map((id, i) => {
          const p = byId.get(id)!;
          return (
            <li key={id} className="flex items-center gap-2 rounded-lg border border-line bg-turf-950 px-2 py-1">
              <span className="w-6 text-center font-display text-lg text-clay">{i + 1}</span>
              <span className="w-8 font-mono text-xs text-chalk-dim">{p.number && `#${p.number}`}</span>
              <span className="flex-1 truncate text-[14px] font-semibold">{p.name}</span>
              <span className="hidden font-mono text-[11px] text-chalk-dim sm:inline">{p.bats}/{p.throws}</span>
              <div className="no-print flex gap-1">
                <IconBtn label="Move up" onClick={() => move(i, -1)}><ArrowUp size={14} /></IconBtn>
                <IconBtn label="Move down" onClick={() => move(i, 1)}><ArrowDown size={14} /></IconBtn>
                <IconBtn label="Remove from order" onClick={() => update((l) => ({ battingOrder: l.battingOrder.filter((x) => x !== id) }))}><X size={14} /></IconBtn>
              </div>
            </li>
          );
        })}
      </ol>
      {notInOrder.length > 0 && (
        <div className="no-print mt-2 flex flex-wrap gap-1.5">
          {notInOrder.map((p) => (
            <button key={p.id} type="button" onClick={() => update((l) => ({ battingOrder: [...l.battingOrder, p.id] }))}
              className="min-h-8 rounded-full border border-dashed border-line px-3 text-xs text-chalk-dim hover:text-chalk">
              + {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-grass">Defense by inning</h3>
        <Button variant="ghost" className="no-print min-h-9" onClick={() => {
          if (Object.keys(lineup.defense).length && !confirm("Replace the current defensive grid?")) return;
          update({ defense: autoFill(lineup, players) });
        }}>
          <Wand2 size={14} /> Auto-rotate
        </Button>
      </div>

      <div className="-mx-4 mt-2 overflow-x-auto px-4">
        <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[13px]">
          <thead>
            <tr className="text-[11px] text-chalk-dim">
              <th className="text-left font-semibold">Player</th>
              {innings.map((i) => <th key={i} className="font-mono">{i + 1}</th>)}
              <th className="font-semibold" title="Innings on bench">BN</th>
            </tr>
          </thead>
          <tbody>
            {order.map((id) => {
              const p = byId.get(id)!;
              const u = usage(lineup.defense, lineup.innings, id);
              const conflict = catcherPitcherConflict(lineup.defense, lineup.innings, id);
              return (
                <tr key={id}>
                  <td className="max-w-28 truncate pr-1 font-semibold">
                    {conflict && <AlertTriangle size={12} className="mr-1 inline text-stitch" aria-label="Catcher 4+ innings cannot pitch" />}
                    {p.name}
                  </td>
                  {innings.map((i) => {
                    const slot = lineup.defense[i]?.[id] ?? "BN";
                    const dup = inningIssues(lineup.defense, i, order).duplicates.includes(slot as never);
                    return (
                      <td key={i}>
                        <select
                          aria-label={`${p.name} inning ${i + 1}`}
                          value={slot}
                          onChange={(e) => setSlot(i, id, e.target.value as FieldSlot)}
                          className={cx(
                            "min-h-9 w-full appearance-none rounded-md border text-center font-mono text-xs font-bold",
                            slot === "BN" ? "border-line bg-turf-950 text-chalk-dim/60" : "border-turf-600 bg-turf-700 text-chalk",
                            dup && "border-stitch text-stitch",
                          )}
                        >
                          {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    );
                  })}
                  <td className={cx("text-center font-mono", u.maxConsecutiveBench > 1 ? "text-stitch" : "text-chalk-dim")}>{u.bench}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="text-[11px] text-chalk-dim">Open</td>
              {innings.map((i) => {
                const { missing } = inningIssues(lineup.defense, i, order);
                return (
                  <td key={i} className={cx("text-center font-mono text-[10px] leading-tight", missing.length ? "text-clay" : "text-grass")}>
                    {missing.length ? missing.join(" ") : "✓"}
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-chalk-dim">
        Red bench count = sat back-to-back innings. <AlertTriangle size={11} className="inline text-stitch" /> = caught 4+ innings and also pitches (not allowed under Little League rules).
      </p>
    </Panel>
  );
}
