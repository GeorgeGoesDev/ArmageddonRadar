import { formatNumber } from '../format';

describe('formatNumber', () => {
  it('English: dot decimal, comma thousands', () => {
    expect(formatNumber(1234.5, 'en', 1)).toBe('1,234.5');
    expect(formatNumber(384400, 'en', 0)).toBe('384,400');
    expect(formatNumber(3.4, 'en', 1)).toBe('3.4');
  });
  it('Greek: comma decimal, dot thousands', () => {
    expect(formatNumber(1234.5, 'el', 1)).toBe('1.234,5');
    expect(formatNumber(384400, 'el', 0)).toBe('384.400');
    expect(formatNumber(3.4, 'el', 1)).toBe('3,4');
  });
  it('handles negatives and zero fraction', () => {
    expect(formatNumber(-1234, 'el', 0)).toBe('-1.234');
    expect(formatNumber(5, 'en', 0)).toBe('5');
  });
});
