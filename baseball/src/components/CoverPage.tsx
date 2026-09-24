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

/** Faint diamond linework behind the cover, like the court lines on Basketball Notepad. */
function DiamondLines() {
  const s = { fill: "none", stroke: COVER.chalk, strokeWidth: 2 } as const;
  return (
    <svg
      viewBox="0 0 500 460"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[590px] w-[640px] -translate-x-1/2 -translate-y-1/2"
      style={{ opacity: 0.055 }}
    >
      {/* outfield wall */}
      <path d="M 30 250 A 300 300 0 0 1 470 250" {...s} />
      {/* foul lines */}
      <line x1="250" y1="430" x2="30" y2="210" {...s} />
      <line x1="250" y1="430" x2="470" y2="210" {...s} />
      {/* infield diamond + grass arc */}
      <path d="M 250 430 L 340 340 L 250 250 L 160 340 Z" {...s} />
      <path d="M 145 325 A 150 150 0 0 1 355 325" {...s} strokeDasharray="6 6" />
      {/* mound + home circle */}
      <circle cx="250" cy="340" r="14" {...s} />
      <circle cx="250" cy="430" r="26" {...s} />
      {/* bases */}
      {[
        [340, 340],
        [250, 250],
        [160, 340],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x! - 7} y={y! - 7} width="14" height="14" transform={`rotate(45 ${x} ${y})`} {...s} />
      ))}
    </svg>
  );
}

export function CoverPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex min-h-dvh justify-center" style={{ background: COVER.bg }}>
      <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
        <DiamondLines />

        <div className="cover-ball relative z-[1] mb-5">
          <svg width="84" height="84" viewBox="0 0 40 40" role="img" aria-label="Baseball">
            <text x="20" y="20" fontSize="36" textAnchor="middle" dominantBaseline="central">
              ⚾
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
          Baseball
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
