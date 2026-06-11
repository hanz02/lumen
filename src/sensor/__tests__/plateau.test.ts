import {
  PLATEAU,
  extractPlateauReading,
  isSteady,
  resampleHoldLast,
  segmentPlateaus,
  type LightSample,
} from '../plateau';

/** Dense stream: one sample per resample step, like a chatty sensor. */
function dense(spec: Array<{ ms: number; lux: number | (() => number) }>): {
  samples: LightSample[];
  endMs: number;
} {
  const samples: LightSample[] = [];
  let t = 0;
  for (const { ms, lux } of spec) {
    for (let dt = 0; dt < ms; dt += PLATEAU.resampleStepMs) {
      samples.push({ tMs: t + dt, lux: typeof lux === 'function' ? lux() : lux });
    }
    t += ms;
  }
  return { samples, endMs: t };
}

describe('resampleHoldLast', () => {
  it('carries the last value across on-change silence', () => {
    // Two events 1 s apart, capture runs to 2 s: value held between/after.
    const samples = [
      { tMs: 0, lux: 500 },
      { tMs: 1000, lux: 510 },
    ];
    const grid = resampleHoldLast(samples, 2000, 100);
    expect(grid).toHaveLength(21);
    expect(grid.slice(0, 10)).toEqual(Array(10).fill(500));
    expect(grid.slice(10)).toEqual(Array(11).fill(510));
  });

  it('returns empty for an empty stream', () => {
    expect(resampleHoldLast([], 5000)).toEqual([]);
  });
});

describe('segmentPlateaus', () => {
  it('keeps one segment for variation inside tolerance', () => {
    // ±4% around 1000 lx stays within the 10% running-median tolerance.
    const vals = [1000, 1040, 980, 1010, 960, 1030, 1000, 990, 1020, 1000];
    expect(segmentPlateaus(vals, 3)).toEqual([[0, 10]]);
  });

  it('splits on a jump beyond max(10%, 30 lx)', () => {
    const vals = [...Array(10).fill(1000), ...Array(10).fill(2000)];
    expect(segmentPlateaus(vals, 3)).toEqual([
      [0, 10],
      [10, 20],
    ]);
  });

  it('uses the 30 lx absolute floor in dim rooms (50 -> 70 is one plateau)', () => {
    // 10% of 50 lx is 5 lx, but the absolute floor keeps dim flicker together.
    const vals = [...Array(10).fill(50), ...Array(10).fill(70)];
    expect(segmentPlateaus(vals, 3)).toEqual([[0, 20]]);
  });

  it('drops segments shorter than the minimum', () => {
    const vals = [...Array(10).fill(1000), 2000, 2000, ...Array(10).fill(500)];
    expect(segmentPlateaus(vals, 5)).toEqual([
      [0, 10],
      [12, 22],
    ]);
  });
});

describe('extractPlateauReading', () => {
  it('steady capture: median of the whole stream, good quality', () => {
    const { samples, endMs } = dense([{ ms: 10000, lux: 850 }]);
    const reading = extractPlateauReading(samples, endMs);
    expect(reading).not.toBeNull();
    expect(reading!.lux).toBe(850);
    expect(reading!.quality).toBe('good');
    expect(reading!.coverage).toBeGreaterThan(0.9);
  });

  it('settle-then-steady: picks the long steady plateau, not the tilt-in', () => {
    // 2 s dark (phone still being positioned), then 8 s at the spot.
    const { samples, endMs } = dense([
      { ms: 2000, lux: 120 },
      { ms: 8000, lux: 900 },
    ]);
    const reading = extractPlateauReading(samples, endMs);
    expect(reading!.lux).toBe(900);
    expect(reading!.quality).toBe('good');
  });

  it('sparse on-change events still yield a full-window plateau', () => {
    // Stable light: sensor fires twice in 10 s; silence = steady.
    const samples = [
      { tMs: 0, lux: 640 },
      { tMs: 4000, lux: 655 },
    ];
    const reading = extractPlateauReading(samples, 10000);
    expect(reading).not.toBeNull();
    expect(reading!.lux).toBeGreaterThanOrEqual(640);
    expect(reading!.lux).toBeLessThanOrEqual(655);
    expect(reading!.quality).toBe('good');
    expect(reading!.sampleCount).toBe(2);
  });

  it('two plateaus: the longest wins', () => {
    const { samples, endMs } = dense([
      { ms: 3000, lux: 2000 },
      { ms: 7000, lux: 1200 },
    ]);
    expect(extractPlateauReading(samples, endMs)!.lux).toBe(1200);
  });

  it('noise within tolerance does not split the plateau', () => {
    let flip = false;
    const { samples, endMs } = dense([
      { ms: 10000, lux: () => ((flip = !flip) ? 980 : 1020) },
    ]);
    const reading = extractPlateauReading(samples, endMs);
    // median of an alternating pair lands on one of the two values
    expect(reading!.lux).toBeGreaterThanOrEqual(980);
    expect(reading!.lux).toBeLessThanOrEqual(1020);
    expect(reading!.quality).toBe('good');
    expect(reading!.spreadPct).toBeLessThanOrEqual(10);
  });

  it('returns null when nothing is steady for minPlateauMs', () => {
    // Value doubles every 500 ms — no stable stretch ever forms.
    let lux = 100;
    const samples: LightSample[] = [];
    for (let t = 0; t < 10000; t += 500) {
      samples.push({ tMs: t, lux });
      lux *= 2;
    }
    expect(extractPlateauReading(samples, 10000)).toBeNull();
  });

  it('returns null for an empty capture', () => {
    expect(extractPlateauReading([], 10000)).toBeNull();
  });

  it('short-but-valid plateau in a messy capture is only fair quality', () => {
    // 8 s of wild swinging, then just 2 s steady at the end.
    const swings: Array<{ ms: number; lux: number }> = [];
    for (let i = 0; i < 16; i++) {
      swings.push({ ms: 500, lux: i % 2 === 0 ? 300 : 3000 });
    }
    const { samples, endMs } = dense([...swings, { ms: 2000, lux: 800 }]);
    const reading = extractPlateauReading(samples, endMs);
    expect(reading!.lux).toBe(800);
    expect(reading!.quality).toBe('fair');
  });

  it('reading is raw phone lux (calibration is the engine boundary)', () => {
    // Guards the "both" mode contract: capture must NOT pre-calibrate.
    const { samples, endMs } = dense([{ ms: 10000, lux: 1000 }]);
    expect(extractPlateauReading(samples, endMs)!.lux).toBe(1000);
  });
});

describe('isSteady', () => {
  it('true while the recent window stays within tolerance', () => {
    const { samples } = dense([{ ms: 3000, lux: 700 }]);
    expect(isSteady(samples, 3000)).toBe(true);
  });

  it('false right after a big jump', () => {
    const { samples } = dense([
      { ms: 2000, lux: 700 },
      { ms: 500, lux: 1400 },
    ]);
    expect(isSteady(samples, 2500)).toBe(false);
  });

  it('on-change silence counts as steady', () => {
    // Last event long ago + no changes since = stable light.
    const samples = [{ tMs: 0, lux: 500 }];
    expect(isSteady(samples, 8000)).toBe(true);
  });

  it('false when no samples have arrived at all', () => {
    expect(isSteady([], 2000)).toBe(false);
  });
});
