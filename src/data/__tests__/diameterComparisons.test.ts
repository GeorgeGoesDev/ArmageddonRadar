import { bestFitLandmark, describeDiameter } from '../diameterComparisons';

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
    const s = describeDiameter(30);
    expect(s).toMatch(/^About /);
  });
  it('handles pebble/too-small edges', () => {
    expect(describeDiameter(0)).toContain('pebble');
  });
});
