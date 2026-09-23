/** Random, collision-safe ids — items are shared across coaches' devices. */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 13);
  return Math.random().toString(36).slice(2, 15);
}
