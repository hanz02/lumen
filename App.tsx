import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
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
import {
  getPositionWithPermission,
  LocationPermissionPermanentlyDeniedError,
} from './src/location/location';
import type { GeoFix } from './src/location/location';
import {
  APERTURE_PARAMS,
  azimuthToAspect,
  daylightWindow,
  DIRECT_SUN_PARAMS,
  estimateDirectSun,
  estimateDirectSunThroughAperture,
  formatSunInterval,
  NIGHT_THRESHOLD_ELEVATION_DEG,
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
import { checkARAvailability, startARMeasurement } from './src/ar/arMeasurement';
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
import ResultsLoadingScreen from './src/ui/ResultsLoadingScreen';
import Toast, { useToast } from './src/ui/Toast';
import ConfirmModal from './src/ui/ConfirmModal';

/** Single vibration pulse when the 10 s light capture ends (success or
 *  rejected) — the user is often holding the phone screen-towards-the-sun
 *  with the back of the phone facing them, unable to watch the countdown. */
const LIGHT_CAPTURE_END_VIBRATION_MS = 220;

/** How long the delight-only loading screen stays up before Results reveals
 *  (the recommendation engine itself is synchronous/instant — this is purely
 *  a deliberate, short pause). Long enough for ~1 full sun+moon swing cycle
 *  and a few status lines, short enough to never feel like real waiting. */
const RESULTS_LOADING_MS = 2400;

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
  /** Tape/manual plant→window distance (cm) — fallback when AR can't track.
   *  Mutually exclusive with `distanceResult` (setting one clears the other). */
  const [manualDistanceCm, setManualDistanceCm] = useState<number | null>(null);
  /** Signed plant position along the window width, [-1, 1] (0 = centre). Feeds
   *  the spot-specific direct-sun estimate; default centre = original behaviour. */
  const [plantLateralFrac, setPlantLateralFrac] = useState(0);
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
  /** Sun elevation (deg) at the moment the light capture finished — drives the
   *  night-results view and the eval-log night/dusk flag. Null until captured. */
  const [captureSunElevationDeg, setCaptureSunElevationDeg] = useState<
    number | null
  >(null);
  const [dbMeta, setDbMeta] = useState<PlantDbMeta | null>(null);
  const [evalRowCount, setEvalRowCount] = useState(0);
  const { toast, show: showToast, hide: hideToast } = useToast();
  /** True once we know this device cannot run ARCore — set at startup via
   *  checkARAvailability() or whenever any AR call returns E_AR_UNSUPPORTED.
   *  Disables + greys out AR buttons so the user goes straight to tape. */
  const [arUnsupported, setArUnsupported] = useState(false);

  // Stop a genuinely ACTIVE sensor capture when the user navigates away from
  // its step (Home, Back, or jumping via the step rail) — without this, the
  // native TYPE_LIGHT/compass stream keeps running in the background (the
  // capture hooks live at App's top level and only tear down on unmount, not
  // on a step change), so an abandoned capture either (a) silently completes
  // off-screen and leaves a stale result waiting when the user returns, or
  // (b) makes the NEXT "Measure" attempt fail outright with "already running"
  // (LightSensorModule/CompassModule reject a second start() while the first
  // is still registered) until the orphaned 10s timer eventually expires.
  // Only an in-progress capture is aborted — a completed reading (lightState
  // 'done'/'failed', compass 'captured') is left alone so finished work isn't
  // wiped just by glancing at another step.
  const prevStepRef = useRef(step);
  useEffect(() => {
    const prevStep = prevStepRef.current;
    if (prevStep !== step) {
      if (prevStep === LIGHT && lightState.phase === 'capturing') {
        resetLightCapture();
      }
      if (prevStep === FACING && compassState.phase === 'reading') {
        resetCompass();
      }
      prevStepRef.current = step;
    }
  }, [step, lightState.phase, compassState.phase, resetLightCapture, resetCompass]);

  // Single vibration pulse the moment the light capture ends (phase leaves
  // 'capturing'), success or rejected — see LIGHT_CAPTURE_END_VIBRATION_MS.
  const prevLightPhaseRef = useRef(lightState.phase);
  useEffect(() => {
    const prevPhase = prevLightPhaseRef.current;
    if (
      prevPhase === 'capturing' &&
      (lightState.phase === 'done' || lightState.phase === 'failed')
    ) {
      Vibration.vibrate(LIGHT_CAPTURE_END_VIBRATION_MS);
    }
    prevLightPhaseRef.current = lightState.phase;
  }, [lightState.phase]);

  // Editing the plant→window distance after light was already captured means
  // the user is very likely now considering a different physical spot — the
  // OLD light reading no longer describes where they're standing, so force a
  // fresh capture (reset to idle re-locks Facing/Results via maxReachable,
  // below). Facing isn't physically invalidated by distance the same way, but
  // it's the one DOWNSTREAM step the sequential lock wouldn't otherwise force
  // (it's optional) — pendingFacingRecheck nudges the user to deliberately
  // redo or skip it rather than silently carrying stale compass data forward.
  const [pendingFacingRecheck, setPendingFacingRecheck] = useState(false);
  const [showFacingRecheckModal, setShowFacingRecheckModal] = useState(false);

  // One-time modal when the user reaches Step 1 and AR is confirmed unsupported.
  // Fires whether arUnsupported was set at startup (Layer 1) or flipped to true
  // mid-session after the first AR failure (Layers 2/3). The ref guards against
  // re-showing it on subsequent visits to Step 1 in the same session.
  const [showArUnsupportedModal, setShowArUnsupportedModal] = useState(false);
  const arUnsupportedModalShownRef = useRef(false);
  useEffect(() => {
    if (arUnsupported && step === SPOT && !arUnsupportedModalShownRef.current) {
      arUnsupportedModalShownRef.current = true;
      setShowArUnsupportedModal(true);
    }
  }, [arUnsupported, step]);
  const invalidateDownstreamOnDistanceEdit = () => {
    if (lightState.phase !== 'done') return;
    resetLightCapture();
    setLightChecklistAcked(false);
    resetCompass();
    setCaptureSunElevationDeg(null);
    setPendingFacingRecheck(true);
  };

  // Once the forced light re-capture completes, prompt the user to also
  // re-check the window facing (now actually reachable, since light is done).
  useEffect(() => {
    if (pendingFacingRecheck && lightState.phase === 'done') {
      setPendingFacingRecheck(false);
      setShowFacingRecheckModal(true);
    }
  }, [pendingFacingRecheck, lightState.phase]);

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
    // Check once at startup — devices confirmed incapable (UNSUPPORTED_DEVICE_
    // NOT_CAPABLE) get AR buttons greyed out immediately, before the user ever
    // taps them. Devices that return SUPPORTED_NOT_INSTALLED may still turn out
    // to be incompatible (e.g. Redmi Note 10); those are caught by the try-catch
    // in ARMeasurementActivity.onResume() and result in E_AR_UNSUPPORTED below.
    checkARAvailability().then((status) => {
      if (status === 'UNSUPPORTED_DEVICE_NOT_CAPABLE') setArUnsupported(true);
    });
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

  // Daytime check for the spot-light step: uses NIGHT_THRESHOLD_ELEVATION_DEG
  // (civil twilight, -6°) — a deliberately DIFFERENT constant from the SPA's
  // minElevationDeg (3°). That one asks "can a direct-sun beam usefully reach a
  // window"; this one asks "is the sky still giving off meaningful ambient
  // light" — using the sun-beam floor here would call a still-bright early
  // evening "night" the moment the sun dips just below the horizon.
  const sunElevationNow = useMemo(() => {
    if (geo == null) return null;
    return solarPosition(Date.now(), geo.latitude, geo.longitude).elevationDeg;
  }, [geo]);

  const daylightStatus: DaylightStatus = useMemo(() => {
    if (geoStatus === 'failed') return 'unknown';
    if (sunElevationNow == null) return 'checking';
    return sunElevationNow >= NIGHT_THRESHOLD_ELEVATION_DEG ? 'day' : 'night';
  }, [geoStatus, sunElevationNow]);

  // Snapshot the sun's elevation when the light capture completes (re-runs once a
  // GPS fix arrives). Lets the results view switch to the night theme and the
  // eval log flag dusk/night captures — the lux then isn't a daylight reading.
  useEffect(() => {
    if (lightState.phase !== 'done') {
      if (captureSunElevationDeg !== null) setCaptureSunElevationDeg(null);
      return;
    }
    if (captureSunElevationDeg == null && geo != null) {
      setCaptureSunElevationDeg(
        solarPosition(Date.now(), geo.latitude, geo.longitude).elevationDeg,
      );
    }
  }, [lightState.phase, geo, captureSunElevationDeg]);

  const capturedAtNight = useMemo(() => {
    if (captureSunElevationDeg != null) {
      return captureSunElevationDeg < NIGHT_THRESHOLD_ELEVATION_DEG;
    }
    return daylightStatus === 'night';
  }, [captureSunElevationDeg, daylightStatus]);

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

  // The plant→window distance the engine actually uses (metres): AR horizontal
  // when available (3D fallback), else the manual tape value. One number, one
  // source of truth for both the recommendation and the sun aperture model.
  const effectiveDistanceM = useMemo(() => {
    if (distanceResult != null) {
      return distanceResult.horizontalDistanceMeters > 0
        ? distanceResult.horizontalDistanceMeters
        : distanceResult.distanceMeters;
    }
    if (manualDistanceCm != null) return manualDistanceCm / 100;
    return null;
  }, [distanceResult, manualDistanceCm]);

  // Prefer the spot-specific aperture model when the full window geometry +
  // distance are known (width sets the azimuth cone, sill/head the vertical
  // reach); otherwise fall back to the orientation-only whole-window estimate.
  const sunResult = useMemo(() => {
    if (aspectInfo?.trueAzimuthDeg == null || geo == null) return null;
    const az = aspectInfo.trueAzimuthDeg;
    const w = windowDims.width;
    const h = windowDims.height;
    const s = windowDims.sill;
    const distM = effectiveDistanceM;
    if (w != null && h != null && s != null && distM != null && distM > 0) {
      const aperture = {
        widthM: w.cm / 100,
        sillM: s.cm / 100,
        topM: (s.cm + h.cm) / 100,
        distanceM: distM,
        // signed metres from the window centre-line (+ = right looking out)
        lateralOffsetM: (plantLateralFrac * (w.cm / 100)) / 2,
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
  }, [aspectInfo, geo, windowDims, effectiveDistanceM, plantLateralFrac]);

  const sunEstimate = sunResult?.estimate ?? null;

  // Geometry for the side/top diagrams. Drawn whenever the spot-specific aperture
  // model ran (perSpot) — including when NO direct sun reaches the spot, so the
  // user can still see where the sun travels (it visibly misses the window). The
  // sweep follows the longest lit interval when there is sun, else the whole
  // daylight span with a `noSun` flag (the views then never highlight the plant).
  const sunDiagram = useMemo(() => {
    if (sunResult == null || !sunResult.perSpot || sunResult.aperture == null) {
      return null;
    }
    const winAz = aspectInfo?.trueAzimuthDeg;
    if (winAz == null || geo == null) return null;
    const est = sunResult.estimate;
    const { widthM, sillM, topM, distanceM, lateralOffsetM } = sunResult.aperture;
    const now = new Date();
    const el = (m: number) =>
      sunElevationAtMinute(now, geo.latitude, geo.longitude, m);
    const az = (m: number) =>
      sunAzimuthAtMinute(now, geo.latitude, geo.longitude, m);

    // Choose the span to draw: the longest lit interval, or — when no direct sun
    // reaches the spot — the whole daylight window so the path is still shown.
    let span: { startMin: number; endMin: number };
    let noSun: boolean;
    if (est.hours > 0 && est.intervals.length > 0) {
      span = est.intervals.reduce((a, b) =>
        b.endMin - b.startMin > a.endMin - a.startMin ? b : a,
      );
      noSun = false;
    } else {
      const dw = daylightWindow(now, geo.latitude, geo.longitude);
      if (dw == null) return null; // sun never rises today — nothing to draw
      span = dw;
      noSun = true;
    }
    const midMin = (span.startMin + span.endMin) / 2;
    return {
      widthM,
      sillM,
      topM,
      distanceM,
      lateralOffsetM,
      plantTopM: APERTURE_PARAMS.assumedPlantTopM,
      windowAzimuthDeg: winAz,
      // representative ray + the span's endpoints, so the side view can sweep the
      // sun's elevation and the top view can sweep its azimuth over the drawn span.
      intervalMinutes: span.endMin - span.startMin,
      elevationDeg: el(midMin),
      elevationStartDeg: el(span.startMin),
      elevationEndDeg: el(span.endMin),
      sunAzStartDeg: az(span.startMin),
      sunAzEndDeg: az(span.endMin),
      peakLabel: formatSunInterval(span),
      noSun,
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
  const distanceDone = distanceResult != null || manualDistanceCm != null;

  // Recommendations are gated on the full capture protocol: plant-spot
  // distance + window size (or logged skip) + lux. Window size is recorded
  // for the evaluation dataset only — it is never an engine input.
  const recommendations = useMemo(() => {
    if (plants == null || !lightDone || !distanceDone || !windowDone) {
      return null;
    }
    return recommend(plants, {
      lux: lightState.reading.lux, // RAW — the engine calibrates ("both" mode)
      // horizontal AR distance (3D fallback) or the manual tape value; the
      // distance-zone construct (Ch 2.5) is horizontal distance from the window
      distanceToWindowM: effectiveDistanceM,
      windowAspect: aspectInfo != null ? aspectInfo.aspect : null,
      directSunHours: sunEstimate != null ? sunEstimate.hours : null,
    });
  }, [
    plants,
    lightDone,
    distanceDone,
    windowDone,
    lightState,
    effectiveDistanceM,
    aspectInfo,
    sunEstimate,
  ]);

  // Brief delight-only loading screen on every ARRIVAL at Results from a
  // different step, but ONLY when the underlying recommendation actually
  // needs recomputing — recommendations is itself a useMemo over the real
  // engine inputs, so an unchanged object reference means nothing that feeds
  // the engine changed since it was last shown (e.g. pressing "See
  // recommendations" a second time after just looking at Facing again).
  const [resultsRevealed, setResultsRevealed] = useState(false);
  const prevStepForResultsRef = useRef(step);
  const lastShownRecommendationsRef = useRef<typeof recommendations>(undefined);
  useEffect(() => {
    const prevStep = prevStepForResultsRef.current;
    if (prevStep !== step) {
      if (step === RESULTS && prevStep !== RESULTS) {
        const stale = recommendations !== lastShownRecommendationsRef.current;
        lastShownRecommendationsRef.current = recommendations;
        if (stale) {
          setResultsRevealed(false);
          const id = setTimeout(() => setResultsRevealed(true), RESULTS_LOADING_MS);
          prevStepForResultsRef.current = step;
          return () => clearTimeout(id);
        }
        setResultsRevealed(true);
      }
      prevStepForResultsRef.current = step;
    }
    return undefined;
  }, [step, recommendations]);

  // A deliberate, manually-triggered recompute pause (e.g. after retrying a
  // failed GPS fix from the Results screen) — same delight pause as a normal
  // arrival, without requiring an actual step change to fire it.
  const triggerResultsRecompute = useCallback(() => {
    setResultsRevealed(false);
    setTimeout(() => setResultsRevealed(true), RESULTS_LOADING_MS);
  }, []);

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
        plantDistanceCm:
          effectiveDistanceM != null
            ? Math.round(effectiveDistanceM * 1000) / 10
            : null,
        plantDistanceSource: distanceResult != null ? 'ar' : 'manual',
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
        plantLateralOffsetM:
          windowDims.width != null
            ? (plantLateralFrac * (windowDims.width.cm / 100)) / 2
            : null,
        top: recommendations.recommended
          .slice(0, 3)
          .map((r) => ({ id: r.plant_id, score: r.score })),
        recommendedCount: recommendations.recommended.length,
        eliminatedCount: recommendations.eliminated.length,
        dbGeneratedAt: dbMeta?.generated_at ?? null,
        captureSunElevationDeg,
        skyCondition: refs.skyCondition || null,
        refTapeDistanceCm: refs.tapeDistanceCm || null,
        refTapeWidthCm: refs.tapeWidthCm || null,
        refTapeHeightCm: refs.tapeHeightCm || null,
        refTapeSillCm: refs.tapeSillCm || null,
        refMeterLux1: refs.meterLux1 || null,
        refMeterLux2: refs.meterLux2 || null,
        refMeterLux3: refs.meterLux3 || null,
        refMeterLux4: refs.meterLux4 || null,
        refMeterLux5: refs.meterLux5 || null,
        refMeterLuxMedian: refs.meterLuxMedian,
        note: refs.note || null,
      });
      await saveEvalRow(row);
      await refreshEvalCount();
    },
    [
      lightState,
      recommendations,
      distanceResult,
      effectiveDistanceM,
      windowDims,
      aspectInfo,
      geo,
      sunEstimate,
      dbMeta,
      plantLateralFrac,
      captureSunElevationDeg,
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
      invalidateDownstreamOnDistanceEdit();
      setDistanceResult(measurement);
      setManualDistanceCm(null); // AR wins; clear any prior manual value
    } catch (error: any) {
      if (error?.code === 'E_AR_UNSUPPORTED') {
        setArUnsupported(true);
        showToast({
          title: 'AR not supported on this device',
          message: 'Use the tape-measurement fields instead.',
          variant: 'info',
        });
      } else {
        showToast({
          title: 'Measurement cancelled',
          message: error?.message ?? 'Please try again.',
          variant: 'info',
        });
      }
    }
  };

  // Tape fallback for the plant→window distance (when AR can't track). Setting a
  // manual value clears the AR result so exactly one source is active.
  const setManualDistance = (cm: number) => {
    invalidateDownstreamOnDistanceEdit();
    setManualDistanceCm(cm);
    setDistanceResult(null);
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
      if (error?.code === 'E_AR_UNSUPPORTED') {
        setArUnsupported(true);
        showToast({
          title: 'AR not supported on this device',
          message: 'Use the tape-measurement fields instead.',
          variant: 'info',
        });
      } else {
        showToast({
          title: 'Measurement cancelled',
          message: error?.message ?? 'Please try again.',
          variant: 'info',
        });
      }
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
    setManualDistanceCm(null);
    setPlantLateralFrac(0);
    setWindowDims(EMPTY_WINDOW_DIMS);
    resetLightCapture();
    setLightChecklistAcked(false);
    resetCompass();
    setCaptureSunElevationDeg(null);
    setPendingFacingRecheck(false);
    setShowFacingRecheckModal(false);
    lastShownRecommendationsRef.current = undefined;
    setStep(SPOT);
  };

  // Retry a failed GPS fix — granting the permission doesn't guarantee a fix
  // (common indoors); the one-shot effect above never retries on its own
  // once geoStatus is set, so this is the only way out of a stuck 'failed'.
  // onSuccess fires only when the fix actually succeeds — callers that also
  // need to trigger the results-loading animation pass triggerResultsRecompute
  // here so the animation doesn't play on a denial or indoor miss.
  // When the permission was permanently denied ("never ask again"), the OS
  // won't show a dialog; we open App Settings instead so the user can grant.
  const retryGeo = useCallback((onSuccess?: () => void) => {
    setGeoError(null);
    setGeoStatus('pending');
    getPositionWithPermission()
      .then((fix) => {
        setGeo(fix);
        setGeoStatus('ok');
        onSuccess?.();
      })
      .catch((error: any) => {
        if (error instanceof LocationPermissionPermanentlyDeniedError) {
          Linking.openSettings();
        }
        setGeoError(error?.message ?? 'No position fix.');
        setGeoStatus('failed');
      });
  }, []);

  const hasAnyProgress =
    distanceDone || windowDone || lightDone || compassState.phase === 'captured';
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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
              onPress={startOver}
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
                manualDistanceCm={manualDistanceCm}
                onManual={setManualDistance}
                lateralFrac={plantLateralFrac}
                onLateralChange={setPlantLateralFrac}
                arUnsupported={arUnsupported}
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
                arUnsupported={arUnsupported}
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
                capturedAtNight={capturedAtNight}
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
                onRetryLocation={retryGeo}
              />
            </FadeSlideIn>
          )}

          {step === RESULTS && !resultsRevealed && <ResultsLoadingScreen />}

          {step === RESULTS && resultsRevealed && (
            <>
              {recommendations != null && (
                <FadeSlideIn style={styles.sunCardWrap}>
                  <RecommendationList
                    result={recommendations}
                    inputsLine={inputsLine}
                    capturedAtNight={capturedAtNight}
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
                    capturedAtNight={capturedAtNight}
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
                        ? 'A GPS fix is needed for the sun estimate, but none was available. Grant location access and retry.'
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
                    {compassState.phase === 'captured' && geoStatus === 'failed' && (
                      <GradientButton
                        title="Grant location & retry"
                        icon="compass"
                        onPress={() => retryGeo(triggerResultsRecompute)}
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
            onPress={() => {
              if (step === SPOT && hasAnyProgress) {
                setShowExitConfirm(true);
                return;
              }
              setStep(step === SPOT ? WELCOME : step - 1);
            }}>
            <Icon name="arrowLeft" size={18} color={palette.mint} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {step === RESULTS ? (
            resultsRevealed && (
              <GradientButton
                title="New spot"
                icon="pin"
                onPress={startOver}
                style={styles.footerCta}
              />
            )
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

      <ConfirmModal
        visible={showExitConfirm}
        icon="alert"
        destructive
        title="Leave this spot?"
        message="Going back to the home screen clears everything measured for this spot — distance, window size, light, and facing."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => {
          setShowExitConfirm(false);
          setStep(WELCOME);
        }}
        onCancel={() => setShowExitConfirm(false)}
      />

      <ConfirmModal
        visible={showFacingRecheckModal}
        icon="compass"
        hideCancel
        title="Re-check the window facing"
        message="The plant's distance changed, so this is effectively a new spot. Please re-check the window facing for an accurate sun estimate — or skip it from that screen if you'd rather not."
        confirmLabel="OK"
        onConfirm={() => {
          setShowFacingRecheckModal(false);
          setStep(FACING);
        }}
        onCancel={() => setShowFacingRecheckModal(false)}
      />

      <ConfirmModal
        visible={showArUnsupportedModal}
        icon="alert"
        hideCancel
        title="AR not available on this device"
        message="This device doesn't support ARCore, so the AR measurement buttons are disabled. Use the tape-measure fields to enter the plant-to-window distance and window dimensions manually — everything else in the app works normally."
        confirmLabel="Got it, I'll use tape"
        onConfirm={() => setShowArUnsupportedModal(false)}
        onCancel={() => setShowArUnsupportedModal(false)}
      />

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
