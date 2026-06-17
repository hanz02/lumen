/** Window-direction capture card: live compass heading while the user points
 *  the phone's top edge out through the window, then the captured aspect with
 *  the SPA direct-sun summary. Wording stays honest: the sun estimate is
 *  potential-only (unobstructed sky) and the compass is an estimate. */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { WindowAspect } from '../engine';
import type { CompassCaptureState } from '../sensor/useCompassCapture';
import { buttonBase, cardBase, metaBase, palette } from '../theme/theme';
import CardHeader from '../ui/CardHeader';
import GradientButton from '../ui/GradientButton';
import Icon from '../ui/Icon';

/** Gently wobbling compass + a one-line gesture cue, shown before capture. */
function CompassHint() {
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const leg = (toValue: number) =>
      Animated.timing(wobble, {
        toValue,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([leg(1), leg(-1), leg(0)]));
    loop.start();
    return () => loop.stop();
  }, [wobble]);

  const rotate = wobble.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-22deg', '22deg'],
  });

  return (
    <View style={styles.hintWrap}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Icon name="compass" size={48} color={palette.mint} />
      </Animated.View>
      <Text style={styles.hintText}>
        Hold the phone flat, top edge pointing out the window
      </Text>
    </View>
  );
}

export type GeoStatus = 'pending' | 'ok' | 'failed' | null;

type Props = {
  state: CompassCaptureState;
  onStart: () => void;
  onCapture: () => void;
  onRetake: () => void;
  /** Direction is an optional engine input — a dead magnetometer must not
   *  dead-end the flow. Shown only in the failed phase. */
  onSkipAfterFailure?: () => void;
  /** Derived by App once captured (true azimuth needs the location fix). */
  aspect: WindowAspect | null;
  trueAzimuthDeg: number | null;
  geoStatus: GeoStatus;
  geoError: string | null;
  /** e.g. "≈ 2.4 h potential direct sun today (09:05–11:30)". */
  sunSummary: string | null;
};

export function formatAspect(aspect: WindowAspect): string {
  if (aspect === 'north_facing') return 'North-facing';
  if (aspect === 'east_facing') return 'East-facing';
  if (aspect === 'south_facing') return 'South-facing';
  return 'West-facing';
}

export default function AspectCaptureCard({
  state,
  onStart,
  onCapture,
  onRetake,
  onSkipAfterFailure,
  aspect,
  trueAzimuthDeg,
  geoStatus,
  geoError,
  sunSummary,
}: Props) {
  return (
    <View style={styles.card}>
      <CardHeader
        icon="compass"
        title="Window facing"
        kicker="compass aspect → direct-sun check"
        done={state.phase === 'captured'}
      />

      {state.phase === 'idle' && (
        <>
          <CompassHint />
          <Text style={styles.bodyText}>
            This estimates the window's compass aspect for the direct-sun check.
          </Text>
          <GradientButton title="Read compass" icon="compass" onPress={onStart} />
        </>
      )}

      {state.phase === 'reading' && (
        <>
          <Text style={styles.resultValue}>
            {state.azimuthDeg != null
              ? `${Math.round(state.azimuthDeg)}°`
              : '—°'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Compass accuracy</Text>
            <Text style={styles.metaValue}>
              {state.accuracy === 'unreliable'
                ? 'Unreliable — wave the phone in a figure-8'
                : state.accuracy.charAt(0).toUpperCase() +
                  state.accuracy.slice(1)}
            </Text>
          </View>
          <GradientButton
            title="Capture direction"
            icon="check"
            onPress={onCapture}
          />
        </>
      )}

      {state.phase === 'captured' && (
        <>
          <Text style={styles.resultLabel}>WINDOW ASPECT (ESTIMATE)</Text>
          <Text style={styles.resultValue}>
            {aspect != null ? formatAspect(aspect) : '…'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Heading</Text>
            <Text style={styles.metaValue}>
              {trueAzimuthDeg != null
                ? `${Math.round(trueAzimuthDeg)}° true`
                : `${Math.round(state.magneticAzimuthDeg)}° magnetic`}
            </Text>
          </View>

          {geoStatus === 'pending' && (
            <Text style={styles.mutedNote}>
              Getting position for the sun estimate…
            </Text>
          )}

          {geoStatus === 'failed' && (
            <Text style={styles.warnNote}>
              No position fix — skipping the direct-sun estimate.
              {geoError != null ? ` (${geoError})` : ''}
            </Text>
          )}

          {sunSummary != null && (
            <Text style={styles.sunNote}>
              ☀ {sunSummary}, assuming an unobstructed sky.
            </Text>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.82}
            onPress={onRetake}>
            <Text style={styles.secondaryButtonText}>Read again</Text>
          </TouchableOpacity>
        </>
      )}

      {state.phase === 'failed' && (
        <>
          <Text style={styles.warnNote}>{state.reason}</Text>
          <GradientButton title="Retry" onPress={onStart} />
          {onSkipAfterFailure != null && (
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.82}
              onPress={onSkipAfterFailure}>
              <Text style={styles.secondaryButtonText}>
                Continue without direction (logged)
              </Text>
            </TouchableOpacity>
          )}
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
    gap: 12,
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
  primaryButton: { ...buttonBase.primary, marginTop: 8 },
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
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 12,
  },
  divider: { ...metaBase.divider },
  metaRow: { ...metaBase.row },
  metaLabel: { ...metaBase.label },
  metaValue: { ...metaBase.value },
  mutedNote: {
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  warnNote: {
    color: palette.coral,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 10,
  },
  sunNote: {
    color: palette.amber,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
});
