import { onForegroundChange } from '../useDayKey';

describe('onForegroundChange', () => {
  it('re-reads the key when the app becomes active', () => {
    const set = jest.fn();
    onForegroundChange(() => '2026-07-18', set)('active');
    expect(set).toHaveBeenCalledWith('2026-07-18');
  });

  it('ignores background and inactive transitions', () => {
    const set = jest.fn();
    const handler = onForegroundChange(() => '2026-07-18', set);
    handler('background');
    handler('inactive');
    expect(set).not.toHaveBeenCalled();
  });
});
