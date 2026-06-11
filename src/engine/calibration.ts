/** Phone-lux calibration ("both" mode): raw sensor lux in, reference-equivalent
 *  lux out. Pure so the on/off paths are unit-testable; constants live in
 *  config.ts and are regenerated only by tools/analyze_spot_observations.py. */

import { LUX_CALIBRATION } from './config';

export interface LuxCalibration {
  slope: number;
  intercept: number;
  enabled: boolean;
}

/** Returns the lux value the engine should score with. Identity when the
 *  calibration is disabled; otherwise the linear fit, clamped at 0 and rounded
 *  to the nearest lux (sub-lux precision is below sensor resolution). */
export function applyLuxCalibration(
  rawLux: number,
  cal: LuxCalibration = LUX_CALIBRATION,
): number {
  if (!cal.enabled) {
    return rawLux;
  }
  return Math.max(0, Math.round(cal.slope * rawLux + cal.intercept));
}
