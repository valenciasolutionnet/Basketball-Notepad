import { forwardRef, type ReactNode, type SVGProps } from "react";
import { BASE_XY } from "../lib/diamond";

/** Baseball field backdrop in a 100×100 viewBox. Children render on top. */
export const Field = forwardRef<SVGSVGElement, { children?: ReactNode } & SVGProps<SVGSVGElement>>(function Field({ children, ...svg }, ref) {
  const { home, first, second, third } = BASE_XY;
  const base = (x: number, y: number, k: string) => (
    <rect key={k} x={x - 1.8} y={y - 1.8} width={3.6} height={3.6} fill="#f1ede2" transform={`rotate(45 ${x} ${y})`} />
  );
  return (
    <svg ref={ref} viewBox="0 0 100 100" {...svg}>
      <defs>
        <radialGradient id="grass" cx="50%" cy="86%" r="90%">
          <stop offset="0%" stopColor="#2f6b45" />
          <stop offset="100%" stopColor="#1d4a30" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="#10231a" />
      {/* outfield fan */}
      <path d="M50 86 L-2 34 A74 74 0 0 1 102 34 Z" fill="url(#grass)" />
      <path d="M-2 34 A74 74 0 0 1 102 34" fill="none" stroke="#e8e0c8" strokeOpacity="0.35" strokeWidth="0.8" />
      {/* infield dirt */}
      <path d="M50 86 L25 61 A36 36 0 0 1 75 61 Z" fill="#b8784b" />
      <path d={`M${home.x} ${home.y} L${first.x} ${first.y} L${second.x} ${second.y} L${third.x} ${third.y} Z`} fill="#2f6b45" />
      <circle cx="50" cy="93" r="6.5" fill="#b8784b" />
      <circle cx="50" cy="69" r="3" fill="#b8784b" />
      <rect x="49" y="68.6" width="2" height="0.7" fill="#f1ede2" />
      {/* foul lines */}
      <line x1="50" y1="86" x2="-2" y2="34" stroke="#f1ede2" strokeWidth="0.5" />
      <line x1="50" y1="86" x2="102" y2="34" stroke="#f1ede2" strokeWidth="0.5" />
      {base(first.x, first.y, "1")}
      {base(second.x, second.y, "2")}
      {base(third.x, third.y, "3")}
      <path d={`M${home.x - 1.8} ${home.y - 1} h3.6 v1.6 l-1.8 1.6 l-1.8 -1.6 Z`} fill="#f1ede2" />
      {children}
    </svg>
  );
});
