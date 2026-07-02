/** Orchestrator: gates -> score survivors -> rank -> attach explanations.
 *  Pure function of (plants, spot); deterministic and side-effect free so it is
 *  trivially unit-testable and identical on device and in tests. */

import type { Plant, SpotInput, Recommendation } from './types';
import { applyGates } from './gates';
import { applyLuxCalibration } from './calibration';
import { scorePlant } from './scoring';
import {
  classifyBand,
  luxGapToMaintenance,
  luxGapToPreferred,
} from './lightFit';
import {
  displayLightLabel,
  displayWarning,
  orientationMatch,
  recommendationConfidence,
  buildExplanation,
} from './explain';

export interface RecommendResult {
  /** Survivors, ranked best-first. */
  recommended: Recommendation[];
  /** Gated-out plants, with the reason — kept for transparency & evaluation. */
  eliminated: Recommendation[];
}

function toRecommendation(
  p: Plant,
  spot: SpotInput,
  luxRaw: number,
): Recommendation {
  const gate = applyGates(p, spot);
  const band = classifyBand(spot.lux, p);
  const orient = orientationMatch(p, spot.windowAspect);

  if (gate.eliminated) {
    return {
      plant_id: p.plant_id,
      common_name: p.common_name_main,
      eliminated: true,
      gateReason: gate.reason,
      score: 0,
      rank: null,
      luxRaw,
      luxUsed: spot.lux,
      lightBand: band,
      distanceZone: null,
      factors: {
        light: { value: 0, available: true, note: gate.reason ?? '' },
        directSun: { value: 0, available: false, note: '' },
        distance: { value: 0, available: false, note: '' },
        confidence: { value: 0, available: false, note: '' },
      },
      luxGapToMaintenance: luxGapToMaintenance(spot.lux, p),
      luxGapToPreferred: luxGapToPreferred(spot.lux, p),
      orientationMatch: orient,
      displayLightLabel: displayLightLabel(band),
      displayWarning: null,
      recommendationConfidence: 'reduced',
      explanation: gate.reason ?? 'Eliminated by a rule gate.',
      reference: p.reference ?? null, // display-only pass-through, never scored
    };
  }

  const scored = scorePlant(p, spot);
  return {
    plant_id: p.plant_id,
    common_name: p.common_name_main,
    eliminated: false,
    gateReason: null,
    score: scored.score,
    rank: null, // assigned after sorting
    luxRaw,
    luxUsed: spot.lux,
    lightBand: band,
    distanceZone: scored.distanceZone,
    factors: scored.factors,
    luxGapToMaintenance: luxGapToMaintenance(spot.lux, p),
    luxGapToPreferred: luxGapToPreferred(spot.lux, p),
    orientationMatch: orient,
    displayLightLabel: displayLightLabel(band),
    displayWarning: displayWarning(p, scored.factors, orient),
    recommendationConfidence: recommendationConfidence(p, scored.factors),
    explanation: buildExplanation(p, spot, band, scored.factors),
    reference: p.reference ?? null, // display-only pass-through, never scored
  };
}

const CONFIDENCE_RANK: Record<string, number> = {
  high: 4,
  medium: 3,
  low: 2,
  provisional: 1,
  reduced: 0,
};

export function recommend(plants: Plant[], spot: SpotInput): RecommendResult {
  // "Both" mode: the caller passes RAW phone lux; the engine scores with the
  // calibrated value and every result carries both (luxRaw / luxUsed).
  const luxRaw = spot.lux;
  const effSpot: SpotInput = { ...spot, lux: applyLuxCalibration(luxRaw) };
  const all = plants.map(p => toRecommendation(p, effSpot, luxRaw));

  const recommended = all
    .filter(r => !r.eliminated)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (CONFIDENCE_RANK[b.recommendationConfidence] ?? 0) -
          (CONFIDENCE_RANK[a.recommendationConfidence] ?? 0) ||
        a.common_name.localeCompare(b.common_name),
    );
  recommended.forEach((r, i) => {
    r.rank = i + 1;
  });

  const eliminated = all.filter(r => r.eliminated);

  return { recommended, eliminated };
}
