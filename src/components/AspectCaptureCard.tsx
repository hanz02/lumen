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
  Vibration,
  View,
} from 'react-native';
import Svg, { Circle, G, Polygon, Text as SvgText } from 'react-native-svg';
import type { WindowAspect } from '../engine';
import type { CompassAccuracy } from '../sensor/compass';
import type { CompassCaptureState } from '../sensor/useCompassCapture';
import { cardinalAbbr, cardinalName, isTiltedTooFar } from '../sensor/cardinal';
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

/** Live compass dial: fixed upright N/E/S/W labels with a needle that points the
 *  way the phone's top edge faces (azimuth, clockwise from north). Lets the user
 *  see at a glance whether the heading matches reality before capturing. */
function CompassRose({ azimuthDeg }: { azimuthDeg: number | null }) {
  const az = azimuthDeg ?? 0;
  return (
    <Svg width={128} height={128} viewBox="0 0 128 128">
      <Circle
        cx={64}
        cy={64}
        r={56}
        fill={palette.inset}
        stroke={palette.hairline}
        strokeWidth={1.5}
      />
      <SvgText x={64} y={22} fill={palette.textDim} fontSize={12} fontWeight="700" textAnchor="middle">
        N
      </SvgText>
      <SvgText x={112} y={68} fill={palette.textDim} fontSize={12} fontWeight="700" textAnchor="middle">
        E
      </SvgText>
      <SvgText x={64} y={116} fill={palette.textDim} fontSize={12} fontWeight="700" textAnchor="middle">
        S
      </SvgText>
      <SvgText x={16} y={68} fill={palette.textDim} fontSize={12} fontWeight="700" textAnchor="middle">
        W
      </SvgText>
      {/* needle points the way the phone faces (green tip = facing direction) */}
      <G rotation={az} origin="64, 64">
        <Polygon points="64,26 56,64 72,64" fill={palette.leaf} />
        <Polygon points="64,102 56,64 72,64" fill={palette.textFaint} />
      </G>
      <Circle cx={64} cy={64} r={4} fill={palette.mint} />
    </Svg>
  );
}

const ACCURACY_COLOR: Record<CompassAccuracy, string> = {
  high: palette.leaf,
  medium: palette.mint,
  low: palette.amber,
  unreliable: palette.coral,
};

function accuracyText(a: CompassAccuracy): string {
  return a.charAt(0).toUpperCase() + a.slice(1);
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
  /** Retry the GPS fix (permission grant didn't guarantee a fix — indoor
   *  signal can still fail once and the app otherwise never tries again). */
  onRetryLocation?: () => void;
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
  onRetryLocation,
}: Props) {
  // Light haptic tick when the live heading crosses into a new cardinal sector —
  // tactile confirmation that the dial is tracking as the user turns the phone.
  const liveCardinal =
    state.phase === 'reading' && state.azimuthDeg != null
      ? cardinalName(state.azimuthDeg)
      : null;
  const prevCardinalRef = useRef<string | null>(null);
  useEffect(() => {
    if (liveCardinal == null) {
      prevCardinalRef.current = null;
      return;
    }
    if (
      prevCardinalRef.current != null &&
      prevCardinalRef.current !== liveCardinal
    ) {
      Vibration.vibrate(12);
    }
    prevCardinalRef.current = liveCardinal;
  }, [liveCardinal]);

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
          <View style={styles.roseWrap}>
            <CompassRose azimuthDeg={state.azimuthDeg} />
          </View>
          <Text style={styles.liveCardinal}>
            {state.azimuthDeg != null
              ? cardinalName(state.azimuthDeg)
              : 'Reading…'}
          </Text>
          {state.azimuthDeg != null && (
            <Text style={styles.liveDegrees}>
              {Math.round(state.azimuthDeg)}° · {cardinalAbbr(state.azimuthDeg)}{' '}
              (magnetic
              {geoStatus === 'ok' ? ' — true heading applied on capture' : ''})
            </Text>
          )}
          {state.tiltDeg != null && isTiltedTooFar(state.tiltDeg) && (
            <Text style={styles.tiltWarning}>
              ⚠ Hold the phone flatter. Tilting it up to read this number is the
              biggest cause of a wrong heading — lay it flat, screen up, and only
              glance at the number once it's settled.
            </Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Compass accuracy</Text>
            <Text
              style={[styles.metaValue, { color: ACCURACY_COLOR[state.accuracy] }]}>
              {accuracyText(state.accuracy)}
            </Text>
          </View>
          {(state.accuracy === 'low' || state.accuracy === 'unreliable') && (
            <Text style={styles.cautionNote}>
              ⚠ Wave the phone in a figure-8 to calibrate. (If the heading still
              looks wrong after that, check the tilt warning above first — a
              tilted phone is the far more common cause than nearby metal.)
            </Text>
          )}
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
            <>
              <Text style={styles.warnNote}>
                No position fix — skipping the direct-sun estimate.
                {geoError != null ? ` (${geoError})` : ''}
              </Text>
              {onRetryLocation != null && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.82}
                  onPress={onRetryLocation}>
                  <Text style={styles.secondaryButtonText}>
                    Retry location
                  </Text>
                </TouchableOpacity>
              )}
            </>
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
  roseWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  liveCardinal: {
    color: palette.text,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  liveDegrees: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  cautionNote: {
    color: palette.amber,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 12,
  },
  tiltWarning: {
    color: palette.coral,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 10,
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
