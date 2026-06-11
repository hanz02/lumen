/**
 * Engine tuning constants — kept in one place because every value here is a
 * design decision that must be stated and defended in the Methodology chapter.
 *
 * Gate policy: "lux floor + direct-sun only" (most academically defensible).
 * Window orientation is a SCORING/explanation factor, never a hard gate, so the
 * engine never silently rejects a plant whose measured spot lux is adequate.
 */

import type { Confidence } from './types';

/** Weighted-scoring split across the four thesis factors (Balanced profile). */
export const WEIGHTS = {
  light: 0.3, // measured spot lux vs the plant's maintenance/preferred bands
  directSun: 0.25, // SPA direct-sun estimate vs the plant's direct_sun_tolerance
  distance: 0.25, // spot-to-window distance zone vs the plant's light class
  confidence: 0.2, // evidence confidence behind the plant's thresholds
} as const;

/** Distance-from-window zone boundaries (metres). */
export const DISTANCE_ZONES = {
  nearMaxM: 1.0, // <= 1.0 m  -> "near"
  midMaxM: 2.5, // <= 2.5 m  -> "mid"; beyond -> "deep"
} as const;

/**
 * Plant light-class boundaries by maintenance_lux_min (lux).
 * ~800 lux ≈ 75 fc, ~5000 lux ≈ 465 fc — coarse low/medium/high banding.
 */
export const LIGHT_CLASS = {
  lowMaxLux: 800,
  mediumMaxLux: 5000,
} as const;

/** Maps the controlled-vocab confidence code to a [0,1] sub-score. */
export const CONFIDENCE_SCORE: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.45,
  provisional: 0.3,
};

/** Direct sun is considered "present" at a spot at/above this many hours/day. */
export const DIRECT_SUN_HOURS_THRESHOLD = 1.0;

/** A 'some'-tolerance plant is comfortable up to this much direct sun (hours/day). */
export const SOME_TOLERANCE_HOURS_OK = 3.0;

/**
 * Phone-lux -> reference-lux calibration (meter = slope * phone + intercept).
 *
 * Derived from the 210-pair field validation (Samsung S21+ vs UNI-T UT383,
 * Apr–May 2026; r=0.996, R²=0.993; phone underreads ~15% median). Constants are
 * regenerated ONLY by tools/analyze_spot_observations.py (single source of
 * truth) — do not hand-tune. Device-specific and validated for ~200–6000 lx
 * indoor daylight; outside that range it extrapolates.
 *
 * "Both" mode: SpotInput.lux stays RAW; the engine applies this at scoring
 * time and every Recommendation carries both luxRaw and luxUsed.
 */
export const LUX_CALIBRATION = {
  slope: 1.1054,
  intercept: 134.4,
  enabled: true,
  source: '210-pair UT383 validation Apr–May 2026 (S21+; r=0.996, R²=0.993)',
} as const;
