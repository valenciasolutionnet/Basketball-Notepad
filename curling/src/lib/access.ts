// Client side of the access gate (see api/access.ts).

const CODE_KEY = "curlingNotepad.accessCode";
const REQUEST_KEY = "curlingNotepad.accessRequest";

/** Gate runs only on builds that opt in, and never on demo deployments. */
export function gateEnabled(): boolean {
  if (import.meta.env.VITE_ACCESS_GATE !== "on") return false;
  const host = location.hostname;
  return !host.includes("demo") && host !== "localhost" && host !== "127.0.0.1";
}

export const paymentLink: string | undefined = import.meta.env.VITE_STRIPE_PAYMENT_LINK || undefined;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the gate just asks again next visit */
  }
}

export const storedCode = () => read(CODE_KEY);
export const saveCode = (code: string | null) => write(CODE_KEY, code);
export const storedRequest = () => read(REQUEST_KEY);
export const saveRequest = (id: string | null) => write(REQUEST_KEY, id);

export class AccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function accessApi<T>(body: Record<string, unknown>, adminKey?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(adminKey ? { "x-admin-key": adminKey } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AccessError("You're offline.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new AccessError(data.error ?? `Request failed (${res.status}).`, res.status);
  return data;
}
