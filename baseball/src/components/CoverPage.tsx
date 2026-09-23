import { ClipboardList, Zap, Radio, Award, Activity, ListOrdered, WifiOff, Users, ArrowRight, type LucideIcon } from "lucide-react";
import { useNotepad } from "../store";
import { Field } from "./Field";
import { POSITION_XY } from "../lib/diamond";
import { POSITIONS } from "../lib/types";

const PHASES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ClipboardList, title: "Plan", body: "Roster, attendance, lineups with fair defensive rotation, and pitch-count arm care." },
  { icon: Zap, title: "Deliver", body: "Timed practice plan, 24-drill library, and a diamond board for cutoffs and bunt coverage." },
  { icon: Radio, title: "Game", body: "Pitch-by-pitch scoring, bases, box score, and pitcher limits — shared live with your staff." },
  { icon: Award, title: "Review", body: "Rate the practice, capture notes, and watch season stats and trends build." },
];

const HIGHLIGHTS: { icon: LucideIcon; label: string }[] = [
  { icon: Activity, label: "Little League pitch limits & rest days" },
  { icon: ListOrdered, label: "Printable lineup cards" },
  { icon: Users, label: "Multi-coach live scoring" },
  { icon: WifiOff, label: "Works offline at the field" },
];

export function CoverPage({ onStart, onJoin }: { onStart: () => void; onJoin: () => void }) {
  const teamName = useNotepad((s) => s.teamName);
  const players = useNotepad((s) => s.players.length);
  const returning = players > 0;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-turf-950">
      {/* Field backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-3xl opacity-35 [mask-image:radial-gradient(ellipse_65%_60%_at_50%_30%,black_45%,transparent_100%)]">
        <Field className="w-full">
          {POSITIONS.map((p) => (
            <circle key={p} cx={POSITION_XY[p].x} cy={POSITION_XY[p].y} r={1.6} fill="#f1ede2" opacity={0.7} />
          ))}
        </Field>
      </div>

      <main className="relative mx-auto flex max-w-3xl flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-[calc(env(safe-area-inset-top)+40px)]">
        <div className="flex items-center gap-2.5">
          <svg width={40} height={40} viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="#F4F1E8" stroke="#8C8778" strokeWidth="2" />
            <path d="M14 10c8 7 10 16 10 22s-2 15-10 22M50 10c-8 7-10 16-10 22s2 15 10 22" fill="none" stroke="#C8322B" strokeWidth="2.5" strokeDasharray="3 3" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-chalk-dim">Valencia Solution</span>
        </div>

        <h1 className="mt-10 font-display text-6xl uppercase leading-[0.9] tracking-wide text-chalk sm:text-7xl">
          Baseball
          <br />
          <span className="text-clay">Notepad</span>
        </h1>
        <p className="mt-4 max-w-md text-[17px] leading-relaxed text-chalk-dim">
          The coach's clipboard for the whole season — plan practice, run the field, score the game, and protect every arm.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-clay px-7 text-base font-bold text-clay-ink shadow-lg shadow-clay/20 transition hover:bg-clay-dim active:scale-[0.98]"
          >
            {returning ? `Open ${teamName.trim() || "my team"}` : "Start coaching"} <ArrowRight size={18} strokeWidth={2.75} />
          </button>
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-line px-7 text-base font-bold text-chalk transition hover:bg-turf-800 active:scale-[0.98]"
          >
            <Radio size={17} /> Join a live game
          </button>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px] text-chalk-dim">
          {HIGHLIGHTS.map((h) => (
            <li key={h.label} className="flex items-start gap-2">
              <h.icon size={15} className="mt-0.5 shrink-0 text-grass" />
              {h.label}
            </li>
          ))}
        </ul>

        <section aria-label="How it works" className="mt-12 grid gap-3 sm:grid-cols-2">
          {PHASES.map((p, i) => (
            <div key={p.title} className="rounded-xl border border-line bg-turf-900/80 p-4 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs text-chalk-dim">0{i + 1}</span>
                <p.icon size={17} className="text-clay" />
                <h2 className="font-display text-lg uppercase tracking-wider">{p.title}</h2>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-chalk-dim">{p.body}</p>
            </div>
          ))}
        </section>

        <p className="mt-10 text-center text-[11.5px] text-chalk-dim/70">
          Your data stays on this device unless you share a live game. Add to your home screen for one-tap access at the field.
        </p>
      </main>
    </div>
  );
}
