import { applyListControls, DEFAULT_CONTROLS, activeFilterCount } from '../listControls';
import { Asteroid } from '../../types/neo';

const mk = (over: Partial<Asteroid>): Asteroid => ({
  id: '1', name: '(x)', displayName: 'x', hazardous: false,
  diameterMinM: 10, diameterMaxM: 20, diameterAvgM: 15,
  velocityKph: 1000, missLunar: 3, missKm: 1, missMiles: 1,
  approachEpochMs: 0, approachDateFull: '', ...over,
});

const a = mk({ id: 'a', displayName: 'Apophis', missLunar: 4, diameterAvgM: 300, velocityKph: 90000, hazardous: true });
const b = mk({ id: 'b', displayName: 'Bennu', missLunar: 1, diameterAvgM: 50, velocityKph: 20000 });
const c = mk({ id: 'c', displayName: 'Ceres bit', missLunar: 8, diameterAvgM: 900, velocityKph: 5000 });

describe('applyListControls', () => {
  const all = [a, b, c];
  it('sorts closest first by default', () => {
    expect(applyListControls(all, DEFAULT_CONTROLS).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('sorts farthest first', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sortField: 'distance', sortDir: 'desc' }).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('sorts largest / smallest', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sortField: 'size', sortDir: 'desc' }).map((x) => x.id)).toEqual(['c', 'a', 'b']);
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sortField: 'size', sortDir: 'asc' }).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('sorts fastest / slowest', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sortField: 'speed', sortDir: 'desc' }).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sortField: 'speed', sortDir: 'asc' }).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  it('sorts by name A–Z / Z–A', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sortField: 'name', sortDir: 'asc' }).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sortField: 'name', sortDir: 'desc' }).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  it('searches by name (case-insensitive)', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, search: 'ben' }).map((x) => x.id)).toEqual(['b']);
  });
  it('filters hazardous only', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, hazardousOnly: true }).map((x) => x.id)).toEqual(['a']);
  });
  it('filters by min diameter', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, minDiameterM: 100 }).map((x) => x.id)).toEqual(['a', 'c']);
  });
  it('filters by max lunar', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, maxLunar: 5 }).map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('activeFilterCount', () => {
  it('counts only active filters', () => {
    expect(activeFilterCount(DEFAULT_CONTROLS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_CONTROLS, hazardousOnly: true, minDiameterM: 100 })).toBe(2);
  });
});

import { SORT_OPTIONS } from '../listControls';
describe('SORT_OPTIONS', () => {
  it('offers 8 field+direction options with labels', () => {
    expect(SORT_OPTIONS).toHaveLength(8);
    expect(SORT_OPTIONS[0]).toEqual({ field: 'distance', dir: 'asc', label: 'Closest first' });
  });
});
