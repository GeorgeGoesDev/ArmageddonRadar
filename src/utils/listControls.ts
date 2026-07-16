import { Asteroid } from '../types/neo';

export type SortField = 'distance' | 'size' | 'speed' | 'name';
export type SortDir = 'asc' | 'desc';

export interface ListControls {
  search: string;
  sortField: SortField;
  sortDir: SortDir;
  hazardousOnly: boolean;
  minDiameterM: number;
  maxLunar: number;
}

export const DEFAULT_CONTROLS: ListControls = {
  search: '',
  sortField: 'distance',
  sortDir: 'asc',
  hazardousOnly: false,
  minDiameterM: 0,
  maxLunar: Infinity,
};

export interface SortOption {
  field: SortField;
  dir: SortDir;
  label: string;
}

/** Curated field+direction options for the sort dropdown (webstore-style). */
export const SORT_OPTIONS: SortOption[] = [
  { field: 'distance', dir: 'asc', label: 'Closest first' },
  { field: 'distance', dir: 'desc', label: 'Farthest first' },
  { field: 'size', dir: 'desc', label: 'Largest first' },
  { field: 'size', dir: 'asc', label: 'Smallest first' },
  { field: 'speed', dir: 'desc', label: 'Fastest first' },
  { field: 'speed', dir: 'asc', label: 'Slowest first' },
  { field: 'name', dir: 'asc', label: 'Name A–Z' },
  { field: 'name', dir: 'desc', label: 'Name Z–A' },
];

const FIELD_VALUE: Record<SortField, (a: Asteroid) => number | string> = {
  distance: (a) => a.missLunar,
  size: (a) => a.diameterAvgM,
  speed: (a) => a.velocityKph,
  name: (a) => a.displayName.toLowerCase(),
};

function compareBy(a: Asteroid, b: Asteroid, field: SortField): number {
  const va = FIELD_VALUE[field](a);
  const vb = FIELD_VALUE[field](b);
  if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb);
  return (va as number) - (vb as number);
}

/** Search → filter → sort. Pure; returns a new array. */
export function applyListControls(asteroids: Asteroid[], c: ListControls): Asteroid[] {
  const q = c.search.trim().toLowerCase();
  return asteroids
    .filter((a) => (q ? a.displayName.toLowerCase().includes(q) : true))
    .filter((a) => (c.hazardousOnly ? a.hazardous : true))
    .filter((a) => a.diameterAvgM >= c.minDiameterM)
    .filter((a) => a.missLunar <= c.maxLunar)
    .sort((a, b) => {
      const base = compareBy(a, b, c.sortField);
      return c.sortDir === 'asc' ? base : -base;
    });
}

/** Number of non-search filters currently narrowing the list (for a badge). */
export function activeFilterCount(c: ListControls): number {
  let n = 0;
  if (c.hazardousOnly) n++;
  if (c.minDiameterM > 0) n++;
  if (Number.isFinite(c.maxLunar)) n++;
  return n;
}
