import { toggleId } from '../WatchlistContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('toggleId', () => {
  it('adds an absent id', () => {
    expect(toggleId([], 'a')).toEqual(['a']);
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
  });
  it('removes a present id', () => {
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('is its own inverse applied twice', () => {
    expect(toggleId(toggleId(['a'], 'b'), 'b')).toEqual(['a']);
  });
});
