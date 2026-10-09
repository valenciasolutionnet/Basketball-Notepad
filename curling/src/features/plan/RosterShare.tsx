// SPEC-034 — "Share roster link" on the Roster tab, and the "Add these
// players?" banner a coach sees after opening one.
import { useEffect, useState, type ReactNode } from "react";
import { Check, Link2, UserPlus, X } from "lucide-react";
import { newPlayer, useNotepad } from "../../store";
import { Button } from "../../components/ui";
import { buildRosterLink, clearSharedRoster, planRosterMerge, readSharedRoster, type SharedRoster } from "../../lib/rosterShare";

export function ShareRosterButton() {
  const players = useNotepad((s) => s.players);
  const teamName = useNotepad((s) => s.teamName);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const count = players.filter((p) => p.name.trim()).length;
  if (!count) return null;

  const share = async () => {
    const url = buildRosterLink(teamName, players);
    setLink("");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Roster", text: `Our roster (${count} players). Open to add them to your notepad:`, url });
        setMsg("");
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return; // coach closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Link copied. Paste it in a text or email to the other coach.");
    } catch {
      setLink(url);
      setMsg("Copy this link and send it to the other coach:");
    }
  };

  return (
    <div className="mb-4">
      <Button variant="ghost" onClick={share}>
        <Link2 size={15} strokeWidth={2.25} /> Share roster link
      </Button>
      <p className="mt-1.5 text-xs text-chalk-dim/70">Sends names and positions only. Anyone with the link can see them.</p>
      {msg && <p className="mt-2 text-[12.5px] text-grass">{msg}</p>}
      {link && (
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="mt-1.5 w-full rounded-md border border-line bg-turf-950 p-2 text-xs text-chalk"
        />
      )}
    </div>
  );
}

/** Shown when the page was opened from a roster link. `onAdded` lets the app jump to the Roster tab. */
export function SharedRosterBanner({ onAdded }: { onAdded?: () => void }) {
  const players = useNotepad((s) => s.players);
  const [shared, setShared] = useState<SharedRoster | null>(() => readSharedRoster());
  const [done, setDone] = useState("");

  // A link opened while the app is already up (pasted in the same tab).
  useEffect(() => {
    const onHash = () => setShared(readSharedRoster());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (done) {
    return (
      <Box>
        <span className="flex-1">{done}</span>
        <Button variant="ghost" onClick={() => setDone("")} title="Close"><X size={15} /></Button>
      </Box>
    );
  }
  if (!shared) return null;

  const close = () => { clearSharedRoster(); setShared(null); };

  if ("error" in shared) {
    return (
      <Box>
        <span className="flex-1">{shared.error}</span>
        <Button variant="ghost" onClick={close} title="Close"><X size={15} /></Button>
      </Box>
    );
  }

  const { toAdd, skipped } = planRosterMerge(players, shared.players);
  const n = shared.players.length;
  const preview = shared.players.slice(0, 6).map((p) => (p.positions.length ? `${p.name} (${p.positions.join("/")})` : p.name)).join(", ");
  const more = n > 6 ? ` and ${n - 6} more` : "";

  const add = () => {
    if (toAdd.length) {
      useNotepad.setState((s) => ({
        players: [...s.players, ...toAdd.map((p) => ({ ...newPlayer(p.name), positions: p.positions }))],
      }));
    }
    clearSharedRoster();
    setShared(null);
    setDone(
      toAdd.length
        ? `Added ${toAdd.length} player${toAdd.length === 1 ? "" : "s"} to your roster.${skipped ? ` ${skipped} ${skipped === 1 ? "was" : "were"} already on it.` : ""}`
        : "Everyone in that link is already on your roster.",
    );
    onAdded?.();
  };

  return (
    <Box>
      <div className="min-w-[200px] flex-1">
        <strong className="text-chalk">
          {shared.team ? `${shared.team} roster` : "Shared roster"}: {n} player{n === 1 ? "" : "s"}
        </strong>
        <div className="mt-0.5">{preview}{more}</div>
        {skipped > 0 && <div className="mt-0.5">{skipped} already on your roster will be skipped.</div>}
      </div>
      <div className="flex gap-2">
        <Button onClick={add}>
          {toAdd.length ? <UserPlus size={15} strokeWidth={2.25} /> : <Check size={15} strokeWidth={2.25} />}
          {toAdd.length ? `Add ${toAdd.length} player${toAdd.length === 1 ? "" : "s"}` : "OK"}
        </Button>
        <Button variant="ghost" onClick={close}>No thanks</Button>
      </div>
    </Box>
  );
}

function Box({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-clay bg-turf-800 px-3.5 py-3 text-[13px] text-chalk-dim">
      {children}
    </div>
  );
}
