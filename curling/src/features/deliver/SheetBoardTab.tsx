import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Map as MapIcon, Move, Circle, CircleDot, ArrowUpRight, Eraser, Plus, Trash2, RotateCcw, type LucideIcon } from "lucide-react";
import { useNotepad } from "../../store";
import { defaultDiagram, SHEET } from "../../lib/sheet";
import type { Diagram, DiagramArrow, DiagramStone } from "../../lib/types";
import { uid } from "../../lib/id";
import { Sheet, Stone } from "../../components/Sheet";
import { IconBtn, Panel, TextInput, cx } from "../../components/ui";

type Tool = "move" | "red" | "yellow" | "broom" | "path" | "erase";
const TOOLS: { key: Tool; label: string; icon: LucideIcon; tint?: string }[] = [
  { key: "move", label: "Move", icon: Move },
  { key: "red", label: "Red", icon: Circle, tint: "text-stitch" },
  { key: "yellow", label: "Yellow", icon: Circle, tint: "text-[#e8c547]" },
  { key: "broom", label: "Broom", icon: CircleDot },
  { key: "path", label: "Path", icon: ArrowUpRight },
  { key: "erase", label: "Erase", icon: Eraser },
];

function toSvg(svg: SVGSVGElement, e: RPointerEvent): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const m = svg.getScreenCTM();
  const p = m ? pt.matrixTransform(m.inverse()) : pt;
  return { x: Math.max(0, Math.min(SHEET.w, p.x)), y: Math.max(0, Math.min(SHEET.h, p.y)) };
}

function Board({ diagram, commit }: { diagram: Diagram; commit: (d: Diagram) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState(diagram);
  const [tool, setTool] = useState<Tool>("move");
  const drag = useRef<{ id: string } | null>(null);
  const [arrow, setArrow] = useState<DiagramArrow | null>(null);

  // Pointer handlers read these refs: pointerup can fire before React renders
  // the last pointermove, so state captured at render time may be stale.
  const draftRef = useRef(diagram);
  const arrowRef = useRef<DiagramArrow | null>(null);
  const updateDraft = (d: Diagram) => {
    draftRef.current = d;
    setDraft(d);
  };
  const updateArrow = (a: DiagramArrow | null) => {
    arrowRef.current = a;
    setArrow(a);
  };

  useEffect(() => updateDraft(diagram), [diagram]);

  const down = (e: RPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const p = toSvg(svg, e);
    if (tool === "red" || tool === "yellow" || tool === "broom") {
      // One broom target per diagram: placing it again moves it.
      const stones = tool === "broom" ? draft.stones.filter((s) => s.kind !== "broom") : draft.stones;
      commit({ ...draft, stones: [...stones, { id: uid(), kind: tool, ...p }] });
      return;
    }
    if (tool === "path") {
      svg.setPointerCapture(e.pointerId);
      updateArrow({ id: uid(), x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    }
  };
  const moveEv = (e: RPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const p = toSvg(svg, e);
    if (drag.current) {
      const id = drag.current.id;
      const d = draftRef.current;
      updateDraft({ ...d, stones: d.stones.map((s) => (s.id === id ? { ...s, ...p } : s)) });
    } else if (arrowRef.current) updateArrow({ ...arrowRef.current, x2: p.x, y2: p.y });
  };
  const up = () => {
    const d = draftRef.current;
    if (drag.current) {
      drag.current = null;
      commit(d);
    }
    const a = arrowRef.current;
    if (a) {
      if (Math.hypot(a.x2 - a.x1, a.y2 - a.y1) > 3) commit({ ...d, arrows: [...d.arrows, a] });
      updateArrow(null);
    }
  };
  const stoneDown = (id: string) => (e: RPointerEvent) => {
    if (tool === "erase") {
      e.stopPropagation();
      commit({ ...draft, stones: draft.stones.filter((s) => s.id !== id) });
      return;
    }
    if (tool !== "move") return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    drag.current = { id };
  };

  const arrows = arrow ? [...draft.arrows, arrow] : draft.arrows;
  const counts = (k: DiagramStone["kind"]) => draft.stones.filter((s) => s.kind === k).length;
  return (
    <div>
      <div role="toolbar" aria-label="Board tools" className="no-scrollbar -mx-4 mb-2 flex gap-1 overflow-x-auto px-4">
        {TOOLS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tool === t.key} onClick={() => setTool(t.key)}
            className={cx("flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold", tool === t.key ? "border-clay bg-clay text-clay-ink" : "border-line text-chalk-dim")}>
            <t.icon size={14} className={tool === t.key ? undefined : t.tint} fill={t.tint ? "currentColor" : "none"} /> {t.label}
          </button>
        ))}
        <button type="button" onClick={() => commit({ ...draft, arrows: draft.arrows.slice(0, -1) })} disabled={!draft.arrows.length}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-bold text-chalk-dim">
          <RotateCcw size={14} /> Undo path
        </button>
      </div>
      <p className="mb-2 text-[11.5px] text-chalk-dim">Red {counts("red")}/8 · Yellow {counts("yellow")}/8</p>
      <div className="mx-auto max-w-[340px] overflow-hidden rounded-xl border border-line">
        <Sheet
          ref={svgRef}
          className="block w-full touch-none select-none"
          onPointerDown={down}
          onPointerMove={moveEv}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label={`${draft.name} diagram`}
        >
          <defs>
            <marker id="ah-path" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1c2a33" /></marker>
          </defs>
          {arrows.map((a) => (
            <line
              key={a.id} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
              stroke="#1c2a33" strokeWidth={0.7} strokeDasharray="2 1.2" markerEnd="url(#ah-path)"
              onPointerDown={(e) => {
                if (tool !== "erase") return;
                e.stopPropagation();
                commit({ ...draft, arrows: draft.arrows.filter((x) => x.id !== a.id) });
              }}
              className={tool === "erase" ? "cursor-pointer" : undefined}
              style={{ pointerEvents: tool === "erase" ? "stroke" : "none" }}
            />
          ))}
          {draft.stones.map((s) => (
            <g key={s.id} onPointerDown={stoneDown(s.id)} className={tool === "move" ? "cursor-grab" : tool === "erase" ? "cursor-pointer" : undefined}>
              {s.kind === "broom" ? (
                <>
                  <circle cx={s.x} cy={s.y} r={2.6} fill="transparent" />
                  <line x1={s.x - 2} y1={s.y - 2} x2={s.x + 2} y2={s.y + 2} stroke="#1c2a33" strokeWidth={0.8} strokeLinecap="round" />
                  <line x1={s.x + 2} y1={s.y - 2} x2={s.x - 2} y2={s.y + 2} stroke="#1c2a33" strokeWidth={0.8} strokeLinecap="round" />
                </>
              ) : (
                <Stone x={s.x} y={s.y} color={s.kind} />
              )}
            </g>
          ))}
        </Sheet>
      </div>
    </div>
  );
}

export function SheetBoardTab() {
  const diagrams = useNotepad((s) => s.diagrams);
  const activeId = useNotepad((s) => s.activeDiagramId);
  const set = useNotepad((s) => s.set);
  const diagram = diagrams.find((d) => d.id === activeId) ?? diagrams[0];

  const add = () => {
    const d = { ...defaultDiagram(`Play ${diagrams.length + 1}`), stones: [] };
    set("diagrams", (ds) => [...ds, d]);
    set("activeDiagramId", d.id);
  };
  const commit = (d: Diagram) => set("diagrams", (ds) => ds.map((x) => (x.id === d.id ? d : x)));

  return (
    <Panel icon={MapIcon} title="Sheet Board" subtitle="Place stones, set the skip's broom, and draw shot paths"
      action={<IconBtn label="New diagram" onClick={add}><Plus size={15} /></IconBtn>}>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
        {diagrams.map((d) => (
          <button key={d.id} type="button" aria-pressed={d.id === diagram?.id} onClick={() => set("activeDiagramId", d.id)}
            className={cx("min-h-8 shrink-0 rounded-full border px-3 text-xs font-semibold", d.id === diagram?.id ? "border-grass bg-grass/20" : "border-line text-chalk-dim")}>
            {d.name}
          </button>
        ))}
      </div>
      {diagram && (
        <>
          <div className="mb-3 flex gap-2">
            <TextInput value={diagram.name} onChange={(v) => commit({ ...diagram, name: v })} ariaLabel="Diagram name" />
            <IconBtn label="Clear the sheet" onClick={() => confirm("Remove every stone and path from this diagram?") && commit({ ...diagram, stones: [], arrows: [] })}>
              <RotateCcw size={14} />
            </IconBtn>
            {diagrams.length > 1 && (
              <IconBtn danger label="Delete diagram" onClick={() => {
                if (!confirm(`Delete "${diagram.name}"?`)) return;
                set("diagrams", (ds) => ds.filter((d) => d.id !== diagram.id));
                set("activeDiagramId", null);
              }}><Trash2 size={14} /></IconBtn>
            )}
          </div>
          <Board key={diagram.id} diagram={diagram} commit={commit} />
        </>
      )}
    </Panel>
  );
}
