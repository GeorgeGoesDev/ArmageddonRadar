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
  it('sorts closest by default', () => {
    expect(applyListControls(all, DEFAULT_CONTROLS).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('sorts largest', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sort: 'largest' }).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('sorts fastest', () => {
    expect(applyListControls(all, { ...DEFAULT_CONTROLS, sort: 'fastest' }).map((x) => x.id)).toEqual(['a', 'b', 'c']);
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
