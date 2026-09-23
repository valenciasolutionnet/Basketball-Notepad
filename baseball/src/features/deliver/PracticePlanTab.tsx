import { useEffect, useRef, useState } from "react";
import { ClipboardList, ArrowUp, ArrowDown, Trash2, Play, Pause, RotateCcw, SkipForward, Check } from "lucide-react";
import { useNotepad } from "../../store";
import { AddRow, Button, Empty, IconBtn, Panel, cx } from "../../components/ui";

function mmss(total: number): string {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PracticePlanTab() {
  const items = useNotepad((s) => s.practicePlan);
  const set = useNotepad((s) => s.set);
  const addToPlan = useNotepad((s) => s.addToPlan);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);

  const active = items.find((i) => i.id === activeId) ?? null;
  const total = items.reduce((a, i) => a + i.duration, 0);

  // The active block was deleted or the plan cleared: stop the clock.
  useEffect(() => {
    if (!active && running) setRunning(false);
  }, [active, running]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const left = ((endAt.current ?? Date.now()) - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        navigator.vibrate?.([300, 150, 300]);
      }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const start = (id: string) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setActiveId(id);
    setRemaining(it.duration * 60);
    endAt.current = Date.now() + it.duration * 60_000;
    setRunning(true);
  };
  const toggle = () => {
    if (running) setRunning(false);
    else {
      endAt.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  };
  const next = () => {
    if (!active) return;
    set("practicePlan", (xs) => xs.map((x) => (x.id === active.id ? { ...x, done: true } : x)));
    const idx = items.findIndex((i) => i.id === active.id);
    const following = items.slice(idx + 1).find((i) => !i.done);
    if (following) start(following.id);
    else {
      setActiveId(null);
      setRunning(false);
    }
  };
  const move = (i: number, d: -1 | 1) =>
    set("practicePlan", (xs) => {
      const o = [...xs];
      const j = i + d;
      if (j < 0 || j >= o.length) return xs;
      [o[i], o[j]] = [o[j]!, o[i]!];
      return o;
    });

  return (
    <Panel
      icon={ClipboardList}
      title="Practice Plan"
      subtitle={`${items.length} blocks · ${total} min`}
      action={items.length > 0 && (
        <button type="button" className="text-xs font-semibold text-clay" onClick={() => confirm("Clear the whole plan?") && set("practicePlan", [])}>Clear</button>
      )}
    >
      {active && (
        <div className="mb-4 rounded-xl border border-clay bg-clay/10 p-4 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-clay">{active.station || "Now"}</div>
          <div className="font-display text-2xl uppercase">{active.activity}</div>
          <div className={cx("my-1 font-mono text-6xl font-bold tabular-nums", remaining <= 0 ? "text-stitch" : remaining < 60 ? "text-clay" : "text-chalk")}>
            {remaining <= 0 ? "TIME" : mmss(remaining)}
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={toggle} disabled={remaining <= 0}>{running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Resume</>}</Button>
            <Button variant="ghost" onClick={() => start(active.id)}><RotateCcw size={15} /> Restart</Button>
            <Button variant="ghost" onClick={next}><SkipForward size={15} /> Next</Button>
          </div>
        </div>
      )}

      <AddRow placeholder="Add a block (e.g. Water break, Team talk)" onAdd={(v) => addToPlan(v, 5)} />
      {items.length === 0 && <Empty>Empty plan. Add blocks here or from the Drill Library.</Empty>}
      <ol className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={it.id} className={cx("flex items-center gap-2 rounded-lg border bg-turf-950 px-2 py-1.5", it.id === activeId ? "border-clay" : "border-line", it.done && "opacity-50")}>
            <IconBtn label={`Start ${it.activity}`} onClick={() => start(it.id)}>{it.done ? <Check size={14} className="text-grass" /> : <Play size={14} />}</IconBtn>
            <div className="min-w-0 flex-1">
              <div className={cx("truncate text-[14px] font-semibold", it.done && "line-through")}>{it.activity}</div>
              {it.station && <div className="text-[11px] text-chalk-dim">{it.station}</div>}
            </div>
            <input
              aria-label="Minutes" type="number" min={1} inputMode="numeric" value={it.duration}
              onChange={(e) => set("practicePlan", (xs) => xs.map((x) => (x.id === it.id ? { ...x, duration: Math.max(1, Number(e.target.value) || 1) } : x)))}
              className="w-14 rounded-md border border-line bg-turf-900 py-1.5 text-center font-mono text-sm"
            />
            <span className="text-[11px] text-chalk-dim">min</span>
            <IconBtn label="Move up" onClick={() => move(i, -1)}><ArrowUp size={13} /></IconBtn>
            <IconBtn label="Move down" onClick={() => move(i, 1)}><ArrowDown size={13} /></IconBtn>
            <IconBtn danger label="Remove" onClick={() => set("practicePlan", (xs) => xs.filter((x) => x.id !== it.id))}><Trash2 size={13} /></IconBtn>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
