import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Map as MapIcon, Move, UserPlus, Circle, ArrowUpRight, Footprints, Eraser, Plus, Trash2, RotateCcw } from "lucide-react";
import { useNotepad } from "../../store";
import { defaultDiagram } from "../../lib/diamond";
import type { Diagram, DiagramArrow } from "../../lib/types";
import { uid } from "../../lib/id";
import { Field } from "../../components/Field";
import { IconBtn, Panel, TextInput, cx } from "../../components/ui";

type Tool = "move" | "runner" | "ball" | "throw" | "run" | "erase";
const TOOLS: { key: Tool; label: string; icon: typeof Move }[] = [
  { key: "move", label: "Move", icon: Move },
  { key: "runner", label: "Runner", icon: UserPlus },
  { key: "ball", label: "Ball", icon: Circle },
  { key: "throw", label: "Throw", icon: ArrowUpRight },
  { key: "run", label: "Run", icon: Footprints },
  { key: "erase", label: "Erase", icon: Eraser },
];

function toSvg(svg: SVGSVGElement, e: RPointerEvent): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const m = svg.getScreenCTM();
  const p = m ? pt.matrixTransform(m.inverse()) : pt;
  return { x: Math.max(0, Math.min(100, p.x)), y: Math.max(0, Math.min(100, p.y)) };
}

function Board({ diagram, commit }: { diagram: Diagram; commit: (d: Diagram) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState(diagram);
  const [tool, setTool] = useState<Tool>("move");
  const drag = useRef<{ id: string } | null>(null);
  const [arrow, setArrow] = useState<DiagramArrow | null>(null);

  useEffect(() => setDraft(diagram), [diagram]);

  const down = (e: RPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const p = toSvg(svg, e);
    if (tool === "runner" || tool === "ball") {
      const count = draft.markers.filter((m) => m.kind === "runner").length;
      commit({ ...draft, markers: [...draft.markers, { id: uid(), kind: tool, label: tool === "runner" ? `R${count + 1}` : "", ...p }] });
      return;
    }
    if (tool === "throw" || tool === "run") {
      svg.setPointerCapture(e.pointerId);
      setArrow({ id: uid(), kind: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    }
  };
  const moveEv = (e: RPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const p = toSvg(svg, e);
    if (drag.current) {
      const id = drag.current.id;
      setDraft((d) => ({ ...d, markers: d.markers.map((m) => (m.id === id ? { ...m, ...p } : m)) }));
    } else if (arrow) setArrow({ ...arrow, x2: p.x, y2: p.y });
  };
  const up = () => {
    if (drag.current) {
      drag.current = null;
      commit(draft);
    }
    if (arrow) {
      if (Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1) > 3) commit({ ...draft, arrows: [...draft.arrows, arrow] });
      setArrow(null);
    }
  };
  const markerDown = (id: string) => (e: RPointerEvent) => {
    if (tool === "erase") {
      e.stopPropagation();
      commit({ ...draft, markers: draft.markers.filter((m) => m.id !== id) });
      return;
    }
    if (tool !== "move") return;
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    drag.current = { id };
  };

  const arrows = arrow ? [...draft.arrows, arrow] : draft.arrows;
  return (
    <div>
      <div role="toolbar" aria-label="Board tools" className="no-scrollbar -mx-4 mb-2 flex gap-1 overflow-x-auto px-4">
        {TOOLS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tool === t.key} onClick={() => setTool(t.key)}
            className={cx("flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold", tool === t.key ? "border-clay bg-clay text-clay-ink" : "border-line text-chalk-dim")}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
        <button type="button" onClick={() => commit({ ...draft, arrows: draft.arrows.slice(0, -1) })} disabled={!draft.arrows.length}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-bold text-chalk-dim">
          <RotateCcw size={14} /> Undo arrow
        </button>
      </div>
      <div className="mx-auto max-w-[560px] overflow-hidden rounded-xl border border-line">
        <Field
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
            <marker id="ah-throw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f1ede2" /></marker>
            <marker id="ah-run" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#d9824b" /></marker>
          </defs>
          {arrows.map((a) => (
            <line
              key={a.id} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
              stroke={a.kind === "throw" ? "#f1ede2" : "#d9824b"} strokeWidth={0.9}
              strokeDasharray={a.kind === "run" ? "2 1.5" : undefined} markerEnd={`url(#ah-${a.kind})`}
              onPointerDown={(e) => {
                if (tool !== "erase") return;
                e.stopPropagation();
                commit({ ...draft, arrows: draft.arrows.filter((x) => x.id !== a.id) });
              }}
              className={tool === "erase" ? "cursor-pointer" : undefined}
              style={{ pointerEvents: tool === "erase" ? "stroke" : "none" }}
            />
          ))}
          {draft.markers.map((m) => (
            <g key={m.id} onPointerDown={markerDown(m.id)} className={tool === "move" ? "cursor-grab" : tool === "erase" ? "cursor-pointer" : undefined}>
              {m.kind === "ball" ? (
                <circle cx={m.x} cy={m.y} r={1.6} fill="#fff" stroke="#d0413a" strokeWidth={0.4} />
              ) : (
                <>
                  <circle cx={m.x} cy={m.y} r={3.6} fill={m.kind === "fielder" ? "#10231a" : "#d0413a"} stroke="#f1ede2" strokeWidth={0.5} />
                  <text x={m.x} y={m.y + 1.2} textAnchor="middle" fontSize={3.2} fontWeight={700} fill="#f1ede2" fontFamily="Inter, sans-serif">{m.label}</text>
                </>
              )}
            </g>
          ))}
        </Field>
      </div>
    </div>
  );
}

export function DiamondBoardTab() {
  const diagrams = useNotepad((s) => s.diagrams);
  const activeId = useNotepad((s) => s.activeDiagramId);
  const set = useNotepad((s) => s.set);
  const diagram = diagrams.find((d) => d.id === activeId) ?? diagrams[0];

  const add = () => {
    const d = defaultDiagram(`Play ${diagrams.length + 1}`);
    set("diagrams", (ds) => [...ds, d]);
    set("activeDiagramId", d.id);
  };
  const commit = (d: Diagram) => set("diagrams", (ds) => ds.map((x) => (x.id === d.id ? d : x)));

  return (
    <Panel icon={MapIcon} title="Diamond Board" subtitle="Draw cutoffs, bunt coverage, and first-and-third calls"
      action={<IconBtn label="New play" onClick={add}><Plus size={15} /></IconBtn>}>
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
            <TextInput value={diagram.name} onChange={(v) => commit({ ...diagram, name: v })} ariaLabel="Play name" />
            <IconBtn label="Reset positions" onClick={() => confirm("Reset this play to standard positions?") && commit({ ...defaultDiagram(diagram.name), id: diagram.id })}>
              <RotateCcw size={14} />
            </IconBtn>
            {diagrams.length > 1 && (
              <IconBtn danger label="Delete play" onClick={() => {
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
