/** Pure helpers turning a compass bearing (degrees from north) into a
 *  human-readable cardinal direction. Used by the live window-facing readout so
 *  the user can sanity-check the heading ("this says West, and I AM facing the
 *  window") and catch a magnetometer flip before capturing. No react-native
 *  imports — unit-tested like the rest of src/sensor. */

/** Friendly 8-point names for the big live readout. */
const NAMES_8 = [
  'North',
  'North-east',
  'East',
  'South-east',
  'South',
  'South-west',
  'West',
  'North-west',
] as const;

/** Compact 16-point abbreviations for a secondary label. */
const ABBR_16 = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
] as const;

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** 8-point friendly name, e.g. 270 → "West", 135 → "South-east". */
export function cardinalName(azimuthDeg: number): string {
  return NAMES_8[Math.round(norm360(azimuthDeg) / 45) % 8];
}

/** 16-point abbreviation, e.g. 290 → "WNW". */
export function cardinalAbbr(azimuthDeg: number): string {
  return ABBR_16[Math.round(norm360(azimuthDeg) / 22.5) % 16];
}

/** Tilt (degrees from lying flat) past which the compass heading is warned as
 *  unreliable. Chosen well below ~90° (held upright, as when tilting the
 *  phone up to read the screen — the natural action that destabilises
 *  Android's getOrientation() azimuth) so the warning fires before the user
 *  reaches that posture, not only once the reading has already gone bad. */
export const TILT_WARNING_DEG = 30;

/** True once the phone is tilted far enough from flat that the heading should
 *  not be trusted. Field-confirmed to matter far more than magnetic
 *  interference: tilting to read the live number is itself the failure mode. */
export function isTiltedTooFar(
  tiltDeg: number,
  thresholdDeg: number = TILT_WARNING_DEG,
): boolean {
  return tiltDeg > thresholdDeg;
}
