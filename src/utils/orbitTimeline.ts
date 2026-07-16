import { ApproachEntry } from '../types/neoDetail';

export interface TimelinePoint {
  x: number;
  y: number;
  entry: ApproachEntry;
}

const PAD = 6;

/**
 * Maps approaches to plot coordinates: x by epoch (left = earliest), y by miss
 * distance on a log scale (closer = lower on screen = larger y).
 */
export function timelinePoints(approaches: ApproachEntry[], width: number, height: number): TimelinePoint[] {
  if (approaches.length === 0) return [];

  const epochs = approaches.map((a) => a.epochMs);
  const minE = Math.min(...epochs);
  const maxE = Math.max(...epochs);
  const eSpan = maxE - minE || 1;

  const logs = approaches.map((a) => Math.log10(Math.max(0.05, a.missLunar)));
  const minL = Math.min(...logs);
  const maxL = Math.max(...logs);
  const lSpan = maxL - minL || 1;

  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;

  return approaches.map((entry) => {
    const x = approaches.length === 1 ? width / 2 : PAD + ((entry.epochMs - minE) / eSpan) * innerW;
    const l = Math.log10(Math.max(0.05, entry.missLunar));
    // Larger distance → smaller y (higher up); closer → larger y (lower).
    const y = PAD + ((maxL - l) / lSpan) * innerH;
    return { x, y, entry };
  });
}
