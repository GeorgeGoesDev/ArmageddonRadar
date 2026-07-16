import { asteroidColor } from '../asteroidColor';

describe('asteroidColor', () => {
  it('is deterministic for the same id', () => {
    expect(asteroidColor('2465633')).toBe(asteroidColor('2465633'));
  });
  it('returns a valid hsl string with fixed s/l', () => {
    expect(asteroidColor('abc')).toMatch(/^hsl\(\d{1,3}, 70%, 62%\)$/);
  });
  it('spreads hues across different ids', () => {
    const hues = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(asteroidColor));
    expect(hues.size).toBeGreaterThan(4);
  });
});
