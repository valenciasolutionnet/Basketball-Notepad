import { useState, type ReactNode } from "react";
import { Plus, Trash2, Check, type LucideIcon } from "lucide-react";
import type { CheckItem } from "../lib/types";
import { uid } from "../lib/id";

type Icon = LucideIcon;

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

export function Panel({ title, subtitle, icon: I, action, children }: {
  title: string; subtitle?: string; icon: Icon; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-turf-800 p-4 pb-5">
      <header className="mb-4 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-turf-600">
          <I size={17} className="text-clay" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl uppercase tracking-wide text-chalk">{title}</h2>
          {subtitle && <p className="text-[12.5px] text-chalk-dim">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-grass">{children}</h3>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-[13px] italic text-chalk-dim/70">{children}</p>;
}

export function Button({ children, onClick, variant = "primary", className, disabled, type = "button", title }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger"; className?: string;
  disabled?: boolean; type?: "button" | "submit"; title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-bold transition active:scale-[0.97]",
        variant === "primary" && "bg-clay text-clay-ink hover:bg-clay-dim",
        variant === "ghost" && "border border-line text-chalk-dim hover:bg-turf-700 hover:text-chalk",
        variant === "danger" && "border border-stitch/60 text-stitch hover:bg-stitch/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconBtn({ onClick, label, children, danger }: { onClick: () => void; label: string; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border border-line hover:bg-turf-700",
        danger ? "text-stitch" : "text-chalk-dim",
      )}
    >
      {children}
    </button>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-turf-950 px-3 py-2.5 text-[14px] text-chalk placeholder:text-chalk-dim/50 outline-none focus:border-clay";

export function TextInput({ value, onChange, placeholder, onEnter, className, type = "text", ariaLabel }: {
  value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void; className?: string;
  type?: string; ariaLabel?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      aria-label={ariaLabel ?? placeholder}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      className={cx(inputCls, className)}
    />
  );
}

export function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <label className="mb-4 block">
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-grass">{label}</span>}
      <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, "resize-y")} />
    </label>
  );
}

export function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  const submit = () => {
    if (!v.trim()) return;
    onAdd(v.trim());
    setV("");
  };
  return (
    <div className="mb-3 flex gap-2">
      <TextInput value={v} onChange={setV} placeholder={placeholder} onEnter={submit} />
      <Button onClick={submit}>
        <Plus size={15} strokeWidth={3} /> Add
      </Button>
    </div>
  );
}

export function Checklist({ items, setItems, placeholder, empty }: {
  items: CheckItem[]; setItems: (fn: (prev: CheckItem[]) => CheckItem[]) => void; placeholder: string; empty: string;
}) {
  return (
    <div>
      <AddRow placeholder={placeholder} onAdd={(text) => setItems((xs) => [...xs, { id: uid(), text, done: false }])} />
      {items.length === 0 && <Empty>{empty}</Empty>}
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-turf-950 px-2.5 py-1.5">
            <button
              type="button"
              aria-label={i.done ? "Mark not done" : "Mark done"}
              onClick={() => setItems((xs) => xs.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))}
              className={cx(
                "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                i.done ? "border-grass bg-grass text-turf-950" : "border-chalk-dim",
              )}
            >
              {i.done && <Check size={14} strokeWidth={3.5} />}
            </button>
            <span className={cx("flex-1 text-[14px]", i.done && "text-chalk-dim/60 line-through")}>{i.text}</span>
            <IconBtn danger label="Delete" onClick={() => setItems((xs) => xs.filter((x) => x.id !== i.id))}>
              <Trash2 size={14} />
            </IconBtn>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Rating({ label, description, value, onChange }: {
  label: string; description: string; value: number; onChange: (n: number) => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[14px] font-semibold">{label}</span>
        <span className="font-mono text-xl font-bold text-clay">{value}</span>
      </div>
      <p className="mb-2 text-[12px] text-chalk-dim">{description}</p>
      <input type="range" min={1} max={5} step={1} value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} className="np-slider" />
    </div>
  );
}

export function Pill({ active, onClick, icon: I, label }: { active: boolean; onClick: () => void; icon: Icon; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition",
        active ? "border-clay bg-clay text-clay-ink" : "border-line text-chalk-dim hover:text-chalk",
      )}
    >
      <I size={14} strokeWidth={2.5} />
      {label}
    </button>
  );
}

export function Tabs<K extends string>({ tabs, active, onChange }: {
  tabs: { key: K; label: string; icon: Icon }[]; active: K; onChange: (k: K) => void;
}) {
  return (
    <div className="no-scrollbar no-print -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
      {tabs.map((t) => (
        <Pill key={t.key} active={active === t.key} onClick={() => onChange(t.key)} icon={t.icon} label={t.label} />
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-lg border border-line p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("min-h-8 rounded-md px-2.5 text-xs font-bold", value === o.value ? "bg-turf-600 text-chalk" : "text-chalk-dim")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
