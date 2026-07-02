/** Step 4 — spot light level. Guides the 10 s plateau-median lux capture and
 *  shows the calibrated estimate with the raw phone reading kept visible
 *  ("both" mode — the raw value is what gets validated against the UT383). */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { applyLuxCalibration } from '../engine';
import type { LightCaptureState } from '../sensor/useLightCapture';
import {
  buttonBase,
  cardBase,
  metaBase,
  palette,
  qualityColor,
} from '../theme/theme';
import CardHeader from '../ui/CardHeader';
import GradientButton from '../ui/GradientButton';
import Icon from '../ui/Icon';

/** Phone tilting toward a glowing sun, looping — reinforces "screen toward
 *  the light" before capture starts. The beam only appears once the phone
 *  reaches the tilted (aimed) position. */
function LightAimHint() {
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const leg = (toValue: number) =>
      Animated.timing(tilt, {
        toValue,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const loop = Animated.loop(
      Animated.sequence([
        leg(1),
        Animated.delay(550),
        leg(0),
        Animated.delay(300),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tilt]);

  const rotate = tilt.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-32deg'],
  });
  const glow = tilt.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.9],
  });
  const beam = tilt.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.hintWrap}>
      <View style={styles.hintRow}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name="phone" size={40} color={palette.mint} />
        </Animated.View>
        <Animated.View style={[styles.beam, { opacity: beam }]} />
        <View style={styles.sunWrap}>
          <Animated.View style={[styles.sunGlow, { opacity: glow }]} />
          <Icon name="sun" size={34} color={palette.amber} />
        </View>
      </View>
      <Text style={styles.hintText}>
        Tilt the phone so the screen faces toward the light source
      </Text>
    </View>
  );
}

type Props = {
  state: LightCaptureState;
  durationMs: number;
  onStart: () => void;
  onReset: () => void;
  /** True when the sun was below civil twilight (NIGHT_THRESHOLD_ELEVATION_DEG)
   *  at the moment this capture completed — the reading is then almost
   *  certainly artificial light, not daylight. */
  capturedAtNight?: boolean;
};

export default function LightCaptureCard({
  state,
  durationMs,
  onStart,
  onReset,
  capturedAtNight = false,
}: Props) {
  return (
    <View style={styles.card}>
      <CardHeader
        icon="sun"
        title="Spot light"
        kicker="10 s steady reading at the spot"
        done={state.phase === 'done'}
      />

      {state.phase === 'idle' && (
        <>
          <LightAimHint />
          <Text style={styles.bodyText}>
            Lay the phone at the spot with the screen facing the light, then
            hold it steady for 10 seconds. The reading is the median of the
            steadiest stretch — not a one-off peak.
          </Text>
          <GradientButton title="Measure spot light" icon="sun" onPress={onStart} />
        </>
      )}

      {state.phase === 'capturing' && (
        <>
          <Text style={styles.resultValue}>
            {state.liveLux != null ? `${Math.round(state.liveLux)} lx` : '— lx'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Hold steady…</Text>
            <Text style={styles.metaValue}>
              {Math.max(0, Math.ceil((durationMs - state.elapsedMs) / 1000))}s
              left
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Stability</Text>
            <View style={styles.dotRow}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: state.steady
                      ? palette.leaf
                      : palette.amber,
                  },
                ]}
              />
              <Text style={styles.metaValue}>
                {state.steady ? 'Steady' : 'Settling'}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    (state.elapsedMs / durationMs) * 100,
                  )}%` as `${number}%`,
                },
              ]}
            />
          </View>
        </>
      )}

      {state.phase === 'done' && (
        <>
          <Text style={styles.resultLabel}>CALIBRATED ESTIMATE</Text>
          <Text style={styles.resultValue}>
            {applyLuxCalibration(state.reading.lux)} lx
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Phone raw</Text>
            <Text style={styles.metaValue}>{state.reading.lux} lx</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Capture quality</Text>
            <View style={styles.dotRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: qualityColor(state.reading.quality) },
                ]}
              />
              <Text style={styles.metaValue}>
                {state.reading.quality === 'good' ? 'Good' : 'Fair'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Steady for</Text>
            <Text style={styles.metaValue}>
              {(state.reading.plateauMs / 1000).toFixed(1)} s of{' '}
              {Math.round(state.reading.captureMs / 1000)} s
            </Text>
          </View>

          {capturedAtNight && (
            <View style={styles.nightWarnBox}>
              <Text style={styles.nightWarnTitle}>
                ⚠ It's night-time at this location
              </Text>
              <Text style={styles.nightWarnText}>
                This reading may be coming from other light sources — such as
                ceiling lights, lamps, screens, or streetlight through the
                window — rather than daylight. For accurate results, measure
                this spot again during daylight hours.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.82}
            onPress={onReset}>
            <Text style={styles.secondaryButtonText}>Measure again</Text>
          </TouchableOpacity>
        </>
      )}

      {state.phase === 'failed' && (
        <>
          <Text style={styles.failedText}>{state.reason}</Text>
          <GradientButton title="Retry measurement" onPress={onStart} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  hintWrap: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 8,
    gap: 12,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  beam: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.amber,
  },
  sunWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.amber,
  },
  hintText: {
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  bodyText: {
    color: palette.textDim,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
  },
  primaryButton: { ...buttonBase.primary },
  primaryButtonText: { ...buttonBase.primaryText },
  secondaryButton: { ...buttonBase.secondary, marginTop: 14 },
  secondaryButtonText: { ...buttonBase.secondaryText },
  resultLabel: {
    color: palette.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  resultValue: {
    color: palette.text,
    fontSize: 44,
    fontWeight: '900',
    marginBottom: 12,
  },
  divider: { ...metaBase.divider },
  metaRow: { ...metaBase.row },
  metaLabel: { ...metaBase.label },
  metaValue: { ...metaBase.value },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nightWarnBox: {
    backgroundColor: '#3A2E12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.amber,
    padding: 14,
    marginTop: 14,
    marginBottom: 4,
  },
  nightWarnTitle: {
    color: palette.amber,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  nightWarnText: {
    color: palette.textDim,
    fontSize: 12.5,
    lineHeight: 18,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.inset,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.leaf,
  },
  failedText: {
    color: palette.coral,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
});
