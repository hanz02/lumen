/** Phone-lux calibration ("both" mode): raw sensor lux in, reference-equivalent
 *  lux out. Pure so the on/off paths are unit-testable; constants live in
 *  config.ts and are regenerated only by tools/analyze_spot_observations.py. */

import { LUX_CALIBRATION } from './config';

export interface LuxCalibration {
  slope: number;
  intercept: number;
  enabled: boolean;
  /** Lower bound of the validated range; below this the intercept extrapolates unreliably. */
  validMinLux?: number;
  validMaxLux?: number;
}

/** Returns the lux value the engine should score with. Identity when the
 *  calibration is disabled. Outside the validated range (200–6000 lx) the
 *  large intercept over-predicts at low light, so the raw value is returned
 *  instead — reported as-is, not calibrated. */
export function applyLuxCalibration(
  rawLux: number,
  cal: LuxCalibration = LUX_CALIBRATION,
): number {
  if (!cal.enabled) {
    return rawLux;
  }
  if (cal.validMinLux != null && rawLux < cal.validMinLux) {
    return Math.round(rawLux);
  }
  return Math.max(0, Math.round(cal.slope * rawLux + cal.intercept));
}
