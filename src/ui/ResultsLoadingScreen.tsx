/** Brief, delightful loading screen shown while the recommendation list is
 *  "calculating" (the engine itself is instant — this is a deliberate, short
 *  pause purely for polish). A potted plant (reusing HeroPlant) sits under a
 *  sun that swings up and down, then a moon that swings up and down, looping
 *  — a small day/night cycle that echoes the app's whole light-measurement
 *  premise. Below it, a cascading stack of plain-language status lines cycles
 *  through what the engine is actually doing, newest on top at full opacity,
 *  older ones fading below. No photo/bitmap assets — pure SVG, matching the
 *  rest of the app's visual language (DirectSunCard's sun/moon recipe). */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { palette } from '../theme/theme';
import HeroPlant from './HeroPlant';

/** Friendly, plain-language status lines — what the engine is doing, in
 *  user terms. Cycles continuously for as long as the parent keeps this
 *  component mounted. */
const MESSAGES = [
  'Reading your measured light…',
  'Checking your distance from the window…',
  "Looking at today's sun path…",
  'Comparing with 31 real plants…',
  'Finding your best matches…',
] as const;

const MESSAGE_STEP_MS = 480;
/** One full sun-swing + moon-swing cycle, milliseconds. */
const CYCLE_MS = 3200;
const SWING_AMPLITUDE = 26;

/** Sun glyph: warm filled disc + rays, matching DirectSunCard's recipe. */
function SunGlyph({ pulse }: { pulse: number }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={15 + pulse * 2} fill={palette.amber} fillOpacity={0.18} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <Line
            key={i}
            x1={28 + Math.cos(a) * 16}
            y1={28 + Math.sin(a) * 16}
            x2={28 + Math.cos(a) * 22}
            y2={28 + Math.sin(a) * 22}
            stroke={palette.amber}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx={28} cy={28} r={11} fill="#FFD86B" />
    </Svg>
  );
}

/** Moon glyph: soft crescent, matching DirectSunCard's NightView recipe. */
function MoonGlyph({ pulse }: { pulse: number }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={16 + pulse * 2} fill="#FFE9A8" fillOpacity={0.14} />
      <Circle cx={28} cy={28} r={13} fill="#E9EFC9" />
      <Circle cx={22} cy={24} r={11.5} fill={palette.surface} />
    </Svg>
  );
}

export default function ResultsLoadingScreen() {
  const [t, setT] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      setT(now - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setMsgIndex((i) => (i + 1) % MESSAGES.length),
      MESSAGE_STEP_MS,
    );
    return () => clearInterval(id);
  }, []);

  const phase = (t % CYCLE_MS) / CYCLE_MS; // 0 → 1, loops
  const isSun = phase < 0.5;
  // progress within the current half [0,1] — 0 and 1 are both the resting
  // (baseline) position, so swapping sun↔moon exactly at the half boundary
  // never produces a visible jump, only a content swap.
  const pLocal = isSun ? phase / 0.5 : (phase - 0.5) / 0.5;
  const bounceY = -Math.sin(pLocal * Math.PI) * SWING_AMPLITUDE;
  const pulse = (Math.sin((2 * Math.PI * t) / 900) + 1) / 2;

  const lines = [0, 1, 2].map((back) => ({
    text: MESSAGES[(msgIndex - back + MESSAGES.length) % MESSAGES.length],
    opacity: back === 0 ? 1 : back === 1 ? 0.5 : 0.22,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <View style={[styles.glyphWrap, { transform: [{ translateY: bounceY }] }]}>
          {isSun ? <SunGlyph pulse={pulse} /> : <MoonGlyph pulse={pulse} />}
        </View>
        <HeroPlant size={108} />
      </View>

      <View style={styles.messages}>
        {lines.map((l, i) => (
          <Text key={i} style={[styles.messageText, { opacity: l.opacity }]}>
            {l.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  stage: {
    alignItems: 'center',
    marginBottom: 18,
  },
  glyphWrap: {
    marginBottom: -8,
  },
  messages: {
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
