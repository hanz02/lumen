import {
  EVAL_LOG_COLUMNS,
  EVAL_LOG_HEADER,
  buildEvalRow,
  csvField,
  type EvalRowInput,
} from '../evalRow';

const FULL: EvalRowInput = {
  timestampIso: '2026-06-12T14:30:00+08:00',
  luxRaw: 1240,
  luxUsed: 1505,
  captureQuality: 'good',
  plateauMs: 8200,
  captureMs: 10000,
  coverage: 0.8211,
  spreadPct: 4.267,
  sampleCount: 183,
  arDistanceM: 1.2345,
  arDistanceCm: 123.45,
  arDistanceHorizontalCm: 119.82,
  arSnapSpreadMm: 7.4,
  arPlaneMismatch: false,
  arTool: 'PLANT_DISTANCE',
  arQuality: 'PLANE',
  plantDistanceCm: 119.82,
  plantDistanceSource: 'ar',
  windowWidthCm: 118.42,
  windowWidthSource: 'ar',
  windowWidthQuality: 'PLANE',
  windowHeightCm: 142.0,
  windowHeightSource: 'manual',
  windowHeightQuality: null,
  windowSillCm: 91.3,
  windowSillSource: 'manual',
  windowSillQuality: null,
  windowSkipReason: null,
  windowAspect: 'east_facing',
  magneticAzimuthDeg: 88.42,
  trueAzimuthDeg: 88.91,
  compassAccuracy: 'high',
  latitude: 3.139003,
  longitude: 101.686855,
  geoSource: 'last_known',
  directSunHours: 5.4167,
  sunIntervals: '07:20–12:45',
  plantLateralOffsetM: 0.25,
  captureSunElevationDeg: 41.73,
  skyCondition: 'partly_cloudy',
  top: [
    { id: 'ZZ_PLANT', score: 82.46 },
    { id: 'SNAKE_PLANT', score: 77.01 },
    { id: 'DEVILS_IVY', score: 64.5 },
  ],
  recommendedCount: 12,
  eliminatedCount: 19,
  dbGeneratedAt: '2026-06-07T18:00:00',
  refTapeDistanceCm: '121.5',
  refTapeWidthCm: '118.0',
  refTapeHeightCm: '141.5',
  refTapeSillCm: '91.0',
  refMeterLux1: '1450',
  refMeterLux2: '1460',
  refMeterLux3: '1455',
  refMeterLux4: '1470',
  refMeterLux5: '1465',
  refMeterLuxMedian: 1460,
  note: 'bedroom A with blinds half open', // comma-free: split(',') counts fields
};

describe('buildEvalRow', () => {
  it('emits exactly one field per header column (full row)', () => {
    expect(buildEvalRow(FULL).split(',').length).toBe(EVAL_LOG_COLUMNS.length);
  });

  it('emits exactly one field per header column (sparse row)', () => {
    const sparse: EvalRowInput = {
      timestampIso: '2026-06-12T15:00:00+08:00',
      luxRaw: 300,
      luxUsed: 466,
      captureQuality: 'fair',
      plateauMs: 1500,
      captureMs: 10000,
      coverage: 0.15,
      spreadPct: 9,
      sampleCount: 4,
      top: [],
      recommendedCount: 0,
      eliminatedCount: 31,
    };
    const row = buildEvalRow(sparse);
    expect(row.split(',').length).toBe(EVAL_LOG_COLUMNS.length);
    // optional fields are empty, not "null"/"undefined"
    expect(row).not.toMatch(/null|undefined/);
  });

  it('carries the AR accuracy metadata (horizontal, scatter, plane mismatch)', () => {
    const row = buildEvalRow(FULL).split(',');
    const col = (name: string) =>
      row[EVAL_LOG_COLUMNS.indexOf(name as (typeof EVAL_LOG_COLUMNS)[number])];
    expect(col('ar_distance_horizontal_cm')).toBe('119.8');
    expect(col('ar_snap_spread_mm')).toBe('7.4');
    expect(col('ar_plane_mismatch')).toBe('false');
  });

  it('carries lateral offset, capture sun elevation, and sky condition', () => {
    const row = buildEvalRow(FULL).split(',');
    const col = (name: string) =>
      row[EVAL_LOG_COLUMNS.indexOf(name as (typeof EVAL_LOG_COLUMNS)[number])];
    expect(col('plant_lateral_offset_m')).toBe('0.25');
    expect(col('capture_sun_elevation_deg')).toBe('41.7');
    expect(col('sky_condition')).toBe('partly_cloudy');
  });

  it('carries the four tape-reference fields and the five UT383 readings + median', () => {
    const row = buildEvalRow(FULL).split(',');
    const col = (name: string) =>
      row[EVAL_LOG_COLUMNS.indexOf(name as (typeof EVAL_LOG_COLUMNS)[number])];
    expect(col('ref_tape_distance_cm')).toBe('121.5');
    expect(col('ref_tape_width_cm')).toBe('118.0');
    expect(col('ref_tape_height_cm')).toBe('141.5');
    expect(col('ref_tape_sill_cm')).toBe('91.0');
    expect(col('ref_meter_lux_1')).toBe('1450');
    expect(col('ref_meter_lux_2')).toBe('1460');
    expect(col('ref_meter_lux_3')).toBe('1455');
    expect(col('ref_meter_lux_4')).toBe('1470');
    expect(col('ref_meter_lux_5')).toBe('1465');
    expect(col('ref_meter_lux_median')).toBe('1460');
  });

  it('carries the plant distance and its source (ar/manual)', () => {
    const row = buildEvalRow(FULL).split(',');
    const col = (name: string) =>
      row[EVAL_LOG_COLUMNS.indexOf(name as (typeof EVAL_LOG_COLUMNS)[number])];
    expect(col('plant_distance_cm')).toBe('119.8');
    expect(col('plant_distance_source')).toBe('ar');
  });

  it('carries the window-size step with per-dimension source and quality', () => {
    const row = buildEvalRow(FULL).split(',');
    const col = (name: string) =>
      row[EVAL_LOG_COLUMNS.indexOf(name as (typeof EVAL_LOG_COLUMNS)[number])];
    expect(col('window_width_cm')).toBe('118.4');
    expect(col('window_width_source')).toBe('ar');
    expect(col('window_height_source')).toBe('manual');
    expect(col('window_height_quality')).toBe('');
    expect(col('window_sill_cm')).toBe('91.3');
    expect(col('window_skip_reason')).toBe('');
  });

  it('records the skip reason when the window step was skipped', () => {
    const row = buildEvalRow({
      ...FULL,
      windowWidthCm: null,
      windowWidthSource: null,
      windowWidthQuality: null,
      windowHeightCm: null,
      windowHeightSource: null,
      windowSillCm: null,
      windowSillSource: null,
      windowSkipReason: 'reflective frame; no tracking',
    });
    expect(row).toContain('reflective frame; no tracking');
  });

  it('rounds noisy floats to the documented precision', () => {
    const row = buildEvalRow(FULL);
    expect(row).toContain('0.82'); // coverage 2dp
    expect(row).toContain('4.3'); // spread 1dp
    expect(row).toContain('3.139'); // lat 5dp
    expect(row).toContain('5.42'); // sun hours 2dp
    expect(row).toContain('82.5'); // score 1dp
  });

  it('quotes fields containing commas so Excel parses columns correctly', () => {
    const row = buildEvalRow({ ...FULL, note: 'half open, east blinds' });
    expect(row).toContain('"half open, east blinds"');
    expect(row.split(',').length).toBeGreaterThan(EVAL_LOG_COLUMNS.length); // raw split breaks…
    // …but a CSV-aware count (ignore quoted commas) matches:
    const fields = row.match(/("([^"]|"")*"|[^,]*)(,|$)/g);
    expect(row.replace(/"[^"]*"/g, 'X').split(',').length).toBe(
      EVAL_LOG_COLUMNS.length,
    );
    expect(fields).not.toBeNull();
  });
});

describe('csvField', () => {
  it('passes plain values through untouched', () => {
    expect(csvField('east_facing')).toBe('east_facing');
    expect(csvField(42)).toBe('42');
  });

  it('escapes embedded quotes by doubling them', () => {
    expect(csvField('the "big" window')).toBe('"the ""big"" window"');
  });

  it('renders null/undefined as empty', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
  });
});

describe('EVAL_LOG_HEADER', () => {
  it('matches the column list', () => {
    expect(EVAL_LOG_HEADER.split(',').length).toBe(EVAL_LOG_COLUMNS.length);
    expect(EVAL_LOG_HEADER.startsWith('timestamp_iso,lux_raw')).toBe(true);
    expect(
      EVAL_LOG_HEADER.endsWith(
        'ref_tape_distance_cm,ref_tape_width_cm,ref_tape_height_cm,ref_tape_sill_cm,' +
          'ref_meter_lux_1,ref_meter_lux_2,ref_meter_lux_3,ref_meter_lux_4,ref_meter_lux_5,' +
          'ref_meter_lux_median,note',
      ),
    ).toBe(true);
  });
});
