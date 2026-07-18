import { computeImpact, severityFor } from '../impact';

describe('computeImpact', () => {
  it('computes energy, Hiroshima equivalents, and crater for a known input', () => {
    const r = computeImpact(100, 72000); // 100 m at 20 km/s
    expect(r.energyMt).toBeCloseTo(75.09, 1);
    expect(Math.round(r.hiroshimas)).toBe(5006);
    expect(r.craterKm).toBeCloseTo(2.645, 2);
    expect(r.severity).toBe('impact.sevCity');
  });
  it('scales up for a large fast body', () => {
    const r = computeImpact(747.5, 66790);
    expect(Math.round(r.energyMt)).toBe(26987);
    expect(r.severity).toBe('impact.sevContinental');
  });
});

describe('severityFor', () => {
  it('maps energy to a severity catalog key', () => {
    expect(severityFor(0.0005)).toBe('impact.sevAirburst');
    expect(severityFor(0.5)).toBe('impact.sevTown');
    expect(severityFor(50)).toBe('impact.sevCity');
    expect(severityFor(5000)).toBe('impact.sevRegional');
    expect(severityFor(500000)).toBe('impact.sevContinental');
    expect(severityFor(5000000)).toBe('impact.sevExtinction');
  });
});
