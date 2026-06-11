import React, { useState } from 'react';
import {
  Alert,
  NativeModules,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { applyLuxCalibration } from './src/engine';
import {
  CAPTURE_DURATION_MS,
  useLightCapture,
} from './src/sensor/useLightCapture';

const { ARModule } = NativeModules;

type ARResult = {
  distanceMeters: number;
  distanceCm: number;
  measurementTool: string;
  overallQuality: string;
  firstPointQuality: string;
  secondPointQuality: string;
};

export default function App() {
  const [result, setResult] = useState<ARResult | null>(null);
  const {
    state: lightState,
    start: startLightCapture,
    reset: resetLightCapture,
  } = useLightCapture();

  const startARMeasurement = async () => {
    try {
      const measurement: ARResult = await ARModule.startARMeasurement();
      setResult(measurement);
    } catch (error: any) {
      Alert.alert(
        'Measurement cancelled',
        error?.message ?? 'Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PLANT AR</Text>
        <Text style={styles.title}>Find Your{'\n'}Plant Spot</Text>
        <Text style={styles.subtitle}>
          Measure window distance with AR to match your spot with the right
          indoor plants.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconBubble}>
          <Text style={styles.iconText}>🌿</Text>
        </View>

        <Text style={styles.cardTitle}>AR Spot Distance</Text>

        <Text style={styles.cardText}>
          Tap + to anchor the plant marker on the floor, then aim at the window
          reference point to capture the distance.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.82}
          onPress={startARMeasurement}>
          <Text style={styles.primaryButtonText}>Start AR Measurement</Text>
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>LATEST MEASUREMENT</Text>

          <Text style={styles.resultValue}>
            {result.distanceMeters >= 1
              ? `${result.distanceMeters.toFixed(2)} m`
              : `${result.distanceCm.toFixed(1)} cm`}
          </Text>

          <View style={styles.divider} />

          <View style={styles.resultRow}>
            <Text style={styles.resultMetaLabel}>Mode</Text>
            <Text style={styles.resultMetaValue}>
              {formatTool(result.measurementTool)}
            </Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultMetaLabel}>Confidence</Text>
            <View style={styles.confidenceRow}>
              <View
                style={[
                  styles.confidenceDot,
                  { backgroundColor: confidenceDotColor(result.overallQuality) },
                ]}
              />
              <Text style={styles.resultMetaValue}>
                {formatQuality(result.overallQuality)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.82}
            onPress={startLightCapture}>
            <Text style={styles.secondaryButtonText}>Continue to light input →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.card, styles.lightCard]}>
        <View style={styles.iconBubble}>
          <Text style={styles.iconText}>☀️</Text>
        </View>

        <Text style={styles.cardTitle}>Spot Light Level</Text>

        {lightState.phase === 'idle' && (
          <>
            <Text style={styles.cardText}>
              Lay the phone at the spot with the screen facing the light, then
              hold it steady for 10 seconds. The reading is the median of the
              steadiest stretch — not a one-off peak.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.82}
              onPress={startLightCapture}>
              <Text style={styles.primaryButtonText}>Measure Spot Light</Text>
            </TouchableOpacity>
          </>
        )}

        {lightState.phase === 'capturing' && (
          <>
            <Text style={styles.resultValue}>
              {lightState.liveLux != null
                ? `${Math.round(lightState.liveLux)} lx`
                : '— lx'}
            </Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultMetaLabel}>Hold steady…</Text>
              <Text style={styles.resultMetaValue}>
                {Math.max(
                  0,
                  Math.ceil((CAPTURE_DURATION_MS - lightState.elapsedMs) / 1000),
                )}
                s left
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultMetaLabel}>Stability</Text>
              <View style={styles.confidenceRow}>
                <View
                  style={[
                    styles.confidenceDot,
                    {
                      backgroundColor: lightState.steady
                        ? '#5BA068'
                        : '#F6C945',
                    },
                  ]}
                />
                <Text style={styles.resultMetaValue}>
                  {lightState.steady ? 'Steady' : 'Settling'}
                </Text>
              </View>
            </View>
          </>
        )}

        {lightState.phase === 'done' && (
          <>
            <Text style={styles.resultLabel}>
              SPOT LIGHT · CALIBRATED ESTIMATE
            </Text>
            <Text style={styles.resultValue}>
              {applyLuxCalibration(lightState.reading.lux)} lx
            </Text>

            <View style={styles.divider} />

            <View style={styles.resultRow}>
              <Text style={styles.resultMetaLabel}>Phone raw</Text>
              <Text style={styles.resultMetaValue}>
                {lightState.reading.lux} lx
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultMetaLabel}>Capture quality</Text>
              <View style={styles.confidenceRow}>
                <View
                  style={[
                    styles.confidenceDot,
                    {
                      backgroundColor:
                        lightState.reading.quality === 'good'
                          ? '#5BA068'
                          : '#F6C945',
                    },
                  ]}
                />
                <Text style={styles.resultMetaValue}>
                  {lightState.reading.quality === 'good' ? 'Good' : 'Fair'}
                </Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultMetaLabel}>Steady for</Text>
              <Text style={styles.resultMetaValue}>
                {(lightState.reading.plateauMs / 1000).toFixed(1)} s of{' '}
                {Math.round(lightState.reading.captureMs / 1000)} s
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.82}
              onPress={resetLightCapture}>
              <Text style={styles.secondaryButtonText}>Measure again</Text>
            </TouchableOpacity>
          </>
        )}

        {lightState.phase === 'failed' && (
          <>
            <Text style={styles.failedText}>{lightState.reason}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.82}
              onPress={startLightCapture}>
              <Text style={styles.primaryButtonText}>Retry Measurement</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          Validate AR distance against a tape measure — and lux against the
          UT383 — for your FYP dataset.
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTool(tool: string) {
  if (tool === 'PLANT_DISTANCE') return 'Plant Distance';
  if (tool === 'WINDOW_MEASURE') return 'Window Measurement';
  return tool;
}

function formatQuality(quality: string) {
  if (quality === 'PLANE') return 'High';
  if (quality === 'DEPTH') return 'Medium';
  if (quality === 'FEATURE_POINT') return 'Low';
  if (quality === 'INSTANT_PLACEMENT') return 'Estimated';
  return quality;
}

function confidenceDotColor(quality: string): string {
  if (quality === 'PLANE') return '#5BA068';
  if (quality === 'DEPTH') return '#F6C945';
  if (quality === 'FEATURE_POINT') return '#E07060';
  if (quality === 'INSTANT_PLACEMENT') return '#8DAE96';
  return '#8DAE96';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#152820',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  lightCard: {
    marginTop: 18,
  },
  failedText: {
    color: '#E07060',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 26,
  },
  header: {
    marginTop: 48,
    marginBottom: 26,
  },
  eyebrow: {
    color: '#5BA068',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: '#F0F5EF',
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 46,
    marginBottom: 12,
  },
  subtitle: {
    color: '#8DAE96',
    fontSize: 15,
    lineHeight: 23,
  },
  card: {
    backgroundColor: '#1E3B2D',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A4A38',
  },
  iconBubble: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#263F30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconText: {
    fontSize: 24,
  },
  cardTitle: {
    color: '#F0F5EF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardText: {
    color: '#8DAE96',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 26,
  },
  primaryButton: {
    backgroundColor: '#5BA068',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#F0F5EF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  resultCard: {
    marginTop: 18,
    backgroundColor: '#1E3B2D',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2A4A38',
  },
  resultLabel: {
    color: '#8DAE96',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  resultValue: {
    color: '#F6C945',
    fontSize: 46,
    fontWeight: '900',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A4A38',
    marginBottom: 14,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultMetaLabel: {
    color: '#8DAE96',
    fontSize: 14,
  },
  resultMetaValue: {
    color: '#F0F5EF',
    fontSize: 14,
    fontWeight: '700',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  secondaryButton: {
    marginTop: 16,
    backgroundColor: '#263F30',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5BA068',
  },
  secondaryButtonText: {
    color: '#5BA068',
    fontSize: 15,
    fontWeight: '900',
  },
  footerNote: {
    marginTop: 'auto',
    paddingBottom: 32,
    paddingTop: 18,
  },
  footerText: {
    color: '#3A5748',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
