/**
 * Plateau-median reduction of a raw light-sensor stream to one robust lux
 * reading. Runtime port of the offline extraction method used to validate the
 * field dataset (tools/extract_phone_readings.py, documented in Ch 3): segment
 * the stream into stable plateaus (new segment when a sample deviates from the
 * running segment median by > max(10%, 30 lx)), then take the median of the
 * chosen plateau instead of a peak or a raw mean.
 *
 * Runtime adaptations (vs the offline 5-position protocol):
 *  - ONE spot per capture, so the reading is the median of the single longest
 *    plateau, not the 5 longest.
 *  - Android TYPE_LIGHT is an on-change sensor — silence means "value held" —
 *    so the stream is hold-last-value resampled onto a uniform grid before
 *    segmentation, and the plateau extends to the capture end.
 *  - No brightness-based artifact filter: the user is guided to hold steady at
 *    the spot, and picking the longest plateau already skips settle-in tilt.
 *
 * Pure functions only (no react-native imports) so this is unit-testable the
 * same way as src/engine.
 */

/** One sensor event. `tMs` is the arrival-time clock the capture controller
 *  uses consistently (sub-100 ms bridge latency is below grid resolution). */
export interface LightSample {
  tMs: number;
  lux: number;
}

/** Tuning constants — REL_TOL/ABS_TOL deliberately mirror the offline
 *  extraction so Ch 3 documents one segmentation criterion, not two. */
export const PLATEAU = {
  relTol: 0.1,
  absTolLux: 30,
  resampleStepMs: 100, // 10 Hz hold-last-value grid
  minPlateauMs: 1000, // shorter stretches are settling, not a reading
  goodPlateauMs: 3000,
  goodCoverage: 0.5,
} as const;

export type CaptureQuality = 'good' | 'fair';

export interface PlateauReading {
  /** Median lux of the chosen plateau — RAW phone lux ("both" mode: the
   *  engine applies LUX_CALIBRATION at scoring time). */
  lux: number;
  quality: CaptureQuality;
  plateauMs: number;
  captureMs: number;
  /** plateauMs / captureMs — how much of the capture was the stable stretch. */
  coverage: number;
  /** (max - min) / median within the plateau, percent — honesty metadata. */
  spreadPct: number;
  /** Raw on-change events received (can be tiny under steady light). */
  sampleCount: number;
}

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Hold-last-value resampling onto a uniform grid from the first sample to
 *  `endMs` inclusive. On-change sensors only report changes, so the latest
 *  value is carried forward across silent stretches. */
export function resampleHoldLast(
  samples: LightSample[],
  endMs: number,
  stepMs: number = PLATEAU.resampleStepMs,
): number[] {
  if (samples.length === 0) return [];
  const sorted = [...samples].sort((a, b) => a.tMs - b.tMs);
  const grid: number[] = [];
  let idx = 0;
  for (let t = sorted[0].tMs; t <= endMs; t += stepMs) {
    while (idx + 1 < sorted.length && sorted[idx + 1].tMs <= t) idx++;
    grid.push(sorted[idx].lux);
  }
  return grid;
}

/** Segment a uniform series into stable plateaus: a new segment starts when a
 *  sample deviates from the running segment median by > max(relTol * median,
 *  absTolLux). Returns [start, end) index pairs of segments that meet the
 *  minimum length; same shape as the offline extraction. */
export function segmentPlateaus(
  vals: number[],
  minSamples: number,
): Array<[number, number]> {
  const segs: Array<[number, number]> = [];
  let start = 0;
  for (let i = 1; i < vals.length; i++) {
    const ref = median(vals.slice(start, i));
    if (Math.abs(vals[i] - ref) > Math.max(PLATEAU.relTol * ref, PLATEAU.absTolLux)) {
      if (i - start >= minSamples) segs.push([start, i]);
      start = i;
    }
  }
  if (vals.length - start >= minSamples) segs.push([start, vals.length]);
  return segs;
}

/**
 * Reduce a capture to one reading: median of the longest stable plateau
 * (later plateau wins a tie — the user has settled by then). Returns null
 * when no plateau reaches minPlateauMs, i.e. the capture was too unsteady to
 * report a number — the UI should ask for a retry rather than guess.
 */
export function extractPlateauReading(
  samples: LightSample[],
  captureEndMs: number,
): PlateauReading | null {
  if (samples.length === 0) return null;

  const stepMs = PLATEAU.resampleStepMs;
  const grid = resampleHoldLast(samples, captureEndMs, stepMs);
  const minSamples = Math.ceil(PLATEAU.minPlateauMs / stepMs);
  const segs = segmentPlateaus(grid, minSamples);
  if (segs.length === 0) return null;

  let best = segs[0];
  for (const seg of segs) {
    if (seg[1] - seg[0] >= best[1] - best[0]) best = seg;
  }

  const plateauVals = grid.slice(best[0], best[1]);
  const med = median(plateauVals);
  const spreadPct =
    med > 0
      ? ((Math.max(...plateauVals) - Math.min(...plateauVals)) / med) * 100
      : 0;

  const plateauMs = (best[1] - best[0]) * stepMs;
  const sortedT = [...samples].sort((a, b) => a.tMs - b.tMs);
  const captureMs = Math.max(captureEndMs - sortedT[0].tMs, stepMs);
  const coverage = Math.min(plateauMs / captureMs, 1);

  const quality: CaptureQuality =
    plateauMs >= PLATEAU.goodPlateauMs && coverage >= PLATEAU.goodCoverage
      ? 'good'
      : 'fair';

  return {
    lux: Math.round(med),
    quality,
    plateauMs,
    captureMs,
    coverage,
    spreadPct,
    sampleCount: samples.length,
  };
}

/** Live steadiness check for the capture UI: is the last `windowMs` of the
 *  stream within plateau tolerance of its own median? */
export function isSteady(
  samples: LightSample[],
  nowMs: number,
  windowMs: number = 1500,
): boolean {
  const recent = samples.filter((s) => s.tMs >= nowMs - windowMs);
  if (samples.length === 0) return false;
  if (recent.length === 0) return true; // on-change silence = steady
  const grid = resampleHoldLast(recent, nowMs);
  const med = median(grid);
  const tol = Math.max(PLATEAU.relTol * med, PLATEAU.absTolLux);
  return grid.every((v) => Math.abs(v - med) <= tol);
}
