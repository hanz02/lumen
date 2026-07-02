/** Step 1 — plant-spot AR distance. Launches the locked PLANT_DISTANCE AR
 *  session and shows the captured result with the horizontal component first
 *  (the tape-validation protocol measures along the floor). */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ARResult } from '../ar/arMeasurement';
import {
  buttonBase,
  cardBase,
  inputBase,
  metaBase,
  palette,
  qualityColor,
  qualityLabel,
} from '../theme/theme';
import CardHeader from '../ui/CardHeader';
import GradientButton from '../ui/GradientButton';

type Props = {
  result: ARResult | null;
  onMeasure: () => void;
  /** Manual (tape) distance in cm — fallback when AR can't track. Mutually
   *  exclusive with `result`: whichever was set last wins (App.tsx clears the
   *  other). */
  manualDistanceCm?: number | null;
  onManual?: (cm: number) => void;
  /** Signed lateral position fraction in [-1, 1] (−1 far left … 0 centre … +1 far
   *  right, looking out). Optional; refines the direct-sun estimate only. */
  lateralFrac?: number;
  onLateralChange?: (frac: number) => void;
  /** True when ARCore is confirmed not supported on this device — greys out
   *  the AR button so the user goes straight to the tape fallback. */
  arUnsupported?: boolean;
};

/** Tape/manual distance fallback — a small labelled input, committed on blur.
 *  Mirrors the WindowMeasureCard manual-entry pattern. */
function ManualDistanceRow({
  value,
  onManual,
}: {
  value: number | null;
  onManual: (cm: number) => void;
}) {
  const [text, setText] = useState(value != null ? String(value) : '');

  useEffect(() => {
    setText(value != null ? String(value) : '');
  }, [value]);

  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v) && v > 0) {
      onManual(Math.round(v * 10) / 10);
    } else {
      setText(value != null ? String(value) : '');
    }
  };

  return (
    <View style={styles.manualRow}>
      <Text style={styles.manualLabel}>Can’t use AR? Enter distance by tape</Text>
      <TextInput
        style={styles.manualInput}
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        keyboardType="numeric"
        placeholder="cm"
        placeholderTextColor={palette.textFaint}
      />
    </View>
  );
}

/** Five tap positions for where the plant sits along the window width. */
const LATERAL_POSITIONS: Array<{ label: string; value: number }> = [
  { label: 'Far left', value: -1 },
  { label: 'Left', value: -0.5 },
  { label: 'Centre', value: 0 },
  { label: 'Right', value: 0.5 },
  { label: 'Far right', value: 1 },
];

function LateralPicker({
  frac,
  onChange,
}: {
  frac: number;
  onChange: (f: number) => void;
}) {
  return (
    <View style={styles.lateralWrap}>
      <Text style={styles.lateralLabel}>WHERE ALONG THE WINDOW? (OPTIONAL)</Text>
      <Text style={styles.lateralHint}>
        Sets where the plant sits left↔right of the window centre. Refines the
        direct-sun estimate; leave on Centre if unsure.
      </Text>

      {/* window bar with a plant dot at the chosen position */}
      <View style={styles.lateralBar}>
        <View
          style={[
            styles.lateralDot,
            { left: `${((frac + 1) / 2) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.lateralSeg}>
        {LATERAL_POSITIONS.map((p) => {
          const on = Math.abs(frac - p.value) < 0.01;
          return (
            <TouchableOpacity
              key={p.label}
              activeOpacity={0.82}
              onPress={() => onChange(p.value)}
              style={[styles.lateralSegBtn, on && styles.lateralSegBtnOn]}>
              <Text
                style={[styles.lateralSegTxt, on && styles.lateralSegTxtOn]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/** Horizontal is primary; falls back to the 3D line when the activity could
 *  not produce a horizontal component (returned as -1). */
export function primaryDistance(result: ARResult): {
  meters: number;
  cm: number;
  horizontal: boolean;
} {
  if (result.horizontalDistanceMeters > 0) {
    return {
      meters: result.horizontalDistanceMeters,
      cm: result.horizontalDistanceCm,
      horizontal: true,
    };
  }
  return { meters: result.distanceMeters, cm: result.distanceCm, horizontal: false };
}

export function formatDistance(meters: number, cm: number): string {
  return meters >= 1 ? `${meters.toFixed(2)} m` : `${cm.toFixed(1)} cm`;
}

export default function SpotDistanceCard({
  result,
  onMeasure,
  manualDistanceCm = null,
  onManual,
  lateralFrac = 0,
  onLateralChange,
  arUnsupported = false,
}: Props) {
  const hasAR = result != null;
  const hasManual = !hasAR && manualDistanceCm != null;
  const hasDistance = hasAR || hasManual;

  return (
    <View style={styles.card}>
      <CardHeader
        icon="pin"
        title="Plant spot"
        kicker="AR distance · spot → window"
        done={hasDistance}
      />

      {!hasDistance && (
        <Text style={styles.bodyText}>
          Stand at the spot where the plant will live. Tap + to drop a marker on
          the floor at the plant, then tap the floor directly in front of the
          window — the app measures the level distance between the two floor
          points. Or enter it with a tape below if AR can’t track.
        </Text>
      )}

      {hasAR && (
        <>
          <Text style={styles.resultLabel}>
            {primaryDistance(result).horizontal
              ? 'HORIZONTAL · SPOT → WINDOW'
              : 'STRAIGHT LINE · SPOT → WINDOW'}
          </Text>
          <Text style={styles.resultValue}>
            {formatDistance(primaryDistance(result).meters, primaryDistance(result).cm)}
          </Text>

          <View style={styles.divider} />

          {primaryDistance(result).horizontal && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Straight line (3D)</Text>
              <Text style={styles.metaValue}>
                {result.distanceCm.toFixed(1)} cm
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Confidence</Text>
            <View style={styles.dotRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: qualityColor(result.overallQuality) },
                ]}
              />
              <Text style={styles.metaValue}>
                {qualityLabel(result.overallQuality)}{' '}
                <Text style={styles.qualityRaw}>({result.overallQuality})</Text>
              </Text>
            </View>
          </View>

          {result.maxSnapSpreadMm >= 0 && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Point lock scatter</Text>
              <Text style={styles.metaValue}>
                ±{Math.round(result.maxSnapSpreadMm)} mm
              </Text>
            </View>
          )}
        </>
      )}

      {hasManual && (
        <>
          <Text style={styles.resultLabel}>MANUAL (TAPE) · SPOT → WINDOW</Text>
          <Text style={styles.resultValue}>
            {formatDistance(manualDistanceCm / 100, manualDistanceCm)}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Source</Text>
            <View style={styles.dotRow}>
              <View style={[styles.dot, { backgroundColor: palette.amber }]} />
              <Text style={styles.metaValue}>Tape / manual</Text>
            </View>
          </View>
        </>
      )}

      {hasDistance && onLateralChange != null && (
        <LateralPicker frac={lateralFrac} onChange={onLateralChange} />
      )}

      {arUnsupported ? (
        <View style={styles.arUnsupportedBox}>
          <Text style={styles.arUnsupportedText}>
            AR not supported on this device — enter the distance by tape below.
          </Text>
        </View>
      ) : (
        <GradientButton
          title={hasDistance ? 'Measure again with AR' : 'Measure with AR'}
          icon="ruler"
          onPress={onMeasure}
          style={styles.arButton}
        />
      )}

      {onManual != null && (
        <ManualDistanceRow value={manualDistanceCm} onManual={onManual} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
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
  arButton: {
    marginTop: 16,
  },
  arUnsupportedBox: {
    marginTop: 16,
    backgroundColor: palette.inset,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  arUnsupportedText: {
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  qualityRaw: {
    color: palette.textFaint,
    fontSize: 12,
    fontWeight: '400',
  },
  manualLabel: {
    color: palette.textDim,
    fontSize: 13,
    flex: 1,
  },
  manualInput: {
    ...inputBase,
    width: 96,
    paddingHorizontal: 10,
    textAlign: 'right',
  },
  lateralWrap: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: 16,
  },
  lateralLabel: {
    color: palette.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  lateralHint: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  lateralBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.inset,
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 14,
    marginHorizontal: 6,
  },
  lateralDot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.leaf,
    marginLeft: -7,
  },
  lateralSeg: {
    flexDirection: 'row',
    backgroundColor: palette.inset,
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  lateralSegBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  lateralSegBtnOn: {
    backgroundColor: palette.raised,
  },
  lateralSegTxt: {
    color: palette.textFaint,
    fontSize: 10.5,
    fontWeight: '800',
  },
  lateralSegTxtOn: {
    color: palette.mint,
  },
});
