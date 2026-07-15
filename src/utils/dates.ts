/**
 * Returns a `YYYY-MM-DD` string in the device's *local* timezone.
 *
 * We deliberately avoid `toISOString()` here because that converts to UTC and
 * can hand back yesterday/tomorrow depending on the user's offset — the NeoWs
 * feed is keyed by calendar date, so a local key is what we want.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Human-friendly local time, e.g. "14:32". */
export function formatLocalTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Human-friendly local date + time, e.g. "15 Jul 2026, 14:32". */
export function formatLocalDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
