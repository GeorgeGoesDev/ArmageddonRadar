import { Asteroid } from '../types/neo';

export type SortKey = 'closest' | 'largest' | 'fastest';

export interface ListControls {
  search: string;
  sort: SortKey;
  hazardousOnly: boolean;
  minDiameterM: number;
  maxLunar: number;
}

export const DEFAULT_CONTROLS: ListControls = {
  search: '',
  sort: 'closest',
  hazardousOnly: false,
  minDiameterM: 0,
  maxLunar: Infinity,
};

const SORTERS: Record<SortKey, (a: Asteroid, b: Asteroid) => number> = {
  closest: (a, b) => a.missLunar - b.missLunar,
  largest: (a, b) => b.diameterAvgM - a.diameterAvgM,
  fastest: (a, b) => b.velocityKph - a.velocityKph,
};

/** Search → filter → sort. Pure; returns a new array. */
export function applyListControls(asteroids: Asteroid[], c: ListControls): Asteroid[] {
  const q = c.search.trim().toLowerCase();
  return asteroids
    .filter((a) => (q ? a.displayName.toLowerCase().includes(q) : true))
    .filter((a) => (c.hazardousOnly ? a.hazardous : true))
    .filter((a) => a.diameterAvgM >= c.minDiameterM)
    .filter((a) => a.missLunar <= c.maxLunar)
    .sort(SORTERS[c.sort]);
}

/** Number of non-search filters currently narrowing the list (for a badge). */
export function activeFilterCount(c: ListControls): number {
  let n = 0;
  if (c.hazardousOnly) n++;
  if (c.minDiameterM > 0) n++;
  if (Number.isFinite(c.maxLunar)) n++;
  return n;
}
