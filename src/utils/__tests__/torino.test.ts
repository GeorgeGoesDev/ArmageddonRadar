import { torinoColor, formatOdds } from '../torino';
import { colors } from '../../theme/colors';

describe('torinoColor', () => {
  it('maps levels to zone colors', () => {
    expect(torinoColor(0)).toBe(colors.textMuted);
    expect(torinoColor(3)).toBe(colors.threatYellow);
    expect(torinoColor(6)).toBe(colors.threatOrange);
    expect(torinoColor(9)).toBe('#FF1744');
  });
});

describe('formatOdds', () => {
  it('formats as 1 in N', () => {
    expect(formatOdds(1e-3)).toBe('1 in 1,000');
    expect(formatOdds(8.515158e-7)).toBe('1 in 1,174,376');
  });
  it('handles zero/negative', () => {
    expect(formatOdds(0)).toBe('~0');
  });
});
