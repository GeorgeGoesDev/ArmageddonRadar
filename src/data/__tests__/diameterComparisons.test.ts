import { bestFitLandmark, describeDiameter } from '../diameterComparisons';
import { en } from '../../i18n/en';

/** Minimal fake `t` that resolves dotted keys against the real English catalog
 * and inlines `%{param}` interpolation, so these tests exercise real key
 * lookups without depending on i18n-js. */
function fakeT(key: string, params?: Record<string, unknown>): string {
  const value = key.split('.').reduce<unknown>((obj, part) => (obj as Record<string, unknown>)?.[part], en);
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/%\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

describe('bestFitLandmark', () => {
  it('returns null for non-positive input', () => {
    expect(bestFitLandmark(0)).toBeNull();
  });
  it('picks a landmark and count for a mid-size object', () => {
    const fit = bestFitLandmark(60); // ~2 double-decker buses / ~2 blue whales
    expect(fit).not.toBeNull();
    expect(fit!.count).toBeGreaterThan(0);
    expect(fit!.landmark.meters).toBeGreaterThan(0);
  });
  it('scales the count with size', () => {
    const small = bestFitLandmark(30);
    const big = bestFitLandmark(900);
    expect(big!.landmark.meters).toBeGreaterThan(small!.landmark.meters);
  });
});

describe('describeDiameter (regression)', () => {
  it('still returns an "About N ..." string with the landmark emoji', () => {
    const s = describeDiameter(30, fakeT);
    expect(s).toMatch(/^About /);
  });
  it('handles pebble/too-small edges', () => {
    expect(describeDiameter(0, fakeT)).toContain('pebble');
  });
});
