/**
 * ENGINE-vs-EVIDENCE CORRECTNESS CHECK (FYP Chapter 3/4 — "righteousness").
 * =========================================================================
 * This is a VERIFICATION (internal validity) check, not a horticultural trial.
 * It does NOT require a plant expert: the yardstick is the dataset's OWN
 * published thresholds. For a set of representative spots it INDEPENDENTLY
 * re-derives, from each plant's cited thresholds + the documented rule constants,
 * what the verdict SHOULD be (kept vs eliminated, and the light band), then runs
 * the REAL engine and checks it reproduces that verdict end-to-end (calibration →
 * gates → band). 100% agreement demonstrates the engine faithfully and correctly
 * applies its evidence base with no integration bug; any mismatch is a real finding.
 *
 * Framing for the thesis: this proves the app does the RIGHT thing per its own
 * evidence (rule-application correctness). It is deliberately separate from the
 * IV/DV differentiation study (ivdv_evaluation.test.ts), which proves the app does
 * something DIFFERENT from the fixed-label baseline.
 *
 * Run:  npx jest tools/eval/engine_correctness.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { recommend } from '../../src/engine/recommend';
import { applyLuxCalibration } from '../../src/engine/calibration';
import { DIRECT_SUN_HOURS_THRESHOLD } from '../../src/engine/config';
import type { Plant, SpotInput, LightBand } from '../../src/engine/types';
import { mapRowToPlant, type PlantDbRow } from '../../src/data/mapPlant';

const PLANTS: Plant[] = (
  JSON.parse(
    fs.readFileSync(path.join(__dirname, 'plants_eval.json'), 'utf-8'),
  ) as PlantDbRow[]
).map(mapRowToPlant);

const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ----------------------------------------------------------------------------
// Independent re-derivation from the PUBLISHED thresholds (NOT the engine).
// Mirrors the documented rule using the calibrated lux the engine gates on.
// ----------------------------------------------------------------------------
function spotHasDirectSun(spot: SpotInput): boolean {
  if (spot.directSunPresent === true) return true;
  return (
    spot.directSunHours != null &&
    spot.directSunHours >= DIRECT_SUN_HOURS_THRESHOLD
  );
}

/** Expected gate outcome derived straight from the plant's cited thresholds. */
function expectedEliminated(p: Plant, calLux: number, spot: SpotInput): boolean {
  if (p.maintenance_lux_min != null && calLux < p.maintenance_lux_min) return true;
  if (p.direct_sun_tolerance === 'none' && spotHasDirectSun(spot)) return true;
  return false;
}

/** Expected light band derived straight from the plant's cited thresholds. */
function expectedBand(p: Plant, calLux: number): LightBand {
  const floor = p.maintenance_lux_min;
  if (floor != null && calLux < floor) return 'below_survival';
  const ceil = p.preferred_lux_max;
  if (ceil != null && calLux > ceil) return 'excess';
  const good =
    p.preferred_lux_min ?? p.maintenance_lux_max ?? p.preferred_lux_max ?? null;
  if (good != null && calLux >= good) return 'preferred';
  return 'survival';
}

// ----------------------------------------------------------------------------
// Representative spots spanning dim → bright × sun / no-sun (raw lux; the engine
// calibrates). These are deliberately spread to exercise every band + the gate.
// ----------------------------------------------------------------------------
const SPOTS: { id: string; note: string; spot: SpotInput }[] = [
  { id: 'S1', note: 'very dim, no sun', spot: { lux: 80, directSunPresent: false, directSunHours: 0 } },
  { id: 'S2', note: 'dim, no sun', spot: { lux: 400, directSunPresent: false, directSunHours: 0 } },
  { id: 'S3', note: 'low-mid, no sun', spot: { lux: 1500, directSunPresent: false, directSunHours: 0 } },
  { id: 'S4', note: 'mid, no sun', spot: { lux: 3000, distanceToWindowM: 1.5, directSunPresent: false, directSunHours: 0 } },
  { id: 'S5', note: 'mid, 3 h sun', spot: { lux: 3000, distanceToWindowM: 1.0, windowAspect: 'west_facing', directSunPresent: true, directSunHours: 3 } },
  { id: 'S6', note: 'bright, no sun', spot: { lux: 6000, distanceToWindowM: 0.8, directSunPresent: false, directSunHours: 0 } },
  { id: 'S7', note: 'bright, 4 h sun', spot: { lux: 6000, distanceToWindowM: 0.5, windowAspect: 'south_facing', directSunPresent: true, directSunHours: 4 } },
  { id: 'S8', note: 'very bright, 5 h sun', spot: { lux: 12000, distanceToWindowM: 0.5, windowAspect: 'south_facing', directSunPresent: true, directSunHours: 5 } },
  { id: 'S9', note: 'low, 2 h sun', spot: { lux: 1500, distanceToWindowM: 1.2, windowAspect: 'east_facing', directSunPresent: true, directSunHours: 2 } },
  { id: 'S10', note: 'mid, sun present (no hours)', spot: { lux: 2500, distanceToWindowM: 1.0, directSunPresent: true } },
];

type Mismatch = {
  spot: string;
  plant: string;
  kind: 'gate' | 'band';
  expected: string;
  actual: string;
};

describe('Engine vs evidence — rule-application correctness', () => {
  const mismatches: Mismatch[] = [];
  let gateChecks = 0;
  let bandChecks = 0;

  for (const s of SPOTS) {
    const calLux = applyLuxCalibration(s.spot.lux);
    const { recommended, eliminated } = recommend(PLANTS, s.spot);
    const verdict = new Map<string, boolean>();
    const band = new Map<string, LightBand>();
    for (const r of recommended) { verdict.set(r.plant_id, false); band.set(r.plant_id, r.lightBand); }
    for (const r of eliminated) { verdict.set(r.plant_id, true); band.set(r.plant_id, r.lightBand); }

    for (const p of PLANTS) {
      gateChecks++;
      const expE = expectedEliminated(p, calLux, s.spot);
      const actE = verdict.get(p.plant_id);
      if (actE !== expE) {
        mismatches.push({ spot: s.id, plant: p.common_name_main, kind: 'gate',
          expected: expE ? 'eliminated' : 'kept', actual: actE ? 'eliminated' : 'kept' });
      }
      bandChecks++;
      const expB = expectedBand(p, calLux);
      const actB = band.get(p.plant_id);
      if (actB !== expB) {
        mismatches.push({ spot: s.id, plant: p.common_name_main, kind: 'band',
          expected: expB, actual: actB ?? '(missing)' });
      }
    }
  }

  it('every gate decision matches the evidence-derived expectation', () => {
    const gateMiss = mismatches.filter((m) => m.kind === 'gate');
    expect(gateMiss).toEqual([]);
  });

  it('every light band matches the evidence-derived expectation', () => {
    const bandMiss = mismatches.filter((m) => m.kind === 'band');
    expect(bandMiss).toEqual([]);
  });

  it('writes the engine-correctness report', () => {
    const L: string[] = [];
    const total = gateChecks + bandChecks;
    const agree = total - mismatches.length;
    L.push('# Engine-vs-evidence correctness (rule-application verification)\n');
    L.push(
      'For each spot below, the expected verdict (kept/eliminated) and the expected light band ' +
        "were re-derived **independently** from each plant's own published thresholds " +
        '(`maintenance_lux_min`, the preferred range, `direct_sun_tolerance`) using the documented ' +
        'rule constants, then compared against what the **real engine** output end-to-end ' +
        '(calibration → gates → band). This verifies the engine correctly applies its evidence base; ' +
        'it is internal-validity verification, **not** an expert horticultural trial.\n',
    );
    L.push(
      `**Result:** ${agree} / ${total} plant-spot decisions agreed ` +
        `(${((agree / total) * 100).toFixed(1)}%), across ${SPOTS.length} spots × ${PLANTS.length} plants ` +
        `(gate + band checks). Mismatches: ${mismatches.length}.\n`,
    );

    L.push('## Per-spot agreement\n');
    L.push('| Spot | Description | Calibrated lux | # Recommended | # Eliminated |');
    L.push('|---|---|---:|---:|---:|');
    for (const s of SPOTS) {
      const r = recommend(PLANTS, s.spot);
      L.push(
        `| ${s.id} | ${s.note} | ${applyLuxCalibration(s.spot.lux)} | ` +
          `${r.recommended.length} | ${r.eliminated.length} |`,
      );
    }
    L.push('');

    if (mismatches.length === 0) {
      L.push(
        '## Conclusion\n' +
          'The engine reproduced the evidence-derived verdict in **100%** of plant-spot decisions ' +
          '(every survival-floor and direct-sun gate, and every light-band classification). This ' +
          'demonstrates the recommendation pipeline faithfully and correctly implements the cited ' +
          'thresholds — there is no integration bug between the evidence base and the output.\n',
      );
    } else {
      L.push('## Mismatches (investigate — the engine diverged from the evidence)\n');
      L.push('| Spot | Plant | Check | Expected | Actual |');
      L.push('|---|---|---|---|---|');
      for (const m of mismatches) {
        L.push(`| ${m.spot} | ${m.plant} | ${m.kind} | ${m.expected} | ${m.actual} |`);
      }
      L.push('');
    }

    fs.writeFileSync(path.join(OUT_DIR, 'engine_correctness.md'), L.join('\n'), 'utf-8');
    expect(fs.existsSync(path.join(OUT_DIR, 'engine_correctness.md'))).toBe(true);
  });

  afterAll(() => {
    const total = gateChecks + bandChecks;
    // eslint-disable-next-line no-console
    console.log(
      `\n[engine-correctness] ${total - mismatches.length}/${total} plant-spot decisions agree ` +
        `(${mismatches.length} mismatches) across ${SPOTS.length} spots × ${PLANTS.length} plants`,
    );
  });
});
