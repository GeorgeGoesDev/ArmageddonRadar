import { en } from '../en';
import { el } from '../el';

function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' ? keyPaths(v as Record<string, unknown>, path) : [path];
  });
}

describe('translation catalogs', () => {
  it('en and el have identical key sets', () => {
    const enKeys = keyPaths(en).sort();
    const elKeys = keyPaths(el).sort();
    expect(elKeys).toEqual(enKeys);
  });
});
