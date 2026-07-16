import { mergeSettings, DEFAULT_SETTINGS, resolveApiKey } from '../settingsModel';

describe('mergeSettings', () => {
  it('returns defaults for empty/invalid input', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });
  it('keeps valid stored fields', () => {
    const s = mergeSettings({ distanceUnit: 'km', velocityUnit: 'mph', dangerLD: 2, safeLD: 8, apiKeyOverride: 'K' });
    expect(s).toEqual({ distanceUnit: 'km', velocityUnit: 'mph', dangerLD: 2, safeLD: 8, apiKeyOverride: 'K', hapticsEnabled: true, onboardingComplete: false, dailyDigestEnabled: true, digestHour: 9, smartAlertsEnabled: true });
  });
  it('rejects invalid unit values', () => {
    expect(mergeSettings({ distanceUnit: 'furlongs' }).distanceUnit).toBe('lunar');
  });
  it('enforces dangerLD < safeLD', () => {
    const s = mergeSettings({ dangerLD: 9, safeLD: 4 });
    expect(s.dangerLD).toBeLessThan(s.safeLD);
  });
  it('trims apiKeyOverride when storing', () => {
    expect(mergeSettings({ apiKeyOverride: '  K  ' }).apiKeyOverride).toBe('K');
  });
  it('defaults the new delight fields', () => {
    const s = mergeSettings({});
    expect(s.hapticsEnabled).toBe(true);
    expect(s.onboardingComplete).toBe(false);
  });
  it('keeps valid booleans and rejects non-booleans', () => {
    expect(mergeSettings({ hapticsEnabled: false, onboardingComplete: true }))
      .toMatchObject({ hapticsEnabled: false, onboardingComplete: true });
    expect(mergeSettings({ hapticsEnabled: 'yes' as unknown }).hapticsEnabled).toBe(true);
  });
});

describe('resolveApiKey', () => {
  it('uses override when present, else default', () => {
    expect(resolveApiKey({ ...DEFAULT_SETTINGS, apiKeyOverride: '  MYKEY ' })).toBe('MYKEY');
    expect(resolveApiKey({ ...DEFAULT_SETTINGS, apiKeyOverride: null })).toBeTruthy();
  });
});

describe('mergeSettings — notification fields', () => {
  it('defaults the three notification fields', () => {
    const s = mergeSettings(undefined);
    expect(s.dailyDigestEnabled).toBe(true);
    expect(s.digestHour).toBe(9);
    expect(s.smartAlertsEnabled).toBe(true);
  });
  it('respects explicit booleans', () => {
    const s = mergeSettings({ dailyDigestEnabled: false, smartAlertsEnabled: false });
    expect(s.dailyDigestEnabled).toBe(false);
    expect(s.smartAlertsEnabled).toBe(false);
  });
  it('coerces non-boolean notification flags to defaults', () => {
    const s = mergeSettings({ dailyDigestEnabled: 'no', smartAlertsEnabled: 1 });
    expect(s.dailyDigestEnabled).toBe(true);
    expect(s.smartAlertsEnabled).toBe(true);
  });
  it('clamps digestHour to an integer in 0..23, else 9', () => {
    expect(mergeSettings({ digestHour: 0 }).digestHour).toBe(0);
    expect(mergeSettings({ digestHour: 23 }).digestHour).toBe(23);
    expect(mergeSettings({ digestHour: 30 }).digestHour).toBe(9);
    expect(mergeSettings({ digestHour: -1 }).digestHour).toBe(9);
    expect(mergeSettings({ digestHour: 9.5 }).digestHour).toBe(9);
    expect(mergeSettings({ digestHour: 'x' }).digestHour).toBe(9);
  });
});
