/** Shared engine types. Plant fields mirror the PLANT_MASTER columns the
 *  recommender actually consumes (a subset of the 27-column reference row). */

export type Confidence = 'high' | 'medium' | 'low' | 'provisional';

export type DirectSunTolerance = 'none' | 'some' | 'tolerant' | 'unknown';

export type WindowAspect =
  | 'north_facing'
  | 'east_facing'
  | 'south_facing'
  | 'west_facing';

/** One plant's runtime-relevant reference data (from the bundled SQLite `plant`). */
export interface Plant {
  plant_id: string;
  scientific_name_accepted: string;
  common_name_main: string;
  family?: string | null;
  maintenance_lux_min: number | null;
  maintenance_lux_max: number | null;
  preferred_lux_min: number | null;
  preferred_lux_max: number | null;
  /** ';'-joined LOOKUP_SHADE_CATEGORY codes. */
  shade_category?: string | null;
  /** ';'-joined LOOKUP_ASPECT_ORIENTATION codes (N/E/S/W facing). */
  aspect_orientation?: string | null;
  direct_sun_tolerance: DirectSunTolerance;
  final_confidence: Confidence;
  value_status?: string | null;
}

/** The captured spot context. `lux` is required; the rest fill in as the
 *  capture flow progresses (AR distance, then SPA/compass). */
export interface SpotInput {
  /** Measured spot illuminance (lux) — the runtime measurement unit. */
  lux: number;
  /** AR plant-to-window distance (metres). */
  distanceToWindowM?: number | null;
  /** Window-facing aspect from the compass. */
  windowAspect?: WindowAspect | null;
  /** SPA-estimated direct-sun duration reaching the spot (hours/day). */
  directSunHours?: number | null;
  /** Observed direct sun at capture time, if known. */
  directSunPresent?: boolean | null;
}

export type LightBand = 'below_survival' | 'survival' | 'preferred' | 'excess';

export type DistanceZone = 'near' | 'mid' | 'deep';

/** A single weighted-scoring factor. `available=false` factors are dropped
 *  from the weighted sum (and the remaining weights renormalised) so missing
 *  inputs never silently penalise a plant. */
export interface FactorScore {
  value: number; // [0,1]
  available: boolean;
  note: string; // human-readable basis, used by the explanation generator
}

export interface RecommendationFactors {
  light: FactorScore;
  directSun: FactorScore;
  distance: FactorScore;
  confidence: FactorScore;
}

/** Engine output for one plant against one spot. Field names align with the
 *  DERIVED_APP_FIELDS runtime schema so results persist cleanly to SQLite. */
export interface Recommendation {
  plant_id: string;
  common_name: string;
  eliminated: boolean;
  gateReason: string | null;
  score: number; // 0..100 (0 when eliminated)
  rank: number | null; // 1-based among survivors; null if eliminated
  /** Raw phone-sensor lux as captured ("both" mode keeps it for evaluation logs). */
  luxRaw: number;
  /** Lux the engine actually scored with (calibrated when LUX_CALIBRATION.enabled). */
  luxUsed: number;
  lightBand: LightBand;
  distanceZone: DistanceZone | null;
  factors: RecommendationFactors;
  luxGapToMaintenance: number | null;
  luxGapToPreferred: number | null;
  orientationMatch: 'match' | 'mismatch' | 'unknown';
  displayLightLabel: string;
  displayWarning: string | null;
  recommendationConfidence: Confidence | 'reduced';
  explanation: string;
}
