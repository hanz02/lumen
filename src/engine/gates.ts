/** Rule GATES — hard fails that eliminate clearly unsuitable plants before
 *  scoring (CLAUDE.md §2.4). Policy: lux floor + direct-sun only. Orientation
 *  is deliberately NOT a gate (it is a scoring factor) so the engine never
 *  rejects a plant whose measured spot lux is adequate. */

import type { Plant, SpotInput } from './types';
import { DIRECT_SUN_HOURS_THRESHOLD } from './config';

/** Does the spot receive meaningful direct sun (observed, or SPA-estimated)? */
export function spotHasDirectSun(spot: SpotInput): boolean {
  if (spot.directSunPresent === true) {
    return true;
  }
  if (spot.directSunHours != null && spot.directSunHours >= DIRECT_SUN_HOURS_THRESHOLD) {
    return true;
  }
  return false;
}

export interface GateResult {
  eliminated: boolean;
  reason: string | null;
}

export function applyGates(p: Plant, spot: SpotInput): GateResult {
  // GATE 1 — survival light floor: below maintenance_lux_min the plant cannot
  // be kept alive at this spot, by the floor's own definition.
  if (p.maintenance_lux_min != null && spot.lux < p.maintenance_lux_min) {
    return {
      eliminated: true,
      reason:
        `Measured light (${Math.round(spot.lux)} lux) is below ` +
        `${p.common_name_main}'s survival minimum (${Math.round(p.maintenance_lux_min)} lux).`,
    };
  }

  // GATE 2 — direct-sun incompatibility: a no-tolerance plant in a spot that
  // receives direct sun will scorch (per-plant sourced direct_sun_tolerance).
  if (p.direct_sun_tolerance === 'none' && spotHasDirectSun(spot)) {
    return {
      eliminated: true,
      reason: `This spot receives direct sun, which scorches ${p.common_name_main} (no direct-sun tolerance).`,
    };
  }

  return { eliminated: false, reason: null };
}
