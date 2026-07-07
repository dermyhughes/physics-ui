const counters = new Map<string, number>();

/** A unique, per-kind id like "modal-3" (numbering restarts per kind). */
export function nextId(kind: string): string {
  const n = (counters.get(kind) ?? 0) + 1;
  counters.set(kind, n);
  return `${kind}-${n}`;
}
