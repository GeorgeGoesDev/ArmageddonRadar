import { APOD_FRESH_MS, APOD_RECHECK_MS, apodStaleTime } from '../apodFreshness';

describe('apodStaleTime', () => {
  it('caches for a full day when the payload is the requested day', () => {
    expect(apodStaleTime('2026-07-17', '2026-07-17')).toBe(APOD_FRESH_MS);
  });

  // Regression: the exact shape of the reported bug — NASA's "latest" was still
  // yesterday's picture when we asked for today's. Pinning it for a day is what
  // made the banner stale until the next local midnight.
  it('rechecks soon when NASA returned an older day', () => {
    expect(apodStaleTime('2026-07-16', '2026-07-17')).toBe(APOD_RECHECK_MS);
  });

  it('rechecks soon when there is no data yet', () => {
    expect(apodStaleTime(undefined, '2026-07-17')).toBe(APOD_RECHECK_MS);
  });
});
