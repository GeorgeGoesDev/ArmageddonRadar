import { normalizeNeoDetail } from '../neoDetail';

const raw = {
  id: '3447916', name: '(2009 DB1)', absolute_magnitude_h: 23.05, is_potentially_hazardous_asteroid: false,
  orbital_data: {
    semi_major_axis: '1.5', eccentricity: '0.4', inclination: '5.2', orbital_period: '700',
    perihelion_distance: '0.9', aphelion_distance: '2.1', first_observation_date: '2009-02-10',
    last_observation_date: '2020-01-01',
    orbit_class: { orbit_class_type: 'APO', orbit_class_description: 'Apollo' },
  },
  close_approach_data: [
    { epoch_date_close_approach: 200, close_approach_date_full: 'b', miss_distance: { lunar: '5', kilometers: '2' }, relative_velocity: { kilometers_per_hour: '10' }, orbiting_body: 'Earth' },
    { epoch_date_close_approach: 100, close_approach_date_full: 'a', miss_distance: { lunar: '3', kilometers: '1' }, relative_velocity: { kilometers_per_hour: '9' }, orbiting_body: 'Earth' },
  ],
};

describe('normalizeNeoDetail', () => {
  it('parses orbital elements and sorts approaches ascending by epoch', () => {
    const d = normalizeNeoDetail(raw);
    expect(d.orbital.semiMajorAxisAu).toBe(1.5);
    expect(d.orbital.orbitClassType).toBe('APO');
    expect(d.approaches.map((a) => a.epochMs)).toEqual([100, 200]);
    expect(d.approaches[0].missLunar).toBe(3);
    expect(d.isHazardous).toBe(false);
  });
});
