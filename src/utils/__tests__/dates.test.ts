import { getApodDayKey } from '../dates';

describe('getApodDayKey', () => {
  it('is still the previous day one second before 05:00 UTC', () => {
    expect(getApodDayKey(new Date('2026-07-17T04:59:59Z'))).toBe('2026-07-16');
  });

  it('rolls to the new day at 05:00 UTC', () => {
    expect(getApodDayKey(new Date('2026-07-17T05:00:00Z'))).toBe('2026-07-17');
  });

  it('reads the current day during a CEST evening', () => {
    expect(getApodDayKey(new Date('2026-07-17T21:00:00+02:00'))).toBe('2026-07-17');
  });

  it('pins the reported bug: mid-afternoon CEST on 2026-07-17 is APOD day 2026-07-17', () => {
    expect(getApodDayKey(new Date('2026-07-17T15:32:00+02:00'))).toBe('2026-07-17');
  });
});
