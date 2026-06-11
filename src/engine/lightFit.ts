/** Light-suitability logic: classify the measured lux against a plant's
 *  (often one-sided) maintenance/preferred bands, and turn it into a [0,1]
 *  sub-score. Handles the sparse-threshold reality of the dataset, where many
 *  plants have only a maintenance floor and/or only a preferred ceiling. */

import type { Plant, LightBand } from './types';

/**
 * The lux at which a plant moves from merely surviving to thriving. Prefer an
 * explicit preferred floor; otherwise fall back to the next-best published
 * anchor so we never invent a number the dataset does not contain.
 */
export function preferredFloor(p: Plant): number | null {
  return p.preferred_lux_min ?? p.maintenance_lux_max ?? p.preferred_lux_max ?? null;
}

export function classifyBand(lux: number, p: Plant): LightBand {
  const floor = p.maintenance_lux_min;
  if (floor != null && lux < floor) {
    return 'below_survival';
  }
  const ceil = p.preferred_lux_max;
  if (ceil != null && lux > ceil) {
    return 'excess';
  }
  const good = preferredFloor(p);
  if (good != null && lux >= good) {
    return 'preferred';
  }
  return 'survival';
}

/**
 * [0,1] light-fit sub-score:
 *   - below survival floor          -> 0    (also hard-gated elsewhere)
 *   - above preferred ceiling       -> 0.7  (bright excess; possible stress)
 *   - within/above preferred range  -> 1.0
 *   - between floor and "good"      -> ramps 0.6 -> 1.0
 */
export function lightFitScore(lux: number, p: Plant): number {
  const floor = p.maintenance_lux_min;
  if (floor != null && lux < floor) {
    return 0;
  }
  const ceil = p.preferred_lux_max;
  if (ceil != null && lux > ceil) {
    return 0.7;
  }
  const good = preferredFloor(p);
  if (floor == null || good == null || good <= floor) {
    return 1.0;
  }
  if (lux >= good) {
    return 1.0;
  }
  return 0.6 + 0.4 * ((lux - floor) / (good - floor));
}

export function luxGapToMaintenance(lux: number, p: Plant): number | null {
  return p.maintenance_lux_min == null ? null : Math.round(lux - p.maintenance_lux_min);
}

export function luxGapToPreferred(lux: number, p: Plant): number | null {
  const good = preferredFloor(p);
  return good == null ? null : Math.round(lux - good);
}
