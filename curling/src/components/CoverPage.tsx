import { ClipboardList, Zap, Radio, Award, ArrowUpRight, type LucideIcon } from "lucide-react";

// Matches the shared Valencia Solution notepad cover (Basketball Notepad):
// same palette, type scale, icon tiles, button, and footer.
const COVER = {
  bg: "#131F19",
  tile: "#2C4234",
  amber: "#E0872C",
  amberInk: "#241505",
  chalk: "#EDEAE0",
  chalkDim: "#AAB8A6",
  chalkFaint: "rgba(237,234,224,0.45)",
};

const PHASES: { icon: LucideIcon; label: string }[] = [
  { icon: ClipboardList, label: "Plan" },
  { icon: Zap, label: "Deliver" },
  { icon: Radio, label: "Game" },
  { icon: Award, label: "Review" },
];

/** Faint curling-sheet linework behind the cover, like the court lines on Basketball Notepad. */
function SheetLines() {
  const s = { fill: "none", stroke: COVER.chalk, strokeWidth: 2 } as const;
  return (
    <svg
      viewBox="0 0 500 460"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[590px] w-[640px] -translate-x-1/2 -translate-y-1/2"
      style={{ opacity: 0.055 }}
    >
      {/* side lines */}
      <line x1="130" y1="0" x2="130" y2="460" {...s} />
      <line x1="370" y1="0" x2="370" y2="460" {...s} />
      {/* hog line */}
      <line x1="130" y1="40" x2="370" y2="40" {...s} strokeWidth={4} />
      {/* house: 12 ft, 8 ft, 4 ft, button */}
      {[96, 64, 32, 8].map((r) => (
        <circle key={r} cx="250" cy="250" r={r} {...s} />
      ))}
      {/* centre, tee, and back lines */}
      <line x1="250" y1="0" x2="250" y2="440" {...s} />
      <line x1="130" y1="250" x2="370" y2="250" {...s} />
      <line x1="130" y1="346" x2="370" y2="346" {...s} />
      {/* hacks */}
      <rect x="226" y="432" width="16" height="10" rx="3" {...s} />
      <rect x="258" y="432" width="16" height="10" rx="3" {...s} />
    </svg>
  );
}

export function CoverPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex min-h-dvh justify-center" style={{ background: COVER.bg }}>
      <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
        <SheetLines />

        <div className="cover-ball relative z-[1] mb-5">
          <svg width="84" height="84" viewBox="0 0 40 40" role="img" aria-label="Curling stone">
            <text x="20" y="20" fontSize="36" textAnchor="middle" dominantBaseline="central">
              🥌
            </text>
          </svg>
        </div>

        <p
          className="cover-fade-1 relative z-[1] mb-2.5 mt-0 font-mono uppercase"
          style={{ fontSize: 21.9, color: COVER.amber, letterSpacing: "0.18em" }}
        >
          Coach's Toolkit
        </p>

        <h1
          className="cover-fade-2 relative z-[1] mb-[26px] mt-0 font-display uppercase"
          style={{ fontSize: "clamp(46px, 12vw, 60px)", color: COVER.chalk, letterSpacing: "0.02em", lineHeight: 1.04 }}
        >
          Curling
          <br />
          Notepad
        </h1>

        <div className="cover-fade-3 relative z-[1] mb-[34px] flex flex-wrap justify-center gap-[18px]">
          {PHASES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex w-[60px] flex-col items-center gap-1.5">
              <div className="flex size-10 items-center justify-center rounded-[10px]" style={{ background: COVER.tile }}>
                <Icon size={18} color={COVER.amber} strokeWidth={2.25} />
              </div>
              <span className="font-sans font-semibold" style={{ fontSize: 21, color: COVER.chalkDim }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="cover-enter-btn relative z-[1] flex items-center gap-2 rounded-[10px] border-none px-[38px] py-4 font-sans font-bold"
          style={{ background: COVER.amber, color: COVER.amberInk, fontSize: 23.9 }}
        >
          Enter Notepad <ArrowUpRight size={18} strokeWidth={2.5} />
        </button>

        <p
          className="relative z-[1] mb-0 mt-10 text-center font-sans"
          style={{ fontSize: 20, color: COVER.chalkFaint, letterSpacing: "0.03em" }}
        >
          © 2026 Valenciasolution.net™ · All rights reserved
        </p>
      </div>
    </div>
  );
}
