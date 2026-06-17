/** Step 1 — plant-spot AR distance. Launches the locked PLANT_DISTANCE AR
 *  session and shows the captured result with the horizontal component first
 *  (the tape-validation protocol measures along the floor). */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ARResult } from '../ar/arMeasurement';
import {
  buttonBase,
  cardBase,
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
};

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

export default function SpotDistanceCard({ result, onMeasure }: Props) {
  return (
    <View style={styles.card}>
      <CardHeader
        icon="pin"
        title="Plant spot"
        kicker="AR distance · spot → window"
        done={result != null}
      />

      {result == null ? (
        <>
          <Text style={styles.bodyText}>
            Stand at the spot where the plant will live. Tap + to anchor a
            marker on the floor, then aim at the window reference point to
            capture the distance.
          </Text>
          <GradientButton title="Measure with AR" icon="ruler" onPress={onMeasure} />
        </>
      ) : (
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
                {qualityLabel(result.overallQuality)}
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

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.82}
            onPress={onMeasure}>
            <Text style={styles.secondaryButtonText}>Measure again</Text>
          </TouchableOpacity>
        </>
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
});
