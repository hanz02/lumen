/** Explanation generator — turns the gate/score internals into the plain-language
 *  "why" that every recommendation must carry (CLAUDE.md §2.4). Produces the
 *  user-facing display fields (label, warning, summary). */

import type {
  Plant,
  SpotInput,
  LightBand,
  WindowAspect,
  RecommendationFactors,
  Confidence,
} from './types';

const LIGHT_LABELS: Record<LightBand, string> = {
  below_survival: 'Below survival light',
  survival: 'Survival light (will persist)',
  preferred: 'Good light (preferred range)',
  excess: 'Very bright — possible light stress',
};

export function displayLightLabel(band: LightBand): string {
  return LIGHT_LABELS[band];
}

export function orientationMatch(
  p: Plant,
  aspect: WindowAspect | null | undefined,
): 'match' | 'mismatch' | 'unknown' {
  if (!aspect || !p.aspect_orientation) {
    return 'unknown';
  }
  const supported = p.aspect_orientation.split(';').map((s) => s.trim());
  return supported.includes(aspect) ? 'match' : 'mismatch';
}

function aspectWords(aspect: WindowAspect): string {
  return aspect.replace('_facing', '').replace(/^./, (c) => c.toUpperCase());
}

export function displayWarning(
  p: Plant,
  factors: RecommendationFactors,
  orient: 'match' | 'mismatch' | 'unknown',
): string | null {
  const parts: string[] = [];

  if (factors.directSun.available && factors.directSun.value <= 0.6) {
    parts.push('direct-sun exposure may harm this plant');
  }
  if (p.final_confidence === 'low' || p.final_confidence === 'provisional') {
    parts.push(`thresholds are ${p.final_confidence}-confidence`);
  } else if (p.value_status && /proxy|inherit/i.test(p.value_status)) {
    parts.push('thresholds rely on a related-species proxy');
  }
  if (orient === 'mismatch') {
    parts.push('this window aspect is not the plant’s preferred orientation');
  }

  if (parts.length === 0) {
    return null;
  }
  return `Note: ${parts.join('; ')}.`;
}

/** Blend evidence confidence with measurement completeness: if optional inputs
 *  (SPA / distance) were not captured, the result confidence is "reduced". */
export function recommendationConfidence(
  p: Plant,
  factors: RecommendationFactors,
): Confidence | 'reduced' {
  if (!factors.directSun.available || !factors.distance.available) {
    return 'reduced';
  }
  return p.final_confidence;
}

export function buildExplanation(
  p: Plant,
  spot: SpotInput,
  band: LightBand,
  factors: RecommendationFactors,
): string {
  const sentences: string[] = [];

  // Light (always present)
  switch (band) {
    case 'preferred':
      sentences.push(
        `The measured ${Math.round(spot.lux)} lux sits in ${p.common_name_main}’s preferred range, so it should grow well here.`,
      );
      break;
    case 'survival':
      sentences.push(
        `The measured ${Math.round(spot.lux)} lux is above the survival minimum but below the preferred level, so ${p.common_name_main} will persist rather than thrive.`,
      );
      break;
    case 'excess':
      sentences.push(
        `The measured ${Math.round(spot.lux)} lux is brighter than ${p.common_name_main}’s preferred ceiling, which can stress the foliage.`,
      );
      break;
    case 'below_survival':
      sentences.push(
        `The measured ${Math.round(spot.lux)} lux is below ${p.common_name_main}’s survival minimum.`,
      );
      break;
  }

  // Direct sun
  if (factors.directSun.available) {
    sentences.push(factors.directSun.note);
  }

  // Distance / zone
  if (factors.distance.available && spot.distanceToWindowM != null) {
    sentences.push(
      `At ${spot.distanceToWindowM.toFixed(2)} m from the window (${factors.distance.note}).`,
    );
  }

  // Orientation (informational)
  if (spot.windowAspect && p.aspect_orientation) {
    const om = orientationMatch(p, spot.windowAspect);
    if (om === 'match') {
      sentences.push(`${aspectWords(spot.windowAspect)}-facing matches its preferred orientation.`);
    } else if (om === 'mismatch') {
      sentences.push(
        `${aspectWords(spot.windowAspect)}-facing is outside its usual orientation, but measured light is what drives this result.`,
      );
    }
  }

  // Confidence
  sentences.push(`Evidence confidence: ${p.final_confidence}.`);

  return sentences.join(' ');
}
