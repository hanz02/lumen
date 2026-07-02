import {
  DIRECT_SUN_PARAMS,
  angularDiffDeg,
  azimuthToAspect,
  daylightWindow,
  estimateDirectSun,
  estimateDirectSunThroughAperture,
  formatSunInterval,
  solarPosition,
  sunAzimuthAtMinute,
  sunElevationAtMinute,
} from '../solar';

describe('solarPosition — against known ephemeris values', () => {
  it('declination ≈ +23.43° at the June solstice', () => {
    const t = Date.UTC(2026, 5, 21, 12, 0, 0);
    const pos = solarPosition(t, 0, 0);
    expect(pos.declinationDeg).toBeGreaterThan(23.3);
    expect(pos.declinationDeg).toBeLessThan(23.5);
  });

  it('declination ≈ -23.43° at the December solstice', () => {
    const t = Date.UTC(2026, 11, 21, 12, 0, 0);
    const pos = solarPosition(t, 0, 0);
    expect(pos.declinationDeg).toBeGreaterThan(-23.5);
    expect(pos.declinationDeg).toBeLessThan(-23.3);
  });

  it('declination ≈ 0° at the March equinox', () => {
    const t = Date.UTC(2026, 2, 20, 14, 0, 0); // equinox 2026-03-20 ~14:46 UTC
    const pos = solarPosition(t, 0, 0);
    expect(Math.abs(pos.declinationDeg)).toBeLessThan(0.6);
  });

  it('equation of time ≈ +16.4 min in early November', () => {
    const t = Date.UTC(2026, 10, 3, 12, 0, 0);
    const pos = solarPosition(t, 0, 0);
    expect(pos.equationOfTimeMin).toBeGreaterThan(15.5);
    expect(pos.equationOfTimeMin).toBeLessThan(17.0);
  });

  it('equation of time ≈ -14.2 min in mid-February', () => {
    const t = Date.UTC(2026, 1, 12, 12, 0, 0);
    const pos = solarPosition(t, 0, 0);
    expect(pos.equationOfTimeMin).toBeGreaterThan(-15.0);
    expect(pos.equationOfTimeMin).toBeLessThan(-13.4);
  });

  it('near-vertical sun at the equator on the equinox at solar noon', () => {
    // Solar noon at lon 0 on the equinox: ~12:07 UTC (EoT ≈ -7.5 min)
    const t = Date.UTC(2026, 2, 20, 12, 7, 30);
    const pos = solarPosition(t, 0, 0);
    expect(pos.elevationDeg).toBeGreaterThan(88);
  });

  it('mid-northern-latitude solar noon: sun due south at the expected height', () => {
    // 40°N, lon 0, June solstice; solar noon ≈ 12:00 - EoT(≈ -1.8 min) ≈ 12:02 UTC
    const t = Date.UTC(2026, 5, 21, 12, 2, 0);
    const pos = solarPosition(t, 40, 0);
    expect(Math.abs(pos.azimuthDeg - 180)).toBeLessThan(2);
    // elevation = 90 - (40 - 23.43) = 73.4
    expect(pos.elevationDeg).toBeGreaterThan(72.5);
    expect(pos.elevationDeg).toBeLessThan(74.5);
  });

  it('Kuala Lumpur June noon: sun slightly NORTH of overhead', () => {
    // KL 3.139°N 101.687°E; solar noon ≈ 05:15 UTC (13:15 MYT)
    const t = Date.UTC(2026, 5, 21, 5, 15, 0);
    const pos = solarPosition(t, 3.139, 101.687);
    // elevation = 90 - (23.43 - 3.14) ≈ 69.7
    expect(pos.elevationDeg).toBeGreaterThan(68.5);
    expect(pos.elevationDeg).toBeLessThan(71.0);
    // declination > latitude -> sun is on the NORTH side at noon
    const northness = angularDiffDeg(pos.azimuthDeg, 0);
    expect(northness).toBeLessThan(20);
  });

  it('morning sun is in the east, evening sun in the west (40°N equinox)', () => {
    const morning = solarPosition(Date.UTC(2026, 2, 20, 8, 0, 0), 40, 0);
    const evening = solarPosition(Date.UTC(2026, 2, 20, 16, 0, 0), 40, 0);
    expect(morning.azimuthDeg).toBeGreaterThan(45);
    expect(morning.azimuthDeg).toBeLessThan(180);
    expect(evening.azimuthDeg).toBeGreaterThan(180);
    expect(evening.azimuthDeg).toBeLessThan(315);
  });
});

describe('estimateDirectSun', () => {
  // These assertions are timezone-robust: they depend on which azimuth sector
  // the sun occupies during daylight, which holds for any local calendar day.
  const DEC = new Date(2026, 11, 21, 12, 0, 0);

  it('north-facing window at 40°N gets NO direct sun at the winter solstice', () => {
    const est = estimateDirectSun(DEC, 40, 0, 0);
    expect(est.hours).toBe(0);
    expect(est.intervals).toHaveLength(0);
  });

  it('south-facing window at 40°N gets most of the winter day', () => {
    const est = estimateDirectSun(DEC, 40, 0, 180);
    // ~9.3 h daylight, nearly all of it within ±85° of due south
    expect(est.hours).toBeGreaterThan(7);
    expect(est.hours).toBeLessThan(10);
    expect(est.intervals.length).toBeGreaterThanOrEqual(1);
  });

  it('east window gets morning sun only; west gets the complement (equator equinox)', () => {
    const day = new Date(2026, 2, 20, 12, 0, 0);
    const east = estimateDirectSun(day, 0, 0, 90);
    const west = estimateDirectSun(day, 0, 0, 270);
    expect(east.hours).toBeGreaterThan(4.0);
    expect(east.hours).toBeLessThan(6.8);
    expect(west.hours).toBeGreaterThan(4.0);
    expect(west.hours).toBeLessThan(6.8);
    // disjoint halves of the day: east intervals end before west intervals end
    const eastEnd = Math.max(...east.intervals.map((iv) => iv.endMin));
    const westEnd = Math.max(...west.intervals.map((iv) => iv.endMin));
    expect(eastEnd).toBeLessThan(westEnd);
  });

  it('respects the minimum-elevation floor (no grazing-horizon "sun")', () => {
    const est = estimateDirectSun(DEC, 40, 0, 180);
    for (const iv of est.intervals) {
      expect(iv.endMin - iv.startMin).toBeGreaterThanOrEqual(
        DIRECT_SUN_PARAMS.sampleStepMin,
      );
    }
  });
});

describe('estimateDirectSunThroughAperture — window geometry effects', () => {
  // Equator at the equinox: the sun rises due east, climbs overhead, sets due
  // west — so an EAST window is lit through the morning and a NORTH window
  // never is. A spot 1.2 m back is lit while the sun is at a moderate height.
  const EQ = new Date(2026, 2, 20, 12, 0, 0);
  const E = { lat: 0, lon: 0, az: 90 };
  const base = { widthM: 1.2, sillM: 0.6, topM: 2.0, distanceM: 1.2 };
  const ap = (over: Partial<typeof base>, az = E.az) =>
    estimateDirectSunThroughAperture(EQ, E.lat, E.lon, az, { ...base, ...over });

  it('lets the sun in when the window faces the sun path, not when it faces away', () => {
    const east = ap({});
    const north = ap({}, 0);
    expect(east.hours).toBeGreaterThan(0);
    expect(east.hours).toBeGreaterThan(north.hours);
  });

  it('a wider window admits direct sun for at least as long as a narrow one', () => {
    expect(ap({ widthM: 2.5 }).hours).toBeGreaterThanOrEqual(
      ap({ widthM: 0.5 }).hours,
    );
  });

  it('a taller window head admits at least as much sun as a short one', () => {
    expect(ap({ topM: 2.4 }).hours).toBeGreaterThanOrEqual(ap({ topM: 1.2 }).hours);
  });

  it('a higher sill blocks at least as much low-angle sun as a low sill', () => {
    expect(ap({ sillM: 1.6 }).hours).toBeLessThanOrEqual(ap({ sillM: 0.3 }).hours);
  });

  it('returns clustered local-time intervals consistent with the hours total', () => {
    const est = ap({});
    const minutes = est.intervals.reduce((s, iv) => s + (iv.endMin - iv.startMin), 0);
    expect(minutes / 60).toBeCloseTo(est.hours, 5);
  });
});

describe('estimateDirectSunThroughAperture — lateral plant position', () => {
  // South window at 40°N on the equinox: the sun sweeps east → due south → west,
  // so a centred plant is lit around solar noon and an off-centre plant is lit
  // earlier or later. A moderate cone (1 m wide, 1 m back) makes the shift clear.
  const EQ = new Date(2026, 2, 20, 12, 0, 0);
  const S = { lat: 40, lon: 0, az: 180 };
  const base = { widthM: 1.0, sillM: 0.6, topM: 2.0, distanceM: 1.0 };
  const ap = (over: Partial<typeof base> & { lateralOffsetM?: number }) =>
    estimateDirectSunThroughAperture(EQ, S.lat, S.lon, S.az, { ...base, ...over });
  const midMin = (e: { intervals: Array<{ startMin: number; endMin: number }> }) =>
    e.intervals.length
      ? (e.intervals[0].startMin + e.intervals[e.intervals.length - 1].endMin) / 2
      : NaN;

  it('lateralOffsetM = 0 reproduces the centre-line baseline exactly', () => {
    const baseEst = ap({});
    const zero = ap({ lateralOffsetM: 0 });
    expect(zero.hours).toBe(baseEst.hours);
    expect(zero.intervals).toEqual(baseEst.intervals);
  });

  it('a lateral offset changes when (or how long) the spot is lit', () => {
    const centre = ap({});
    const shifted = ap({ lateralOffsetM: 0.5 });
    const changed =
      shifted.hours !== centre.hours ||
      (shifted.intervals[0]?.startMin ?? -1) !==
        (centre.intervals[0]?.startMin ?? -1);
    expect(changed).toBe(true);
  });

  it('opposite lateral offsets are lit at different times of day', () => {
    const right = ap({ lateralOffsetM: 0.6 });
    const left = ap({ lateralOffsetM: -0.6 });
    expect(right.hours).toBeGreaterThan(0);
    expect(left.hours).toBeGreaterThan(0);
    expect(midMin(right)).not.toBe(midMin(left));
  });
});

describe('daylightWindow', () => {
  // Pick a longitude that puts solar noon at the test runner's LOCAL noon, so the
  // daylight span is a contiguous midday block (it would otherwise wrap past local
  // midnight when the runner's timezone and the longitude disagree). In the real
  // app the captured GPS longitude always matches the device timezone, so daylight
  // is naturally contiguous. utcMin0 = UTC minute-of-day at local midnight; solar
  // noon lands at local noon when lon = -utcMin0/4.
  const utcMin0 = ((new Date().getTimezoneOffset() % 1440) + 1440) % 1440;
  let tzLon = -utcMin0 / 4;
  if (tzLon <= -180) tzLon += 360;

  it('brackets a long summer day at 40°N (sun up 10–20 h, not all day)', () => {
    const dw = daylightWindow(new Date(2026, 5, 21, 0, 0, 0), 40, tzLon);
    expect(dw).not.toBeNull();
    expect(dw!.startMin).toBeLessThan(dw!.endMin);
    const hours = (dw!.endMin - dw!.startMin) / 60;
    expect(hours).toBeGreaterThan(10);
    expect(hours).toBeLessThan(20);
  });

  it('the midpoint of the span is above the elevation floor', () => {
    const day = new Date(2026, 2, 20, 0, 0, 0);
    const dw = daylightWindow(day, 40, tzLon)!;
    const mid = Math.round((dw.startMin + dw.endMin) / 2);
    expect(sunElevationAtMinute(day, 40, tzLon, mid)).toBeGreaterThanOrEqual(
      DIRECT_SUN_PARAMS.minElevationDeg,
    );
  });
});

describe('sunElevationAtMinute', () => {
  it('matches solarPosition at the same local instant (40°N equinox noon)', () => {
    const day = new Date(2026, 2, 20, 0, 0, 0);
    const noon = 12 * 60;
    const viaHelper = sunElevationAtMinute(day, 40, 0, noon);
    const viaDirect = solarPosition(
      new Date(2026, 2, 20, 0, noon).getTime(),
      40,
      0,
    ).elevationDeg;
    expect(viaHelper).toBeCloseTo(viaDirect, 9);
  });

  it('sweeps below and above the horizon across the calendar day', () => {
    // Timezone-robust: over a full 1440-minute day the sun must both rise
    // (max elevation > 0) and set (min elevation < 0) at 40°N in June.
    const day = new Date(2026, 5, 21, 0, 0, 0);
    let lo = Infinity;
    let hi = -Infinity;
    for (let m = 0; m < 1440; m += 10) {
      const el = sunElevationAtMinute(day, 40, 0, m);
      lo = Math.min(lo, el);
      hi = Math.max(hi, el);
    }
    expect(lo).toBeLessThan(0);
    expect(hi).toBeGreaterThan(0);
  });
});

describe('sunAzimuthAtMinute', () => {
  it('matches solarPosition azimuth at the same local instant', () => {
    const day = new Date(2026, 2, 20, 0, 0, 0);
    const m = 9 * 60;
    expect(sunAzimuthAtMinute(day, 40, 0, m)).toBeCloseTo(
      solarPosition(new Date(2026, 2, 20, 0, m).getTime(), 40, 0).azimuthDeg,
      9,
    );
  });

  it('always returns a compass bearing in [0, 360)', () => {
    const day = new Date(2026, 5, 21, 0, 0, 0);
    for (let m = 0; m < 1440; m += 120) {
      const a = sunAzimuthAtMinute(day, 40, 0, m);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(360);
    }
  });
});

describe('azimuthToAspect', () => {
  it('snaps the four cardinal sectors with 45° boundaries', () => {
    expect(azimuthToAspect(0)).toBe('north_facing');
    expect(azimuthToAspect(44.9)).toBe('north_facing');
    expect(azimuthToAspect(315)).toBe('north_facing');
    expect(azimuthToAspect(45)).toBe('east_facing');
    expect(azimuthToAspect(90)).toBe('east_facing');
    expect(azimuthToAspect(180)).toBe('south_facing');
    expect(azimuthToAspect(270)).toBe('west_facing');
    expect(azimuthToAspect(-90)).toBe('west_facing'); // normalised
    expect(azimuthToAspect(405)).toBe('east_facing');
  });
});

describe('formatSunInterval', () => {
  it('renders local HH:MM ranges', () => {
    expect(formatSunInterval({ startMin: 545, endMin: 690 })).toBe(
      '09:05–11:30',
    );
    expect(formatSunInterval({ startMin: 0, endMin: 65 })).toBe('00:00–01:05');
  });
});
