import { applyLuxCalibration } from '../calibration';
import { LUX_CALIBRATION } from '../config';
import { recommend } from '../recommend';
import { applyGates } from '../gates';
import { ALL_PLANTS, SNAKE_PLANT } from './fixtures';

describe('applyLuxCalibration', () => {
  it('applies the documented linear fit (meter = slope * phone + intercept)', () => {
    const expected = Math.round(
      LUX_CALIBRATION.slope * 1000 + LUX_CALIBRATION.intercept,
    );
    expect(applyLuxCalibration(1000)).toBe(expected);
  });

  it('is the identity when disabled', () => {
    const off = { slope: 1.1054, intercept: 134.4, enabled: false };
    expect(applyLuxCalibration(1000, off)).toBe(1000);
    expect(applyLuxCalibration(0, off)).toBe(0);
  });

  it('never returns negative lux', () => {
    const weird = { slope: 1.0, intercept: -500, enabled: true };
    expect(applyLuxCalibration(100, weird)).toBe(0);
  });
});

describe('recommend() "both" mode — raw and calibrated lux', () => {
  it('every result carries luxRaw (as captured) and luxUsed (calibrated)', () => {
    const raw = 600;
    const { recommended, eliminated } = recommend(ALL_PLANTS, { lux: raw });
    const calibrated = applyLuxCalibration(raw);
    for (const r of [...recommended, ...eliminated]) {
      expect(r.luxRaw).toBe(raw);
      expect(r.luxUsed).toBe(calibrated);
    }
    expect(calibrated).not.toBe(raw); // calibration enabled by default
  });

  it('gates run on the CALIBRATED value (phone underread no longer kills a viable plant)', () => {
    // Snake Plant floor = 807 lx. Raw 700 lx fails it, but the phone underreads
    // ~15%; calibrated ≈ 908 lx clears the floor.
    const raw = 700;
    expect(applyGates(SNAKE_PLANT, { lux: raw }).eliminated).toBe(true); // raw path
    const { recommended } = recommend(ALL_PLANTS, { lux: raw });
    expect(recommended.map((r) => r.plant_id)).toContain('SNAKE_PLANT');
  });
});
