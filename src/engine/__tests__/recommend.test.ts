import { recommend } from '../recommend';
import { applyGates } from '../gates';
import { scorePlant } from '../scoring';
import { classifyBand, lightFitScore } from '../lightFit';
import { WEIGHTS } from '../config';
import type { SpotInput } from '../types';
import {
  ALL_PLANTS,
  ZZ_PLANT,
  SNAKE_PLANT,
  SWISS_CHEESE,
  AFRICAN_VIOLET,
  REX_BEGONIA,
} from './fixtures';

describe('GATE 1 — survival light floor', () => {
  it('eliminates a plant when measured lux is below maintenance_lux_min', () => {
    const spot: SpotInput = { lux: 600, distanceToWindowM: 3, directSunPresent: false };
    const g = applyGates(SNAKE_PLANT, spot); // floor 807
    expect(g.eliminated).toBe(true);
    expect(g.reason).toMatch(/below/i);
  });

  it('keeps a plant whose floor is satisfied', () => {
    const spot: SpotInput = { lux: 600, directSunPresent: false };
    expect(applyGates(ZZ_PLANT, spot).eliminated).toBe(false); // floor 269
  });
});

describe('GATE 2 — direct-sun incompatibility', () => {
  const sunnySpot: SpotInput = { lux: 12000, distanceToWindowM: 1, directSunPresent: true };

  it("eliminates a 'none'-tolerance plant in a direct-sun spot, even at high lux", () => {
    expect(applyGates(REX_BEGONIA, sunnySpot).eliminated).toBe(true); // none + sun
    expect(applyGates(ZZ_PLANT, { ...sunnySpot, lux: 5000 }).eliminated).toBe(true);
  });

  it("does NOT eliminate a 'some'-tolerance plant in direct sun", () => {
    expect(applyGates(SNAKE_PLANT, sunnySpot).eliminated).toBe(false);
    expect(applyGates(SWISS_CHEESE, sunnySpot).eliminated).toBe(false);
  });

  it('orientation is never a gate (mismatch still passes)', () => {
    // SWISS supports E/S/W only; a north window must NOT eliminate it.
    const northShade: SpotInput = {
      lux: 5000,
      windowAspect: 'north_facing',
      directSunPresent: false,
    };
    expect(applyGates(SWISS_CHEESE, northShade).eliminated).toBe(false);
  });
});

describe('light band classification', () => {
  it('classifies preferred / survival / excess against sparse bands', () => {
    expect(classifyBand(5000, SWISS_CHEESE)).toBe('preferred'); // >= preferred floor 4306
    expect(classifyBand(3000, SWISS_CHEESE)).toBe('survival'); // between 2153 and 4306
    expect(classifyBand(12000, AFRICAN_VIOLET)).toBe('excess'); // > preferred ceiling 10764
    expect(classifyBand(200, ZZ_PLANT)).toBe('below_survival'); // < 269
  });

  it('light-fit score is 0 below floor and 0.7 above preferred ceiling', () => {
    expect(lightFitScore(200, ZZ_PLANT)).toBe(0);
    expect(lightFitScore(12000, AFRICAN_VIOLET)).toBe(0.7);
    expect(lightFitScore(5000, SWISS_CHEESE)).toBe(1.0);
  });
});

describe('weighted scoring + renormalisation', () => {
  it('uses all four factors when SPA + distance are present', () => {
    const spot: SpotInput = {
      lux: 5000,
      distanceToWindowM: 1.5,
      windowAspect: 'east_facing',
      directSunHours: 0,
      directSunPresent: false,
    };
    const s = scorePlant(SWISS_CHEESE, spot);
    expect(s.factors.light.available).toBe(true);
    expect(s.factors.directSun.available).toBe(true);
    expect(s.factors.distance.available).toBe(true);
    expect(s.factors.confidence.available).toBe(true);
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it('drops unavailable factors and renormalises remaining weights', () => {
    const luxOnly: SpotInput = { lux: 5000 }; // no SPA, no distance
    const s = scorePlant(SWISS_CHEESE, luxOnly);
    expect(s.factors.directSun.available).toBe(false);
    expect(s.factors.distance.available).toBe(false);

    // Expected = (wLight*light + wConf*conf) / (wLight + wConf) * 100
    const light = s.factors.light.value;
    const conf = s.factors.confidence.value;
    const expected =
      ((WEIGHTS.light * light + WEIGHTS.confidence * conf) /
        (WEIGHTS.light + WEIGHTS.confidence)) *
      100;
    expect(s.score).toBeCloseTo(Math.round(expected * 10) / 10, 1);
  });
});

describe('recommend() end-to-end', () => {
  it('a dim deep spot leaves only the lowest-light plant', () => {
    // raw 500 lx calibrates to ~687 lx — clear of Snake Plant's 807 lx floor
    const spot: SpotInput = { lux: 500, distanceToWindowM: 3, directSunPresent: false };
    const { recommended, eliminated } = recommend(ALL_PLANTS, spot);
    expect(recommended.map((r) => r.plant_id)).toEqual(['ZZ_PLANT']);
    expect(eliminated.map((r) => r.plant_id).sort()).toEqual(
      ['AFRICAN_VIOLET', 'REX_BEGONIA_GROUP', 'SNAKE_PLANT', 'SWISS_CHEESE'].sort(),
    );
  });

  it('ranks survivors by score with contiguous 1-based ranks', () => {
    const spot: SpotInput = {
      lux: 5000,
      distanceToWindowM: 1.5,
      windowAspect: 'east_facing',
      directSunPresent: false,
    };
    const { recommended } = recommend(ALL_PLANTS, spot);
    expect(recommended.length).toBeGreaterThan(1);
    // monotonically non-increasing scores
    for (let i = 1; i < recommended.length; i++) {
      expect(recommended[i - 1].score).toBeGreaterThanOrEqual(recommended[i].score);
    }
    // contiguous ranks
    expect(recommended.map((r) => r.rank)).toEqual(
      recommended.map((_, i) => i + 1),
    );
  });

  it('every result (recommended and eliminated) carries an explanation', () => {
    const spot: SpotInput = { lux: 12000, distanceToWindowM: 1, directSunPresent: true };
    const { recommended, eliminated } = recommend(ALL_PLANTS, spot);
    for (const r of [...recommended, ...eliminated]) {
      expect(typeof r.explanation).toBe('string');
      expect(r.explanation.length).toBeGreaterThan(0);
      expect(r.displayLightLabel.length).toBeGreaterThan(0);
    }
  });

  it('marks result confidence "reduced" when optional inputs are missing', () => {
    const luxOnly: SpotInput = { lux: 5000 };
    const { recommended } = recommend(ALL_PLANTS, luxOnly);
    expect(recommended.length).toBeGreaterThan(0);
    for (const r of recommended) {
      expect(r.recommendationConfidence).toBe('reduced');
    }
  });

  it('direct-sun spot eliminates none-tolerance plants but keeps some-tolerance ones', () => {
    const spot: SpotInput = { lux: 12000, distanceToWindowM: 1, directSunPresent: true };
    const { recommended, eliminated } = recommend(ALL_PLANTS, spot);
    const recIds = recommended.map((r) => r.plant_id);
    expect(recIds).toContain('SNAKE_PLANT');
    expect(recIds).toContain('SWISS_CHEESE');
    const elimIds = eliminated.map((r) => r.plant_id);
    expect(elimIds).toContain('REX_BEGONIA_GROUP');
    expect(elimIds).toContain('ZZ_PLANT');
    expect(elimIds).toContain('AFRICAN_VIOLET');
  });
});

describe('display-only reference pass-through (DLI/PPFD/photoperiod)', () => {
  const REF = {
    dliMin: 2,
    dliMax: 5,
    photoperiodMin: 8,
    photoperiodMax: 12,
    maintenancePpfdMin: null,
    maintenancePpfdMax: null,
    preferredPpfdMin: 30,
    preferredPpfdMax: 60,
  };

  it('passes the reference object straight through onto a recommended plant', () => {
    const spot: SpotInput = { lux: 5000, distanceToWindowM: 1 };
    const withRef = recommend([{ ...ZZ_PLANT, reference: REF }], spot);
    expect(withRef.recommended[0].reference).toEqual(REF);
  });

  it('passes the reference object through onto an eliminated plant too', () => {
    const spot: SpotInput = { lux: 100 }; // below ZZ floor 269 -> eliminated
    const { eliminated } = recommend([{ ...ZZ_PLANT, reference: REF }], spot);
    expect(eliminated[0].reference).toEqual(REF);
  });

  it('null when the plant carries no reference data', () => {
    const spot: SpotInput = { lux: 5000, distanceToWindowM: 1 };
    expect(recommend([ZZ_PLANT], spot).recommended[0].reference).toBeNull();
  });

  it('reference data never affects score, band, or factors', () => {
    const spot: SpotInput = { lux: 5000, distanceToWindowM: 1, directSunPresent: false };
    const plain = recommend([ZZ_PLANT], spot).recommended[0];
    const enriched = recommend([{ ...ZZ_PLANT, reference: REF }], spot).recommended[0];
    expect(enriched.score).toBe(plain.score);
    expect(enriched.lightBand).toBe(plain.lightBand);
    expect(enriched.factors).toEqual(plain.factors);
  });
});
