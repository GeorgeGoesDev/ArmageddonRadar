/// <reference types="jest" />
import { fetchNeoWeek, weekDateKeys } from '../nasa';

describe('weekDateKeys', () => {
  it('returns 7 consecutive local date keys', () => {
    const keys = weekDateKeys(new Date(2026, 6, 15));
    expect(keys).toEqual([
      '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18',
      '2026-07-19', '2026-07-20', '2026-07-21',
    ]);
  });
});

describe('fetchNeoWeek', () => {
  it('parses each day key into a normalized, sorted array', async () => {
    const day = '2026-07-15';
    const payload = {
      element_count: 2,
      near_earth_objects: {
        [day]: [
          neo('far', '5.0'), neo('near', '1.0'),
        ],
      },
    };
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => payload,
    });

    const week = await fetchNeoWeek({ startDate: new Date(2026, 6, 15) });
    expect(week[day].map((a) => a.id)).toEqual(['near', 'far']); // sorted closest-first
    expect(week[day][0].missLunar).toBe(1);
  });
});

function neo(id: string, lunar: string) {
  return {
    id, neo_reference_id: id, name: `(${id})`, nasa_jpl_url: '',
    absolute_magnitude_h: 20,
    estimated_diameter: {
      kilometers: { estimated_diameter_min: 0.01, estimated_diameter_max: 0.02 },
      meters: { estimated_diameter_min: 10, estimated_diameter_max: 20 },
      miles: { estimated_diameter_min: 0, estimated_diameter_max: 0 },
      feet: { estimated_diameter_min: 0, estimated_diameter_max: 0 },
    },
    is_potentially_hazardous_asteroid: false,
    close_approach_data: [{
      close_approach_date: '2026-07-15', close_approach_date_full: '2026-Jul-15 12:00',
      epoch_date_close_approach: 0,
      relative_velocity: { kilometers_per_second: '1', kilometers_per_hour: '3600', miles_per_hour: '2237' },
      miss_distance: { astronomical: '0', lunar, kilometers: '1', miles: '1' },
      orbiting_body: 'Earth',
    }],
    is_sentry_object: false,
  };
}
