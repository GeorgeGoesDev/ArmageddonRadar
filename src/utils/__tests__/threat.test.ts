import { getThreatLevel, DEFAULT_THRESHOLDS } from '../threat';

describe('getThreatLevel', () => {
  it('flags danger below dangerLD', () => {
    expect(getThreatLevel(0.5).zone).toBe('danger');
  });
  it('flags watch between danger and safe', () => {
    expect(getThreatLevel(3).zone).toBe('watch');
  });
  it('flags safe at/above safeLD', () => {
    expect(getThreatLevel(6).zone).toBe('safe');
  });
  it('respects custom thresholds', () => {
    expect(getThreatLevel(3, { dangerLD: 4, safeLD: 10 }).zone).toBe('danger');
    expect(getThreatLevel(3, DEFAULT_THRESHOLDS).zone).toBe('watch');
  });
  it('t is 1 at contact and 0 at/above safeLD', () => {
    expect(getThreatLevel(0).t).toBeCloseTo(1);
    expect(getThreatLevel(10).t).toBe(0);
  });
});
