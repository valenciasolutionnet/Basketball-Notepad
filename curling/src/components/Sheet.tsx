import { forwardRef, type ReactNode, type SVGProps } from "react";
import { SHEET } from "../lib/sheet";

const RING_FILL = ["#2f5d8a", "#e9eef0", "#b53a33", "#e9eef0"] as const;

/** One end of a curling sheet in a 60×148 viewBox (4 units per foot). Children render on top. */
export const Sheet = forwardRef<SVGSVGElement, { children?: ReactNode } & SVGProps<SVGSVGElement>>(function Sheet({ children, ...svg }, ref) {
  const { w, h, hogY, teeY, backY, centreX, rings } = SHEET;
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} {...svg}>
      <defs>
        <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dfe8ec" />
          <stop offset="100%" stopColor="#eef3f5" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#ice)" />
      {rings.map((r, i) => (
        <circle key={r} cx={centreX} cy={teeY} r={r} fill={RING_FILL[i]} stroke="#9aa9b1" strokeWidth={0.15} />
      ))}
      {/* hog line */}
      <rect x={0} y={hogY - 0.5} width={w} height={1} fill="#b53a33" />
      {/* centre, tee, back lines */}
      <line x1={centreX} y1={0} x2={centreX} y2={h - 6} stroke="#3f4d55" strokeWidth={0.25} />
      <line x1={0} y1={teeY} x2={w} y2={teeY} stroke="#3f4d55" strokeWidth={0.25} />
      <line x1={0} y1={backY} x2={w} y2={backY} stroke="#3f4d55" strokeWidth={0.35} />
      {/* hacks */}
      <rect x={centreX - 3.2} y={h - 4} width={2.4} height={3} rx={0.6} fill="#3f4d55" />
      <rect x={centreX + 0.8} y={h - 4} width={2.4} height={3} rx={0.6} fill="#3f4d55" />
      {/* side boards */}
      <rect x={0.2} y={0.2} width={w - 0.4} height={h - 0.4} fill="none" stroke="#8a969c" strokeWidth={0.4} />
      <text x={1} y={hogY - 1.4} fontSize={2.2} fill="#6a7980" fontFamily="Inter, sans-serif">HOG</text>
      <text x={1} y={teeY - 0.8} fontSize={2.2} fill="#6a7980" fontFamily="Inter, sans-serif">TEE</text>
      <text x={1} y={backY - 0.8} fontSize={2.2} fill="#6a7980" fontFamily="Inter, sans-serif">BACK</text>
      {children}
    </svg>
  );
});

/** A stone seen from above: granite rim, coloured handle cap. */
export function Stone({ x, y, color, r = SHEET.stoneR }: { x: number; y: number; color: "red" | "yellow"; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#8c8f94" stroke="#4a4d52" strokeWidth={0.25} />
      <circle cx={x} cy={y} r={r * 0.68} fill={color === "red" ? "#d0413a" : "#e8c547"} />
      <rect x={x - r * 0.12} y={y - r * 0.55} width={r * 0.24} height={r * 0.9} rx={r * 0.1} fill={color === "red" ? "#8e2620" : "#9c7f1c"} />
    </g>
  );
}
