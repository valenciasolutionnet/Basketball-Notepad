import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, KeyRound, Loader2, Send, ShoppingCart, Copy, Check } from "lucide-react";
import {
  AccessError, accessApi, gateEnabled, paymentLink, saveCode, saveRequest, storedCode, storedRequest,
} from "../lib/access";
import { cx } from "./ui";

type State =
  | { kind: "checking" }
  | { kind: "open" }
  | { kind: "locked"; error?: string }
  | { kind: "pending"; id: string; error?: string }
  | { kind: "welcome"; code: string; via: "purchase" | "approval" };

const input = "min-h-11 w-full rounded-lg border border-line bg-turf-950 px-3 text-[15px] text-chalk placeholder:text-chalk-dim/60";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-[#131F19] px-5 py-10">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-3 text-[56px] leading-none" aria-hidden="true">⚾</div>
        <p className="mb-1.5 font-mono text-sm uppercase tracking-[0.18em] text-[#E0872C]">Coach's Toolkit</p>
        <h1 className="mb-6 font-display text-[40px] uppercase leading-none text-[#EDEAE0]">Baseball Notepad</h1>
        {children}
        <p className="mt-10 text-xs text-[rgba(237,234,224,0.45)]">© 2026 Valenciasolution.net™ · All rights reserved</p>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3 w-full rounded-xl border border-line bg-turf-800 p-4 text-left">
      <h2 className="mb-3 font-display text-lg uppercase tracking-wide text-chalk">{title}</h2>
      {children}
    </section>
  );
}

function Primary({ children, disabled, type = "submit", onClick }: { children: ReactNode; disabled?: boolean; type?: "submit" | "button"; onClick?: () => void }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E0872C] px-4 font-bold text-[#241505] transition active:scale-[0.98]">
      {children}
    </button>
  );
}

function Welcome({ code, via, onEnter }: { code: string; via: "purchase" | "approval"; onEnter: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card title={via === "purchase" ? "Thanks for your purchase" : "You're approved"}>
      <p className="mb-3 text-sm text-chalk-dim">This is your access code. Keep it to open the notepad on your other devices.</p>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-turf-950 p-3">
        <code className="flex-1 font-mono text-lg tracking-widest text-chalk">{code}</code>
        <button type="button" aria-label="Copy access code" className="rounded-md p-2 text-chalk-dim hover:bg-turf-700"
          onClick={() => void navigator.clipboard?.writeText(code).then(() => setCopied(true))}>
          {copied ? <Check size={16} className="text-grass" /> : <Copy size={16} />}
        </button>
      </div>
      <Primary type="button" onClick={onEnter}>Enter Notepad <ArrowUpRight size={18} /></Primary>
    </Card>
  );
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => (gateEnabled() ? { kind: "checking" } : { kind: "open" }));
  const [busy, setBusy] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", team: "", note: "" });
  const [founding, setFounding] = useState<{ cap: number; left: number } | null>(null);

  const locked = state.kind === "locked";
  useEffect(() => {
    if (!locked) return;
    accessApi<{ cap: number; left: number }>({ action: "founding" }).then(setFounding, () => setFounding(null));
  }, [locked]);

  const checkRequest = useCallback(async (id: string): Promise<State> => {
    try {
      const r = await accessApi<{ status: string; code?: string }>({ action: "status", id });
      if (r.status === "approved" && r.code) {
        saveCode(r.code);
        saveRequest(null);
        return { kind: "welcome", code: r.code, via: "approval" };
      }
      if (r.status === "rejected") {
        saveRequest(null);
        return { kind: "locked", error: "Your access request wasn't approved. Contact Valencia Solution if you think this is a mistake." };
      }
      return { kind: "pending", id };
    } catch (e) {
      if (e instanceof AccessError && e.status === 404) {
        saveRequest(null);
        return { kind: "locked" };
      }
      return { kind: "pending", id, error: e instanceof Error ? e.message : undefined };
    }
  }, []);

  useEffect(() => {
    if (state.kind !== "checking") return;
    let cancelled = false;
    const done = (s: State) => !cancelled && setState(s);

    void (async () => {
      const url = new URL(location.href);
      const sessionId = url.searchParams.get("session_id");
      if (sessionId) {
        url.searchParams.delete("session_id");
        history.replaceState(null, "", url.pathname + url.search + url.hash);
        try {
          const { code } = await accessApi<{ code: string }>({ action: "checkout", sessionId });
          saveCode(code);
          return done({ kind: "welcome", code, via: "purchase" });
        } catch (e) {
          return done({ kind: "locked", error: e instanceof Error ? e.message : "Couldn't confirm your purchase." });
        }
      }

      const code = storedCode();
      if (code) {
        try {
          await accessApi({ action: "verify", code });
          return done({ kind: "open" });
        } catch (e) {
          // Offline or server trouble: a coach at the field keeps working.
          if (e instanceof AccessError && (e.status === 0 || e.status >= 500)) return done({ kind: "open" });
          saveCode(null);
          return done({ kind: "locked", error: e instanceof Error ? e.message : undefined });
        }
      }

      const req = storedRequest();
      if (req) return done(await checkRequest(req));
      done({ kind: "locked" });
    })();
    return () => {
      cancelled = true;
    };
  }, [state.kind, checkRequest]);

  // Waiting on approval: check back every 30 seconds while the page is open.
  useEffect(() => {
    if (state.kind !== "pending") return;
    const id = state.id;
    const t = setInterval(() => void checkRequest(id).then((s) => s.kind !== "pending" && setState(s)), 30_000);
    return () => clearInterval(t);
  }, [state, checkRequest]);

  if (state.kind === "open") return <>{children}</>;
  if (state.kind === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#131F19] text-chalk-dim">
        <Loader2 className="animate-spin" aria-label="Checking access" />
      </div>
    );
  }
  if (state.kind === "welcome") {
    return <Shell><Welcome code={state.code} via={state.via} onEnter={() => setState({ kind: "open" })} /></Shell>;
  }

  if (state.kind === "pending") {
    return (
      <Shell>
        <Card title="Request received">
          <p className="mb-3 text-sm text-chalk-dim">
            Valencia Solution is verifying your registration. This page opens the notepad as soon as you're approved.
          </p>
          {state.error && <p className="mb-3 text-sm text-stitch">{state.error}</p>}
          <Primary type="button" disabled={busy} onClick={async () => {
            setBusy(true);
            setState(await checkRequest(state.id));
            setBusy(false);
          }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Check now"}
          </Primary>
        </Card>
        <button type="button" className="text-sm text-chalk-dim underline" onClick={() => setState({ kind: "locked" })}>I have an access code</button>
      </Shell>
    );
  }

  const redeem = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { code } = await accessApi<{ code: string }>({ action: "verify", code: codeInput });
      saveCode(code);
      setState({ kind: "open" });
    } catch (err) {
      setState({ kind: "locked", error: err instanceof Error ? err.message : "Couldn't check that code." });
    }
    setBusy(false);
  };

  const register = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { id } = await accessApi<{ id: string }>({ action: "register", ...form });
      saveRequest(id);
      setState({ kind: "pending", id });
    } catch (err) {
      setState({ kind: "locked", error: err instanceof Error ? err.message : "Couldn't send your request." });
    }
    setBusy(false);
  };

  return (
    <Shell>
      {state.error && <p role="alert" className="mb-3 w-full rounded-lg border border-stitch/60 bg-stitch/10 p-3 text-left text-sm text-chalk">{state.error}</p>}

      {paymentLink && (
        <Card title="Get Baseball Notepad">
          <p className="mb-3 text-sm text-chalk-dim">One-time purchase. You're in right after checkout.</p>
          {founding && founding.cap > 0 && (
            <p className="mb-3 text-sm font-semibold text-[#E0872C]">
              {founding.left > 0 ? `Founding coach: ${founding.left} of ${founding.cap} spots left` : "Founding spots are gone."}
            </p>
          )}
          <a href={paymentLink} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E0872C] px-4 font-bold text-[#241505]">
            <ShoppingCart size={17} /> Buy now
          </a>
        </Card>
      )}

      <Card title="I have an access code">
        <form onSubmit={redeem} className="flex flex-col gap-2">
          <input className={cx(input, "font-mono uppercase tracking-widest")} value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
            placeholder="XXXX-XXXX-XXXX" aria-label="Access code" autoComplete="off" autoCapitalize="characters" required />
          <Primary disabled={busy || !codeInput.trim()}><KeyRound size={16} /> Unlock</Primary>
        </form>
      </Card>

      <Card title="Request access">
        {!showRequest ? (
          <button type="button" onClick={() => setShowRequest(true)} className="text-sm font-semibold text-[#E0872C]">
            Register your team for approval →
          </button>
        ) : (
          <form onSubmit={register} className="flex flex-col gap-2">
            <input className={input} placeholder="Your name" aria-label="Your name" required maxLength={80}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={input} type="email" placeholder="Email" aria-label="Email" required maxLength={254}
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={input} placeholder="Team / club / league" aria-label="Team" maxLength={120}
              value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
            <textarea className={cx(input, "min-h-20 py-2")} placeholder="Anything we should know (optional)" aria-label="Note" maxLength={500}
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <Primary disabled={busy}><Send size={16} /> Send request</Primary>
          </form>
        )}
      </Card>
    </Shell>
  );
}
