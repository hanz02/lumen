import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { applyLuxCalibration, recommend } from './src/engine';
import type { Plant } from './src/engine';
import { loadPlants, loadPlantDbMeta } from './src/data/plantStore';
import type { PlantDbMeta } from './src/data/plantStore';
import RecommendationList from './src/components/RecommendationList';
import AspectCaptureCard from './src/components/AspectCaptureCard';
import type { GeoStatus } from './src/components/AspectCaptureCard';
import EvaluationCard from './src/components/EvaluationCard';
import type { EvalRefs } from './src/components/EvaluationCard';
import SpotDistanceCard from './src/components/SpotDistanceCard';
import LightCaptureCard from './src/components/LightCaptureCard';
import LightConditionsModal from './src/components/LightConditionsModal';
import type { DaylightStatus } from './src/components/LightConditionsModal';
import DirectSunCard from './src/components/DirectSunCard';
import {
  CAPTURE_DURATION_MS,
  useLightCapture,
} from './src/sensor/useLightCapture';
import { useCompassCapture } from './src/sensor/useCompassCapture';
import { getPositionWithPermission } from './src/location/location';
import type { GeoFix } from './src/location/location';
import {
  APERTURE_PARAMS,
  azimuthToAspect,
  DIRECT_SUN_PARAMS,
  estimateDirectSun,
  estimateDirectSunThroughAperture,
  formatSunInterval,
  solarPosition,
  sunAzimuthAtMinute,
  sunElevationAtMinute,
} from './src/sun/solar';
import { buildEvalRow } from './src/eval/evalRow';
import {
  clearEvalLog,
  exportEvalLog,
  getEvalLogStat,
  saveEvalRow,
} from './src/eval/evalLog';
import { startARMeasurement } from './src/ar/arMeasurement';
import type { ARResult } from './src/ar/arMeasurement';
import WindowMeasureCard, {
  EMPTY_WINDOW_DIMS,
  windowStepComplete,
} from './src/components/WindowMeasureCard';
import type { WindowDimKey, WindowDims } from './src/components/WindowMeasureCard';
import { palette } from './src/theme/theme';
import Backdrop from './src/ui/Backdrop';
import GradientButton from './src/ui/GradientButton';
import Icon from './src/ui/Icon';
import HeroPlant from './src/ui/HeroPlant';
import LumenMark from './src/ui/LumenMark';
import StepProgress from './src/ui/StepProgress';
import type { Step } from './src/ui/StepProgress';
import FadeSlideIn from './src/ui/FadeSlideIn';
import Toast, { useToast } from './src/ui/Toast';

const WINDOW_DIM_AR_LABELS: Record<WindowDimKey, string> = {
  width: 'Window WIDTH',
  height: 'Window HEIGHT',
  sill: 'SILL HEIGHT (sill to floor)',
};

/** Screen indices. 0 is the welcome hero; 1–4 are the locked capture steps,
 *  5 is the recommendation payoff. */
const WELCOME = 0;
const SPOT = 1;
const WINDOW = 2;
const LIGHT = 3;
const FACING = 4;
const RESULTS = 5;

const STEPS: Step[] = [
  { key: 'spot', label: 'Spot' },
  { key: 'window', label: 'Window' },
  { key: 'light', label: 'Light' },
  { key: 'facing', label: 'Facing' },
  { key: 'plants', label: 'Plants' },
];

export default function App() {
  const [step, setStep] = useState(WELCOME);
  const [distanceResult, setDistanceResult] = useState<ARResult | null>(null);
  const [windowDims, setWindowDims] = useState<WindowDims>(EMPTY_WINDOW_DIMS);
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [plantsError, setPlantsError] = useState<string | null>(null);
  const {
    state: lightState,
    start: startLightCapture,
    reset: resetLightCapture,
  } = useLightCapture();

  const {
    state: compassState,
    start: startCompass,
    capture: captureCompass,
    reset: resetCompass,
  } = useCompassCapture();
  const [geo, setGeo] = useState<GeoFix | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lightChecklistAcked, setLightChecklistAcked] = useState(false);
  const [dbMeta, setDbMeta] = useState<PlantDbMeta | null>(null);
  const [evalRowCount, setEvalRowCount] = useState(0);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const refreshEvalCount = useCallback(async () => {
    try {
      const stat = await getEvalLogStat();
      setEvalRowCount(Math.max(0, stat.lines - 1)); // header is not a data row
    } catch {
      // native module unavailable (tests) — leave the count at 0
    }
  }, []);

  useEffect(() => {
    loadPlants()
      .then(setPlants)
      .catch((error: any) =>
        setPlantsError(error?.message ?? 'Could not load the plant database.'),
      );
    loadPlantDbMeta()
      .then(setDbMeta)
      .catch(() => {});
    refreshEvalCount();
  }, [refreshEvalCount]);

  // One position fix per session. Requested as soon as the user reaches the
  // spot-light step (it feeds the daytime check there) — falling back to the
  // aspect capture trigger if they somehow skip ahead. Also turns the
  // magnetic heading into true north + sun math at the Facing step.
  useEffect(() => {
    if (geoStatus !== null) return;
    if (step !== LIGHT && compassState.phase !== 'captured') return;
    setGeoStatus('pending');
    getPositionWithPermission()
      .then((fix) => {
        setGeo(fix);
        setGeoStatus('ok');
      })
      .catch((error: any) => {
        setGeoError(error?.message ?? 'No position fix.');
        setGeoStatus('failed');
      });
  }, [step, compassState.phase, geoStatus]);

  // Daytime check for the spot-light step: reuses the SPA's minElevationDeg
  // floor (the same "is the sun usefully up" threshold as the direct-sun
  // estimate) rather than inventing a separate constant.
  const sunElevationNow = useMemo(() => {
    if (geo == null) return null;
    return solarPosition(Date.now(), geo.latitude, geo.longitude).elevationDeg;
  }, [geo]);

  const daylightStatus: DaylightStatus = useMemo(() => {
    if (geoStatus === 'failed') return 'unknown';
    if (sunElevationNow == null) return 'checking';
    return sunElevationNow >= DIRECT_SUN_PARAMS.minElevationDeg ? 'day' : 'night';
  }, [geoStatus, sunElevationNow]);

  const aspectInfo = useMemo(() => {
    if (compassState.phase !== 'captured') return null;
    const magnetic = compassState.magneticAzimuthDeg;
    const trueAz =
      geo != null ? (magnetic + geo.declinationDeg + 360) % 360 : null;
    return {
      magneticAzimuthDeg: magnetic,
      trueAzimuthDeg: trueAz,
      // without a fix, fall back to magnetic — declination is far below the
      // 90° sector width nearly everywhere
      aspect: azimuthToAspect(trueAz ?? magnetic),
      accuracy: compassState.accuracy,
    };
  }, [compassState, geo]);

  // Prefer the spot-specific aperture model when the full window geometry +
  // distance are known (width sets the azimuth cone, sill/head the vertical
  // reach); otherwise fall back to the orientation-only whole-window estimate.
  const sunResult = useMemo(() => {
    if (aspectInfo?.trueAzimuthDeg == null || geo == null) return null;
    const az = aspectInfo.trueAzimuthDeg;
    const w = windowDims.width;
    const h = windowDims.height;
    const s = windowDims.sill;
    const distM =
      distanceResult != null
        ? distanceResult.horizontalDistanceMeters > 0
          ? distanceResult.horizontalDistanceMeters
          : distanceResult.distanceMeters
        : null;
    if (w != null && h != null && s != null && distM != null && distM > 0) {
      const aperture = {
        widthM: w.cm / 100,
        sillM: s.cm / 100,
        topM: (s.cm + h.cm) / 100,
        distanceM: distM,
      };
      return {
        estimate: estimateDirectSunThroughAperture(
          new Date(),
          geo.latitude,
          geo.longitude,
          az,
          aperture,
        ),
        perSpot: true,
        aperture,
      };
    }
    return {
      estimate: estimateDirectSun(new Date(), geo.latitude, geo.longitude, az),
      perSpot: false,
      aperture: null,
    };
  }, [aspectInfo, geo, windowDims, distanceResult]);

  const sunEstimate = sunResult?.estimate ?? null;

  // Geometry for the side-view ray diagram: only when the spot-specific aperture
  // model actually ran and some direct sun is expected. The drawn ray uses the
  // sun's elevation at the midpoint of the longest sun interval — its most
  // representative moment of penetration (ties the picture to a real sample).
  const sunDiagram = useMemo(() => {
    if (sunResult == null || !sunResult.perSpot || sunResult.aperture == null) {
      return null;
    }
    const est = sunResult.estimate;
    if (est.hours <= 0 || est.intervals.length === 0 || geo == null) return null;
    const longest = est.intervals.reduce((a, b) =>
      b.endMin - b.startMin > a.endMin - a.startMin ? b : a,
    );
    const midMin = (longest.startMin + longest.endMin) / 2;
    const winAz = aspectInfo?.trueAzimuthDeg;
    if (winAz == null) return null;
    const { widthM, sillM, topM, distanceM } = sunResult.aperture;
    const now = new Date();
    const el = (m: number) =>
      sunElevationAtMinute(now, geo.latitude, geo.longitude, m);
    const az = (m: number) =>
      sunAzimuthAtMinute(now, geo.latitude, geo.longitude, m);
    return {
      widthM,
      sillM,
      topM,
      distanceM,
      plantTopM: APERTURE_PARAMS.assumedPlantTopM,
      windowAzimuthDeg: winAz,
      // representative ray + the interval's endpoints, so the side view can sweep
      // the sun's elevation and the top view can sweep its azimuth over the time
      // the spot is actually lit. intervalMinutes lets the top view scale its
      // bright span to the true duration (a shorter window → shorter bright sweep).
      intervalMinutes: longest.endMin - longest.startMin,
      elevationDeg: el(midMin),
      elevationStartDeg: el(longest.startMin),
      elevationEndDeg: el(longest.endMin),
      sunAzStartDeg: az(longest.startMin),
      sunAzEndDeg: az(longest.endMin),
      peakLabel: formatSunInterval(longest),
    };
  }, [sunResult, geo, aspectInfo]);

  const sunSummary = useMemo(() => {
    if (sunEstimate == null) return null;
    const windows = sunEstimate.intervals.map(formatSunInterval).join(', ');
    const where = sunResult?.perSpot ? 'spot' : 'window';
    return sunEstimate.hours === 0
      ? `No direct sun can reach this ${where} today`
      : `≈ ${sunEstimate.hours.toFixed(1)} h potential direct sun at this ${where} today (${windows})`;
  }, [sunEstimate, sunResult]);

  const windowDone = windowStepComplete(windowDims);
  const lightDone = lightState.phase === 'done';
  const distanceDone = distanceResult != null;

  // Recommendations are gated on the full capture protocol: plant-spot
  // distance + window size (or logged skip) + lux. Window size is recorded
  // for the evaluation dataset only — it is never an engine input.
  const recommendations = useMemo(() => {
    if (plants == null || !lightDone || !distanceDone || !windowDone) {
      return null;
    }
    return recommend(plants, {
      lux: lightState.reading.lux, // RAW — the engine calibrates ("both" mode)
      // horizontal component: tape protocol measures along the floor, and the
      // distance-zone construct (Ch 2.5) is horizontal distance from window
      distanceToWindowM:
        distanceResult.horizontalDistanceMeters > 0
          ? distanceResult.horizontalDistanceMeters
          : distanceResult.distanceMeters,
      windowAspect: aspectInfo != null ? aspectInfo.aspect : null,
      directSunHours: sunEstimate != null ? sunEstimate.hours : null,
    });
  }, [
    plants,
    lightDone,
    distanceDone,
    windowDone,
    lightState,
    distanceResult,
    aspectInfo,
    sunEstimate,
  ]);

  const inputsLine = useMemo(() => {
    if (recommendations == null) return null;
    const sun =
      sunEstimate != null ? 'direct sun ✓' : 'direct sun not captured';
    const win = windowDims.skipReason
      ? 'window size skipped'
      : 'window size recorded';
    return `light ✓ · distance ✓ · ${sun} · ${win}`;
  }, [recommendations, sunEstimate, windowDims.skipReason]);

  // Per-node completion + how far the user is allowed to navigate. Each capture
  // unlocks the next; once the three required captures are done, both the
  // optional Facing step and the Results payoff open.
  const completed = useMemo(
    () => [
      distanceDone,
      windowDone,
      lightDone,
      compassState.phase === 'captured',
      recommendations != null,
    ],
    [distanceDone, windowDone, lightDone, compassState.phase, recommendations],
  );

  const maxReachable = useMemo(() => {
    if (!distanceDone) return 0;
    if (!windowDone) return 1;
    if (!lightDone) return 2;
    return 4; // Facing (3) optional and Results (4) both open
  }, [distanceDone, windowDone, lightDone]);

  const canContinue = useMemo(() => {
    if (step === SPOT) return distanceDone;
    if (step === WINDOW) return windowDone;
    if (step === LIGHT) return lightDone;
    if (step === FACING) return true; // direction is optional
    return false;
  }, [step, distanceDone, windowDone, lightDone]);

  const handleSaveEval = useCallback(
    async (refs: EvalRefs) => {
      if (lightState.phase !== 'done' || recommendations == null) {
        throw new Error('Measure light first.');
      }
      const reading = lightState.reading;
      const row = buildEvalRow({
        timestampIso: new Date().toISOString(),
        luxRaw: reading.lux,
        luxUsed: applyLuxCalibration(reading.lux),
        captureQuality: reading.quality,
        plateauMs: reading.plateauMs,
        captureMs: reading.captureMs,
        coverage: reading.coverage,
        spreadPct: reading.spreadPct,
        sampleCount: reading.sampleCount,
        arDistanceM: distanceResult?.distanceMeters ?? null,
        arDistanceCm: distanceResult?.distanceCm ?? null,
        arDistanceHorizontalCm:
          distanceResult != null && distanceResult.horizontalDistanceCm > 0
            ? distanceResult.horizontalDistanceCm
            : null,
        arSnapSpreadMm:
          distanceResult != null && distanceResult.maxSnapSpreadMm >= 0
            ? distanceResult.maxSnapSpreadMm
            : null,
        arPlaneMismatch: distanceResult?.planeMismatch ?? null,
        arTool: distanceResult?.measurementTool ?? null,
        arQuality: distanceResult?.overallQuality ?? null,
        windowWidthCm: windowDims.width?.cm ?? null,
        windowWidthSource: windowDims.width?.source ?? null,
        windowWidthQuality: windowDims.width?.quality ?? null,
        windowHeightCm: windowDims.height?.cm ?? null,
        windowHeightSource: windowDims.height?.source ?? null,
        windowHeightQuality: windowDims.height?.quality ?? null,
        windowSillCm: windowDims.sill?.cm ?? null,
        windowSillSource: windowDims.sill?.source ?? null,
        windowSillQuality: windowDims.sill?.quality ?? null,
        windowSkipReason: windowDims.skipReason,
        windowAspect: aspectInfo?.aspect ?? null,
        magneticAzimuthDeg: aspectInfo?.magneticAzimuthDeg ?? null,
        trueAzimuthDeg: aspectInfo?.trueAzimuthDeg ?? null,
        compassAccuracy: aspectInfo?.accuracy ?? null,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        geoSource: geo?.source ?? null,
        directSunHours: sunEstimate?.hours ?? null,
        sunIntervals:
          sunEstimate != null
            ? sunEstimate.intervals.map(formatSunInterval).join('; ')
            : null,
        top: recommendations.recommended
          .slice(0, 3)
          .map((r) => ({ id: r.plant_id, score: r.score })),
        recommendedCount: recommendations.recommended.length,
        eliminatedCount: recommendations.eliminated.length,
        dbGeneratedAt: dbMeta?.generated_at ?? null,
        refTapeCm: refs.tapeCm || null,
        refMeterLux: refs.meterLux || null,
        note: refs.note || null,
      });
      await saveEvalRow(row);
      await refreshEvalCount();
    },
    [
      lightState,
      recommendations,
      distanceResult,
      windowDims,
      aspectInfo,
      geo,
      sunEstimate,
      dbMeta,
      refreshEvalCount,
    ],
  );

  const handleClearEval = useCallback(async () => {
    await clearEvalLog();
    await refreshEvalCount();
  }, [refreshEvalCount]);

  const measureDistance = async () => {
    try {
      const measurement = await startARMeasurement({
        tool: 'PLANT_DISTANCE',
        lockTool: true,
        label: 'Plant spot distance',
      });
      if (measurement.measurementTool !== 'PLANT_DISTANCE') return; // safety
      setDistanceResult(measurement);
    } catch (error: any) {
      showToast({
        title: 'Measurement cancelled',
        message: error?.message ?? 'Please try again.',
        variant: 'info',
      });
    }
  };

  const measureWindowDim = async (key: WindowDimKey) => {
    try {
      const measurement = await startARMeasurement({
        tool: 'WINDOW_MEASURE',
        lockTool: true,
        label: WINDOW_DIM_AR_LABELS[key],
        measureKind: key,
      });
      if (measurement.measurementTool !== 'WINDOW_MEASURE') return; // safety
      setWindowDims((dims) => ({
        ...dims,
        skipReason: null,
        [key]: {
          cm: Math.round(measurement.distanceCm * 10) / 10,
          source: 'ar',
          quality: measurement.overallQuality,
        },
      }));
    } catch (error: any) {
      showToast({
        title: 'Measurement cancelled',
        message: error?.message ?? 'Please try again.',
        variant: 'info',
      });
    }
  };

  const setManualWindowDim = (key: WindowDimKey, cm: number) => {
    setWindowDims((dims) => ({
      ...dims,
      skipReason: null,
      [key]: { cm, source: 'manual', quality: null },
    }));
  };

  // Floor-to-ceiling windows have no sill: record sill = 0 (treated as a
  // declared/manual value), or clear it again when unticked.
  const setWindowNoSill = (noSill: boolean) => {
    setWindowDims((dims) => ({
      ...dims,
      skipReason: null,
      sill: noSill ? { cm: 0, source: 'manual', quality: null } : null,
    }));
  };

  const setWindowSkip = (reason: string | null) => {
    setWindowDims((dims) => ({ ...dims, skipReason: reason }));
  };

  const startOver = () => {
    setDistanceResult(null);
    setWindowDims(EMPTY_WINDOW_DIMS);
    resetLightCapture();
    resetCompass();
    setStep(SPOT);
  };

  // ---- Welcome -----------------------------------------------------------
  if (step === WELCOME) {
    return (
      <Backdrop>
        <SafeAreaView style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.welcomeContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <LumenMark size={28} />
              </View>
              <Text style={styles.brandWord}>Lumen</Text>
            </View>

            <View style={styles.hero}>
              <HeroPlant size={240} />
            </View>

            <Text style={styles.heroTitle}>
              The right plant for your{'\n'}
              <Text style={styles.heroTitleAccent}>exact spot</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              We measure the real light at your spot and match it to plants —
              every pick explained.
            </Text>

            <View style={styles.featureList}>
              <FeatureRow
                icon="ruler"
                title="AR distance"
                body="Spot-to-window, tape-validated."
              />
              <FeatureRow
                icon="sun"
                title="Real lux"
                body="A steady reading, not a peak."
              />
              <FeatureRow
                icon="sparkle"
                title="Explained picks"
                body="A plain-language reason for each."
              />
            </View>

            <GradientButton
              title="Begin"
              icon="arrowRight"
              onPress={() => setStep(SPOT)}
              style={styles.beginButton}
            />
            <Text style={styles.welcomeFootnote}>
              Honest by design: AR distance is reliable; window size is an
              approximate prototype input.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Backdrop>
    );
  }

  // ---- Capture / results -------------------------------------------------
  return (
    <Backdrop>
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.brandRowSmall}
            activeOpacity={0.7}
            onPress={() => setStep(WELCOME)}>
            <View style={styles.brandMarkSmall}>
              <LumenMark size={19} />
            </View>
            <Text style={styles.brandWordSmall}>Lumen</Text>
          </TouchableOpacity>
          <Text style={styles.stepCounter}>
            {step === RESULTS ? 'RESULTS' : `STEP ${step} / 4`}
          </Text>
        </View>

        <View style={styles.railWrap}>
          <StepProgress
            steps={STEPS}
            current={step - 1}
            completed={completed}
            maxReachable={maxReachable}
            onJump={(i) => setStep(i + 1)}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {step === SPOT && (
            <FadeSlideIn>
              <SpotDistanceCard
                result={distanceResult}
                onMeasure={measureDistance}
              />
            </FadeSlideIn>
          )}

          {step === WINDOW && (
            <FadeSlideIn>
              <WindowMeasureCard
                dims={windowDims}
                onMeasureAR={measureWindowDim}
                onManual={setManualWindowDim}
                onToggleNoSill={setWindowNoSill}
                onSkip={setWindowSkip}
              />
            </FadeSlideIn>
          )}

          {step === LIGHT && (
            <FadeSlideIn>
              <LightCaptureCard
                state={lightState}
                durationMs={CAPTURE_DURATION_MS}
                onStart={startLightCapture}
                onReset={resetLightCapture}
              />
            </FadeSlideIn>
          )}

          <LightConditionsModal
            visible={step === LIGHT && !lightChecklistAcked}
            status={daylightStatus}
            elevationDeg={sunElevationNow}
            onAcknowledge={() => setLightChecklistAcked(true)}
          />

          {step === FACING && (
            <FadeSlideIn>
              <AspectCaptureCard
                state={compassState}
                onStart={startCompass}
                onCapture={captureCompass}
                onRetake={() => {
                  resetCompass();
                  startCompass();
                }}
                onSkipAfterFailure={() => setStep(RESULTS)}
                aspect={aspectInfo != null ? aspectInfo.aspect : null}
                trueAzimuthDeg={
                  aspectInfo != null ? aspectInfo.trueAzimuthDeg : null
                }
                geoStatus={geoStatus}
                geoError={geoError}
                sunSummary={sunSummary}
              />
            </FadeSlideIn>
          )}

          {step === RESULTS && (
            <>
              {recommendations != null && (
                <FadeSlideIn style={styles.sunCardWrap}>
                  <RecommendationList
                    result={recommendations}
                    inputsLine={inputsLine}
                  />
                </FadeSlideIn>
              )}

              {plantsError != null && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>
                    Plant database unavailable: {plantsError}
                  </Text>
                </View>
              )}

              <FadeSlideIn
                style={styles.sunCardWrap}
                delay={recommendations != null ? 90 : 0}>
                {sunEstimate != null ? (
                  <DirectSunCard
                    hours={sunEstimate.hours}
                    intervalLabels={sunEstimate.intervals.map(formatSunInterval)}
                    perSpot={sunResult?.perSpot ?? false}
                    diagram={sunDiagram}
                  />
                ) : (
                  <View style={styles.sunPromptCard}>
                    <View style={styles.sunPromptIcon}>
                      <Icon name="sun" size={22} color={palette.mint} />
                    </View>
                    <Text style={styles.sunPromptTitle}>
                      Direct sun — not estimated yet
                    </Text>
                    <Text style={styles.sunPromptBody}>
                      {compassState.phase !== 'captured'
                        ? 'Capture the window facing to estimate when direct sun reaches this spot.'
                        : geoStatus === 'failed'
                        ? 'A GPS fix is needed for the sun estimate, but none was available. Re-capture the window facing with location on.'
                        : 'Getting your position for the sun estimate…'}
                    </Text>
                    {compassState.phase !== 'captured' && (
                      <GradientButton
                        title="Capture window facing"
                        icon="compass"
                        onPress={() => setStep(FACING)}
                        style={styles.sunPromptButton}
                      />
                    )}
                  </View>
                )}
              </FadeSlideIn>

              <View style={styles.spacer} />

              <EvaluationCard
                canSave={recommendations != null}
                rowCount={evalRowCount}
                onSave={handleSaveEval}
                onExport={exportEvalLog}
                onClear={handleClearEval}
              />

              <Text style={styles.footerText}>
                Validate AR distance against a tape measure — and lux against
                the UT383 — for your FYP dataset.
              </Text>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.75}
            onPress={() => setStep(step === SPOT ? WELCOME : step - 1)}>
            <Icon name="arrowLeft" size={18} color={palette.mint} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {step === RESULTS ? (
            <GradientButton
              title="New spot"
              icon="pin"
              onPress={startOver}
              style={styles.footerCta}
            />
          ) : (
            <GradientButton
              title={step === FACING ? 'See recommendations' : 'Continue'}
              icon="arrowRight"
              disabled={!canContinue}
              onPress={() => setStep(step + 1)}
              style={styles.footerCta}
            />
          )}
        </View>
      </SafeAreaView>
      <Toast toast={toast} onHide={hideToast} />
    </Backdrop>
  );
}

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: 'ruler' | 'sun' | 'sparkle';
  title: string;
  body: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={20} color={palette.leaf} />
      </View>
      <View style={styles.featureTextBox}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Welcome
  welcomeContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 36,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: palette.leafSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWord: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  hero: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  heroTitle: {
    color: palette.text,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  heroTitleAccent: {
    color: palette.leaf,
  },
  heroSubtitle: {
    color: palette.textDim,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
  },
  featureList: {
    marginTop: 26,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextBox: { flex: 1 },
  featureTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
  },
  featureBody: {
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  beginButton: {
    marginTop: 30,
  },
  welcomeFootnote: {
    color: palette.textFaint,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 18,
  },

  // Capture / results chrome
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 10,
  },
  brandRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMarkSmall: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: palette.leafSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWordSmall: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stepCounter: {
    color: palette.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  railWrap: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  spacer: {
    height: 16,
  },
  sunCardWrap: {
    marginBottom: 16,
  },
  sunPromptCard: {
    backgroundColor: palette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 22,
  },
  sunPromptIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.raised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sunPromptTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  sunPromptBody: {
    color: palette.textDim,
    fontSize: 14,
    lineHeight: 21,
  },
  sunPromptButton: {
    marginTop: 16,
  },
  errorCard: {
    backgroundColor: palette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 22,
  },
  errorText: {
    color: palette.coral,
    fontSize: 14,
    lineHeight: 22,
  },
  footerText: {
    color: palette.textFaint,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  backText: {
    color: palette.mint,
    fontSize: 15,
    fontWeight: '800',
  },
  footerCta: {
    flex: 1,
  },
});
