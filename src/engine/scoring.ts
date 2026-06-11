/** Weighted SCORING of the plants that survive the gates. Four thesis factors
 *  (light fit, direct-sun risk, distance/zone fit, evidence confidence) each
 *  yield a [0,1] sub-score; unavailable factors are dropped and the remaining
 *  weights renormalised, so partial captures (e.g. lux only, no SPA yet) still
 *  produce an honest score. */

import type { Plant, SpotInput, FactorScore, DistanceZone, RecommendationFactors } from './types';
import {
  WEIGHTS,
  DISTANCE_ZONES,
  LIGHT_CLASS,
  CONFIDENCE_SCORE,
  SOME_TOLERANCE_HOURS_OK,
} from './config';
import { lightFitScore } from './lightFit';
import { spotHasDirectSun } from './gates';

export function distanceZone(distanceM: number): DistanceZone {
  if (distanceM <= DISTANCE_ZONES.nearMaxM) {
    return 'near';
  }
  if (distanceM <= DISTANCE_ZONES.midMaxM) {
    return 'mid';
  }
  return 'deep';
}

export function plantLightClass(p: Plant): 'low' | 'medium' | 'high' {
  const m = p.maintenance_lux_min ?? 0;
  if (m < LIGHT_CLASS.lowMaxLux) {
    return 'low';
  }
  if (m < LIGHT_CLASS.mediumMaxLux) {
    return 'medium';
  }
  return 'high';
}

function lightFactor(spot: SpotInput, p: Plant): FactorScore {
  return {
    value: lightFitScore(spot.lux, p),
    available: true, // lux is always captured
    note: `Measured ${Math.round(spot.lux)} lux vs this plant's light band.`,
  };
}

function directSunFactor(spot: SpotInput, p: Plant): FactorScore {
  const known = spot.directSunPresent != null || spot.directSunHours != null;
  if (!known) {
    return { value: 0, available: false, note: 'No sun-path estimate captured.' };
  }
  const has = spotHasDirectSun(spot);
  const t = p.direct_sun_tolerance;

  if (t === 'tolerant') {
    return { value: 1.0, available: true, note: 'Tolerates direct sun.' };
  }
  if (t === 'some') {
    const hrs = spot.directSunHours ?? (has ? SOME_TOLERANCE_HOURS_OK + 1 : 0);
    const ok = !has || hrs <= SOME_TOLERANCE_HOURS_OK;
    return {
      value: ok ? 1.0 : 0.6,
      available: true,
      note: ok
        ? 'Tolerates the limited direct sun at this spot.'
        : 'Direct sun here may exceed its limited tolerance.',
    };
  }
  if (t === 'none') {
    return has
      ? { value: 0.2, available: true, note: 'Direct sun present; risk of leaf scorch.' }
      : { value: 1.0, available: true, note: 'No direct sun reaches this spot.' };
  }
  // unknown
  return { value: 0.6, available: true, note: 'Direct-sun tolerance unknown; treated cautiously.' };
}

const ZONE_CLASS_FIT: Record<DistanceZone, Record<'low' | 'medium' | 'high', number>> = {
  near: { high: 1.0, medium: 0.7, low: 0.4 },
  mid: { high: 0.7, medium: 1.0, low: 0.7 },
  deep: { high: 0.4, medium: 0.7, low: 1.0 },
};

function distanceFactor(spot: SpotInput, p: Plant): FactorScore {
  if (spot.distanceToWindowM == null) {
    return { value: 0, available: false, note: 'No window distance measured.' };
  }
  const zone = distanceZone(spot.distanceToWindowM);
  const cls = plantLightClass(p);
  return {
    value: ZONE_CLASS_FIT[zone][cls],
    available: true,
    note: `${zone}-window zone vs ${cls}-light plant.`,
  };
}

function confidenceFactor(p: Plant): FactorScore {
  return {
    value: CONFIDENCE_SCORE[p.final_confidence] ?? CONFIDENCE_SCORE.low,
    available: true,
    note: `Evidence confidence: ${p.final_confidence}.`,
  };
}

export interface ScoreResult {
  factors: RecommendationFactors;
  score: number; // 0..100
  distanceZone: DistanceZone | null;
}

export function scorePlant(p: Plant, spot: SpotInput): ScoreResult {
  const factors: RecommendationFactors = {
    light: lightFactor(spot, p),
    directSun: directSunFactor(spot, p),
    distance: distanceFactor(spot, p),
    confidence: confidenceFactor(p),
  };

  const terms = [
    { f: factors.light, w: WEIGHTS.light },
    { f: factors.directSun, w: WEIGHTS.directSun },
    { f: factors.distance, w: WEIGHTS.distance },
    { f: factors.confidence, w: WEIGHTS.confidence },
  ].filter((t) => t.f.available);

  const wSum = terms.reduce((s, t) => s + t.w, 0);
  const raw = wSum > 0 ? terms.reduce((s, t) => s + t.w * t.f.value, 0) / wSum : 0;

  return {
    factors,
    score: Math.round(raw * 1000) / 10, // one decimal, 0..100
    distanceZone: spot.distanceToWindowM == null ? null : distanceZone(spot.distanceToWindowM),
  };
}
