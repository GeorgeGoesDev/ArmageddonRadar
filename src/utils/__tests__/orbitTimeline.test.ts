import { timelinePoints } from '../orbitTimeline';
import { ApproachEntry } from '../../types/neoDetail';

const mk = (epochMs: number, missLunar: number): ApproachEntry => ({
  epochMs, dateFull: '', missLunar, missKm: 0, velocityKph: 0, orbitingBody: 'Earth',
});

describe('timelinePoints', () => {
  it('spreads x by epoch within [pad, width-pad]', () => {
    const pts = timelinePoints([mk(0, 5), mk(100, 5), mk(50, 5)], 100, 50);
    const xs = pts.map((p) => Math.round(p.x));
    expect(Math.min(...xs)).toBe(6);
    expect(Math.max(...xs)).toBe(94);
    // sorted by input order preserved
    expect(pts[1].entry.epochMs).toBe(100);
  });
  it('closer approaches sit lower (larger y)', () => {
    const pts = timelinePoints([mk(0, 1), mk(100, 20)], 100, 50);
    expect(pts[0].y).toBeGreaterThan(pts[1].y); // missLunar 1 is closer → larger y
  });
  it('handles a single point (centered)', () => {
    const pts = timelinePoints([mk(0, 3)], 100, 50);
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBe(50);
  });
  it('handles empty input', () => {
    expect(timelinePoints([], 100, 50)).toEqual([]);
  });
});
