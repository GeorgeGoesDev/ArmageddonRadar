/** Parse a possibly-stringly-typed numeric value, falling back on non-finite input. */
export function parseNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}
