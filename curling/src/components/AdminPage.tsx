import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, Check, X, Ban, RotateCcw, Plus, Copy, RefreshCw, LogOut } from "lucide-react";
import { accessApi } from "../lib/access";
import { Button, Empty, Panel, SubHeading, cx } from "./ui";

interface Registration {
  id: string; name: string; email: string; team: string; note: string; created: number;
  status: "pending" | "approved" | "rejected"; code?: string;
}
interface License {
  code: string; email: string; name: string; source: "stripe" | "approved" | "granted"; created: number; revoked?: boolean;
}

const KEY = "curlingNotepad.adminKey";
const input = "min-h-10 w-full rounded-lg border border-line bg-turf-950 px-3 text-sm text-chalk placeholder:text-chalk-dim/60";
const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function readKey(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** Owner-only page (open with ?admin): approve registrations, hand out and revoke access codes. */
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(readKey);
  const [keyInput, setKeyInput] = useState("");
  const [regs, setRegs] = useState<Registration[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [grant, setGrant] = useState({ name: "", email: "" });
  const [lastGranted, setLastGranted] = useState<string | null>(null);

  const call = useCallback(async <T,>(body: Record<string, unknown>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      return await accessApi<T>(body, adminKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [adminKey]);

  const refresh = useCallback(async () => {
    const r = await call<{ registrations: Registration[]; licenses: License[] }>({ action: "admin:list" });
    if (r) {
      setRegs(r.registrations);
      setLicenses(r.licenses);
    }
  }, [call]);

  useEffect(() => {
    if (adminKey) void refresh();
  }, [adminKey, refresh]);

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    try {
      sessionStorage.setItem(KEY, keyInput);
    } catch {
      /* kept in memory only */
    }
    setAdminKey(keyInput);
  };
  const signOut = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
    setAdminKey("");
    setRegs([]);
    setLicenses([]);
  };

  const act = async (body: Record<string, unknown>) => {
    if (await call(body)) await refresh();
  };

  if (!adminKey) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <Panel icon={ShieldCheck} title="Access admin" subtitle="Curling Notepad">
          <form onSubmit={signIn} className="flex flex-col gap-2">
            <input className={input} type="password" placeholder="Admin key" aria-label="Admin key" autoComplete="current-password"
              value={keyInput} onChange={(e) => setKeyInput(e.target.value)} required />
            <Button type="submit">Sign in</Button>
          </form>
        </Panel>
      </main>
    );
  }

  const pending = regs.filter((r) => r.status === "pending");
  const decided = regs.filter((r) => r.status !== "pending");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Panel icon={ShieldCheck} title="Access admin" subtitle={`${pending.length} waiting · ${licenses.filter((l) => !l.revoked).length} active codes`}
        action={
          <div className="flex gap-1.5">
            <Button variant="ghost" onClick={() => void refresh()} disabled={busy} title="Refresh"><RefreshCw size={14} /></Button>
            <Button variant="ghost" onClick={signOut} title="Sign out"><LogOut size={14} /></Button>
          </div>
        }>
        {error && <p role="alert" className="mb-3 rounded-lg border border-stitch/60 bg-stitch/10 p-3 text-sm">{error}</p>}

        <SubHeading>Waiting for approval</SubHeading>
        {pending.length === 0 && <Empty>No pending requests.</Empty>}
        <ul className="flex flex-col gap-2">
          {pending.map((r) => (
            <li key={r.id} className="rounded-lg border border-line bg-turf-950 p-3">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <a className="text-sm text-clay" href={`mailto:${r.email}`}>{r.email}</a>
                  {r.team && <div className="text-sm text-chalk-dim">{r.team}</div>}
                  {r.note && <p className="mt-1 whitespace-pre-wrap text-sm text-chalk-dim">{r.note}</p>}
                  <div className="mt-1 text-[11px] text-chalk-dim/70">{when(r.created)}</div>
                </div>
                <div className="flex gap-1.5">
                  <Button disabled={busy} onClick={() => void act({ action: "admin:approve", id: r.id })}><Check size={14} /> Approve</Button>
                  <Button variant="danger" disabled={busy} onClick={() => confirm(`Reject ${r.name}?`) && void act({ action: "admin:reject", id: r.id })}><X size={14} /> Reject</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <SubHeading>Give someone a code</SubHeading>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => {
          e.preventDefault();
          const r = await call<{ license: License }>({ action: "admin:grant", ...grant });
          if (r) {
            setLastGranted(r.license.code);
            setGrant({ name: "", email: "" });
            await refresh();
          }
        }}>
          <input className={input} placeholder="Name" aria-label="Name" value={grant.name} onChange={(e) => setGrant({ ...grant, name: e.target.value })} />
          <input className={input} type="email" placeholder="Email (optional)" aria-label="Email" value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} />
          <Button type="submit" disabled={busy}><Plus size={14} /> Create code</Button>
        </form>
        {lastGranted && (
          <p className="mt-2 flex items-center gap-2 text-sm">
            New code: <code className="font-mono tracking-widest text-chalk">{lastGranted}</code>
            <button type="button" aria-label="Copy code" className="text-chalk-dim" onClick={() => void navigator.clipboard?.writeText(lastGranted)}><Copy size={14} /></button>
          </p>
        )}

        <SubHeading>Access codes</SubHeading>
        {licenses.length === 0 && <Empty>No codes issued yet.</Empty>}
        <ul className="flex flex-col gap-1.5">
          {licenses.map((l) => (
            <li key={l.code} className={cx("flex flex-wrap items-center gap-2 rounded-lg border border-line bg-turf-950 px-3 py-2", l.revoked && "opacity-50")}>
              <code className={cx("font-mono text-sm tracking-widest", l.revoked && "line-through")}>{l.code}</code>
              <span className="min-w-0 flex-1 truncate text-sm text-chalk-dim">{[l.name, l.email].filter(Boolean).join(" · ") || "—"}</span>
              <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase", l.source === "stripe" ? "bg-grass/20 text-grass" : "bg-turf-600 text-chalk-dim")}>
                {l.source === "stripe" ? "Paid" : l.source}
              </span>
              <span className="text-[11px] text-chalk-dim/70">{when(l.created)}</span>
              {l.revoked ? (
                <Button variant="ghost" disabled={busy} onClick={() => void act({ action: "admin:restore", code: l.code })}><RotateCcw size={13} /> Restore</Button>
              ) : (
                <Button variant="danger" disabled={busy} onClick={() => confirm(`Revoke ${l.code}? That coach loses access.`) && void act({ action: "admin:revoke", code: l.code })}><Ban size={13} /> Revoke</Button>
              )}
            </li>
          ))}
        </ul>

        {decided.length > 0 && (
          <>
            <SubHeading>Past requests</SubHeading>
            <ul className="flex flex-col gap-1 text-sm text-chalk-dim">
              {decided.map((r) => (
                <li key={r.id}>{r.status === "approved" ? "✓" : "✕"} {r.name} · {r.email}{r.code ? ` · ${r.code}` : ""}</li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </main>
  );
}
