import { mergeSettings, DEFAULT_SETTINGS, resolveApiKey } from '../settingsModel';

describe('mergeSettings', () => {
  it('returns defaults for empty/invalid input', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });
  it('keeps valid stored fields', () => {
    const s = mergeSettings({ distanceUnit: 'km', velocityUnit: 'mph', dangerLD: 2, safeLD: 8, apiKeyOverride: 'K' });
    expect(s).toEqual({ distanceUnit: 'km', velocityUnit: 'mph', dangerLD: 2, safeLD: 8, apiKeyOverride: 'K' });
  });
  it('rejects invalid unit values', () => {
    expect(mergeSettings({ distanceUnit: 'furlongs' }).distanceUnit).toBe('lunar');
  });
  it('enforces dangerLD < safeLD', () => {
    const s = mergeSettings({ dangerLD: 9, safeLD: 4 });
    expect(s.dangerLD).toBeLessThan(s.safeLD);
  });
});

describe('resolveApiKey', () => {
  it('uses override when present, else default', () => {
    expect(resolveApiKey({ ...DEFAULT_SETTINGS, apiKeyOverride: '  MYKEY ' })).toBe('MYKEY');
    expect(resolveApiKey({ ...DEFAULT_SETTINGS, apiKeyOverride: null })).toBeTruthy();
  });
});
