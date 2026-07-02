/** Pure CSV construction for the Ch 4 evaluation log (no react-native
 *  imports). One row = one captured spot session: lux capture metadata,
 *  AR distance, window aspect / sun estimate, top recommendations, and the
 *  user's reference instruments (tape measure, UT383) for the AR-vs-tape and
 *  phone-vs-meter comparisons. */

export const EVAL_LOG_COLUMNS = [
  'timestamp_iso',
  'lux_raw',
  'lux_used',
  'capture_quality',
  'plateau_ms',
  'capture_ms',
  'coverage',
  'spread_pct',
  'sample_count',
  'ar_distance_m',
  'ar_distance_cm',
  'ar_distance_horizontal_cm',
  'ar_snap_spread_mm',
  'ar_plane_mismatch',
  'ar_tool',
  'ar_quality',
  'plant_distance_cm',
  'plant_distance_source',
  'window_width_cm',
  'window_width_source',
  'window_width_quality',
  'window_height_cm',
  'window_height_source',
  'window_height_quality',
  'window_sill_cm',
  'window_sill_source',
  'window_sill_quality',
  'window_skip_reason',
  'window_aspect',
  'magnetic_azimuth_deg',
  'true_azimuth_deg',
  'compass_accuracy',
  'latitude',
  'longitude',
  'geo_source',
  'direct_sun_hours',
  'sun_intervals',
  'plant_lateral_offset_m',
  'top1_id',
  'top1_score',
  'top2_id',
  'top2_score',
  'top3_id',
  'top3_score',
  'recommended_count',
  'eliminated_count',
  'db_generated_at',
  'capture_sun_elevation_deg',
  'sky_condition',
  'ref_tape_distance_cm',
  'ref_tape_width_cm',
  'ref_tape_height_cm',
  'ref_tape_sill_cm',
  'ref_meter_lux_1',
  'ref_meter_lux_2',
  'ref_meter_lux_3',
  'ref_meter_lux_4',
  'ref_meter_lux_5',
  'ref_meter_lux_median',
  'note',
] as const;

export const EVAL_LOG_HEADER = EVAL_LOG_COLUMNS.join(',');

export interface EvalRowInput {
  timestampIso: string;
  luxRaw: number;
  luxUsed: number;
  captureQuality: string;
  plateauMs: number;
  captureMs: number;
  coverage: number;
  spreadPct: number;
  sampleCount: number;
  arDistanceM?: number | null;
  arDistanceCm?: number | null;
  /** Horizontal (floor-plane) component — the tape-protocol comparator. */
  arDistanceHorizontalCm?: number | null;
  /** Worst snap-burst scatter of the two points, mm (null = no burst). */
  arSnapSpreadMm?: number | null;
  /** Window points locked onto different detected planes. */
  arPlaneMismatch?: boolean | null;
  arTool?: string | null;
  arQuality?: string | null;
  /** Engine's effective plant→window distance (cm), whatever the source. */
  plantDistanceCm?: number | null;
  /** How the distance was obtained: 'ar' or 'manual' (tape fallback). */
  plantDistanceSource?: string | null;
  /** Window size step (evaluation data, not an engine input). source is
   *  'ar' (approximate) or 'manual' (tape). */
  windowWidthCm?: number | null;
  windowWidthSource?: string | null;
  windowWidthQuality?: string | null;
  windowHeightCm?: number | null;
  windowHeightSource?: string | null;
  windowHeightQuality?: string | null;
  windowSillCm?: number | null;
  windowSillSource?: string | null;
  windowSillQuality?: string | null;
  windowSkipReason?: string | null;
  windowAspect?: string | null;
  magneticAzimuthDeg?: number | null;
  trueAzimuthDeg?: number | null;
  compassAccuracy?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geoSource?: string | null;
  directSunHours?: number | null;
  /** Pre-formatted "09:05–11:30; 14:00–15:25". */
  sunIntervals?: string | null;
  /** Signed lateral plant offset from the window centre-line (m); + = right when
   *  looking out. Feeds the spot-specific direct-sun estimate (null if unknown). */
  plantLateralOffsetM?: number | null;
  /** Best-first, up to three used. */
  top: Array<{ id: string; score: number }>;
  recommendedCount: number;
  eliminatedCount: number;
  dbGeneratedAt?: string | null;
  /** Sun elevation (deg) at the moment of the light capture — lets night/dusk
   *  captures be filtered from the dataset (below ~3° the lux is not daylight). */
  captureSunElevationDeg?: number | null;
  /** User-tapped sky condition at capture (sunny / partly_cloudy / overcast /
   *  indoor_lit) — context only, never an engine input. */
  skyCondition?: string | null;
  /** Tape-measured ground truth for each of the FOUR independently-fallible AR
   *  outputs (plant distance, window width/height/sill) — kept as four
   *  explicit fields rather than one generic "ref_tape_cm" so a single saved
   *  row can validate all four dimensions at once, unambiguously. */
  refTapeDistanceCm?: string | null;
  refTapeWidthCm?: string | null;
  refTapeHeightCm?: string | null;
  refTapeSillCm?: string | null;
  /** Five repeated UT383 readings, mirroring the field-collection protocol
   *  (tools/analyze_spot_observations.py reads 5 phone + 5 meter columns per
   *  observation) — a single instrument glance is noisier than a median of
   *  five. refMeterLuxMedian is computed by the caller from whichever subset
   *  was actually filled in. */
  refMeterLux1?: string | null;
  refMeterLux2?: string | null;
  refMeterLux3?: string | null;
  refMeterLux4?: string | null;
  refMeterLux5?: string | null;
  refMeterLuxMedian?: number | null;
  note?: string | null;
}

/** RFC-4180-style escaping: quote when the field contains a comma, quote,
 *  or line break; double any embedded quotes. Null/undefined become empty. */
export function csvField(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function round(v: number | null | undefined, dp: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

export function buildEvalRow(r: EvalRowInput): string {
  const top = (i: number) => r.top[i] ?? null;
  const values: Array<string | number | null | undefined> = [
    r.timestampIso,
    r.luxRaw,
    r.luxUsed,
    r.captureQuality,
    r.plateauMs,
    r.captureMs,
    round(r.coverage, 2),
    round(r.spreadPct, 1),
    r.sampleCount,
    round(r.arDistanceM, 3),
    round(r.arDistanceCm, 1),
    round(r.arDistanceHorizontalCm, 1),
    round(r.arSnapSpreadMm, 1),
    r.arPlaneMismatch == null ? null : String(r.arPlaneMismatch),
    r.arTool,
    r.arQuality,
    round(r.plantDistanceCm, 1),
    r.plantDistanceSource,
    round(r.windowWidthCm, 1),
    r.windowWidthSource,
    r.windowWidthQuality,
    round(r.windowHeightCm, 1),
    r.windowHeightSource,
    r.windowHeightQuality,
    round(r.windowSillCm, 1),
    r.windowSillSource,
    r.windowSillQuality,
    r.windowSkipReason,
    r.windowAspect,
    round(r.magneticAzimuthDeg, 1),
    round(r.trueAzimuthDeg, 1),
    r.compassAccuracy,
    round(r.latitude, 5),
    round(r.longitude, 5),
    r.geoSource,
    round(r.directSunHours, 2),
    r.sunIntervals,
    round(r.plantLateralOffsetM, 2),
    top(0)?.id,
    round(top(0)?.score, 1),
    top(1)?.id,
    round(top(1)?.score, 1),
    top(2)?.id,
    round(top(2)?.score, 1),
    r.recommendedCount,
    r.eliminatedCount,
    r.dbGeneratedAt,
    round(r.captureSunElevationDeg, 1),
    r.skyCondition,
    r.refTapeDistanceCm,
    r.refTapeWidthCm,
    r.refTapeHeightCm,
    r.refTapeSillCm,
    r.refMeterLux1,
    r.refMeterLux2,
    r.refMeterLux3,
    r.refMeterLux4,
    r.refMeterLux5,
    round(r.refMeterLuxMedian, 1),
    r.note,
  ];
  return values.map(csvField).join(',');
}
