import { circularMeanDeg } from '../useCompassCapture';

describe('circularMeanDeg', () => {
  it('averages ordinary bearings', () => {
    expect(circularMeanDeg([80, 100])).toBeCloseTo(90, 5);
  });

  it('handles the north wrap (350° & 10° average to 0°, not 180°)', () => {
    const mean = circularMeanDeg([350, 10]);
    expect(Math.min(mean, 360 - mean)).toBeLessThan(1e-6);
  });

  it('returns the value itself for a single sample', () => {
    expect(circularMeanDeg([237.5])).toBeCloseTo(237.5, 5);
  });

  it('stays in [0, 360)', () => {
    const mean = circularMeanDeg([359, 359.5, 0.5, 1]);
    expect(mean).toBeGreaterThanOrEqual(0);
    expect(mean).toBeLessThan(360);
  });
});
