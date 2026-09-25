import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";
import { activeTeam, createTeam, deleteTeam, listTeams, renameTeam, switchTeam, type Team } from "../lib/teams";
import { cx } from "./ui";

/** Header dropdown for switching between teams (swappable save-slots of the whole app state). */
export function TeamSwitcher() {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>(() => listTeams().teams);
  const [activeId, setActiveId] = useState(() => listTeams().activeTeamId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const refresh = () => {
    const idx = listTeams();
    setTeams(idx.teams);
    setActiveId(idx.activeTeamId);
  };

  const switchTo = (id: string) => {
    if (id === activeId) return;
    switchTeam(id);
    location.reload();
  };

  const addTeam = () => {
    const name = prompt("New team's name?")?.trim();
    if (!name) return;
    const team = createTeam(name);
    switchTeam(team.id);
    location.reload();
  };

  const rename = (t: Team) => {
    const name = prompt("Rename team", t.name)?.trim();
    if (!name || name === t.name) return;
    renameTeam(t.id, name);
    refresh();
  };

  const remove = (t: Team) => {
    if (teams.length <= 1) return;
    if (!confirm(`Delete "${t.name}"? This removes all of its saved data.`)) return;
    const wasActive = t.id === activeId;
    deleteTeam(t.id);
    if (wasActive) location.reload();
    else refresh();
  };

  const current = activeTeam();

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch team"
        className="flex max-w-32 items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-chalk-dim hover:bg-turf-700 hover:text-chalk"
      >
        <Shuffle size={14} />
        <span className="truncate">{current.name}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-line bg-turf-800 p-1.5 shadow-lg">
          <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {teams.map((t) => (
              <li key={t.id} className={cx("flex items-center gap-1 rounded-md px-2 py-1.5", t.id === activeId && "bg-turf-700")}>
                <button type="button" onClick={() => switchTo(t.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px]">
                  <span className="flex size-4 shrink-0 items-center justify-center">{t.id === activeId && <Check size={14} className="text-clay" />}</span>
                  <span className="truncate">{t.name}</span>
                </button>
                <button type="button" aria-label={`Rename ${t.name}`} title="Rename" onClick={() => rename(t)} className="rounded p-1 text-chalk-dim hover:text-chalk">
                  <Pencil size={13} />
                </button>
                {teams.length > 1 && (
                  <button type="button" aria-label={`Delete ${t.name}`} title="Delete" onClick={() => remove(t)} className="rounded p-1 text-chalk-dim hover:text-stitch">
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button type="button" onClick={addTeam} className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-semibold text-clay hover:bg-turf-700">
            <Plus size={14} /> New team
          </button>
        </div>
      )}
    </div>
  );
}
