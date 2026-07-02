import {
  cardinalName,
  cardinalAbbr,
  isTiltedTooFar,
  TILT_WARNING_DEG,
} from '../cardinal';

describe('cardinalName (8-point)', () => {
  it('maps the cardinals at their exact bearings', () => {
    expect(cardinalName(0)).toBe('North');
    expect(cardinalName(90)).toBe('East');
    expect(cardinalName(180)).toBe('South');
    expect(cardinalName(270)).toBe('West');
    expect(cardinalName(45)).toBe('North-east');
    expect(cardinalName(135)).toBe('South-east');
    expect(cardinalName(225)).toBe('South-west');
    expect(cardinalName(315)).toBe('North-west');
  });

  it('rounds to the nearest 45° sector and wraps at 360°', () => {
    expect(cardinalName(22)).toBe('North'); // < 22.5 → N
    expect(cardinalName(23)).toBe('North-east'); // ≥ 22.5 → NE
    expect(cardinalName(359)).toBe('North');
    expect(cardinalName(360)).toBe('North');
    expect(cardinalName(-90)).toBe('West'); // normalised
  });
});

describe('cardinalAbbr (16-point)', () => {
  it('resolves the intercardinal points', () => {
    expect(cardinalAbbr(0)).toBe('N');
    expect(cardinalAbbr(90)).toBe('E');
    expect(cardinalAbbr(247.5)).toBe('WSW');
    expect(cardinalAbbr(292.5)).toBe('WNW');
    expect(cardinalAbbr(281)).toBe('W'); // the field WNW-ish reading rounds to W
  });
});

describe('isTiltedTooFar', () => {
  it('false near flat, true once held upright to read the screen', () => {
    expect(isTiltedTooFar(0)).toBe(false);
    expect(isTiltedTooFar(10)).toBe(false);
    expect(isTiltedTooFar(29)).toBe(false);
    expect(isTiltedTooFar(31)).toBe(true);
    expect(isTiltedTooFar(90)).toBe(true); // held upright, the natural reading posture
  });

  it('defaults to TILT_WARNING_DEG (30°) when no threshold is given', () => {
    expect(TILT_WARNING_DEG).toBe(30);
    expect(isTiltedTooFar(30)).toBe(false); // boundary is exclusive
    expect(isTiltedTooFar(30.1)).toBe(true);
  });

  it('respects a custom threshold', () => {
    expect(isTiltedTooFar(20, 15)).toBe(true);
    expect(isTiltedTooFar(10, 15)).toBe(false);
  });
});
