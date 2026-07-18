import { makeFormatters } from '../units';

describe('makeFormatters', () => {
  it('formats distance as lunar by default', () => {
    const f = makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }, 'en');
    expect(f.distanceFromLunar(3.4, 1_306_960, 812_100)).toBe('3.4 LD');
  });
  it('formats distance as km', () => {
    const f = makeFormatters({ distanceUnit: 'km', velocityUnit: 'kph' }, 'en');
    expect(f.distanceFromLunar(3.4, 1_306_960, 812_100)).toBe('1,306,960 km');
  });
  it('formats distance as miles', () => {
    const f = makeFormatters({ distanceUnit: 'miles', velocityUnit: 'kph' }, 'en');
    expect(f.distanceFromLunar(3.4, 1_306_960, 812_100)).toBe('812,100 mi');
  });
  it('formats velocity as kph or mph', () => {
    expect(makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }, 'en').velocity(66790)).toBe('66,790 km/h');
    expect(makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'mph' }, 'en').velocity(66790)).toBe('41,501 mph');
  });
});

describe('makeFormatters locale', () => {
  it('formats distance in Greek separators', () => {
    const f = makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }, 'el');
    expect(f.distanceFromLunar(3.4, 0, 0)).toBe('3,4 ΣΑ');
  });
  it('formats km thousands in Greek', () => {
    const f = makeFormatters({ distanceUnit: 'km', velocityUnit: 'kph' }, 'el');
    expect(f.distanceFromLunar(0, 384400, 0)).toBe('384.400 km');
  });
  it('English unchanged', () => {
    const f = makeFormatters({ distanceUnit: 'lunar', velocityUnit: 'kph' }, 'en');
    expect(f.distanceFromLunar(3.4, 0, 0)).toBe('3.4 LD');
  });
});
