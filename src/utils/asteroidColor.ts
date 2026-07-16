/**
 * A stable, distinct-ish identity colour per asteroid id (same id → same
 * colour). Fixed saturation/lightness tuned to read on the dark theme; only the
 * hue varies. Returns an `hsl(...)` string valid for RN styles and SVG fills.
 */
export function asteroidColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 62%)`;
}
