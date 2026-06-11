/**
 * localStorage helpers (JSON-encoded). Both swallow errors, so they are safe
 * when storage is disabled/full and during SSR (where `localStorage` is
 * undefined).
 */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / disabled storage / SSR */
  }
}
