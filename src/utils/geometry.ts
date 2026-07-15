/** Small geometry helpers for the SVG gauge and radar components. */

export interface Point {
  x: number;
  y: number;
}

/**
 * Converts a polar coordinate to cartesian, using screen-friendly conventions:
 * 0° points east (right), 90° points up (top), 180° points west (left).
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad),
  };
}

/**
 * Builds an SVG arc path string sweeping from `startAngle` to `endAngle`
 * (degrees, same convention as `polarToCartesian`). Suitable for a stroked
 * open arc (no fill).
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  // Angles decrease going clockwise in screen space, so sweep flag is 1.
  const sweep = startAngle > endAngle ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

/** Deterministic 0–359° angle derived from a string id (stable across renders). */
export function angleFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 360;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
