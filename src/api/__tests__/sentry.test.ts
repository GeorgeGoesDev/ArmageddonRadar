/// <reference types="jest" />
import { normalizeSentryRow, normalizeSentryDetail, fetchSentryRisks } from '../sentry';

describe('normalizeSentryRow', () => {
  it('parses string fields and converts diameter km→m', () => {
    const r = normalizeSentryRow({
      des: '1979 XB', fullname: '(1979 XB)', ip: '8.515158e-07', ps_cum: '-2.69',
      ts_max: '0', diameter: '0.66', n_imp: 4, range: '2056-2113',
    });
    expect(r).toEqual({
      designation: '1979 XB', name: '(1979 XB)', impactProb: 8.515158e-7,
      palermoCum: -2.69, torinoMax: 0, estDiameterM: 660, nImpacts: 4, yearRange: '2056-2113',
    });
  });
});

describe('normalizeSentryDetail', () => {
  it('parses the detail summary fields', () => {
    const d = normalizeSentryDetail({
      des: '1979 XB', fullname: '(1979 XB)', ip: '8.515158e-07', ps_cum: '-2.69',
      ps_max: '-2.99', ts_max: '0', energy: '3.234e+04', diameter: '0.66',
      mass: '3.92e+11', v_inf: '23.76', first_obs: '1979-12-11', last_obs: '1979-12-15', n_imp: 4,
    });
    expect(d.energyMt).toBeCloseTo(32340);
    expect(d.massKg).toBeCloseTo(3.92e11);
    expect(d.palermoMax).toBe(-2.99);
    expect(d.estDiameterM).toBe(660);
    expect(d.vInfKps).toBe(23.76);
  });
});

describe('fetchSentryRisks', () => {
  it('sorts by impact probability desc and caps to limit', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({
        count: 3, data: [
          { des: 'A', fullname: 'A', ip: '1e-6', ps_cum: '-3', ts_max: '0', diameter: '0.1', n_imp: 1, range: '2050' },
          { des: 'B', fullname: 'B', ip: '1e-3', ps_cum: '-1', ts_max: '1', diameter: '0.2', n_imp: 2, range: '2060' },
          { des: 'C', fullname: 'C', ip: '1e-5', ps_cum: '-2', ts_max: '0', diameter: '0.3', n_imp: 1, range: '2070' },
        ],
      }),
    });
    const out = await fetchSentryRisks(2);
    expect(out.map((r) => r.designation)).toEqual(['B', 'C']); // highest ip first, capped to 2
  });
});
