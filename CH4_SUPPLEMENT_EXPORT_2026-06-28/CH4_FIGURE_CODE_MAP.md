# Chapter 4 — Figure to Code Map

This maps every **code figure** in `SWE2302061_Chapter4_FULL_DRAFT.docx` to the
exact source file and line range it was sliced from. The code shown in the docx
is **verbatim** from these locations (the build script read the files and sliced
the lines directly, so nothing was retyped). Open each file at the given lines,
screenshot the code, and replace the colored placeholder block in the docx.

Repository root: `C:\Users\tommy\Desktop\PlantARApp`

All line ranges are **1-based and inclusive**. Where a figure lists two ranges,
the docx shows them stacked with a `// ...` separator between them.

| Figure | File (relative to repo root) | Lines | What it shows |
|--------|------------------------------|-------|---------------|
| 4.5  | `android/app/src/main/java/com/plantarapp/ARPackage.kt` | 8–21 | The six native modules registered with React Native |
| 4.6  | `tools/export_to_sqlite.py` | 163–199 | The database integrity gate (row counts, orphan FKs, refs, URLs) |
| 4.7  | `android/app/src/main/java/com/plantarapp/PlantDataModule.kt` | 52–64 | `ensureDb` copies the asset and opens it read only |
| 4.8  | `android/app/src/main/java/com/plantarapp/PlantDataModule.kt` | 66–94 | `getPlants` read only query over the plant table |
| 4.9  | `android/app/src/main/java/com/plantarapp/LightSensorModule.kt` | 77–88 | `onSensorChanged` emitting a lux sample to JS |
| 4.10 | `android/app/src/main/java/com/plantarapp/CompassModule.kt` | 107–128 | Heading from the rotation matrix plus `tiltDeg` |
| 4.11 | `android/app/src/main/java/com/plantarapp/LocationModule.kt` | 68–84 | `resolveWith` computing magnetic declination |
| 4.12 | `android/app/src/main/java/com/plantarapp/ARModule.kt` | 102–111, then 77–81 | `checkARAvailability` and the `E_AR_UNSUPPORTED` rejection |
| 4.13 | `android/app/src/main/java/com/plantarapp/ARMeasurementActivity.kt` | 140–145, then 1204–1209 | `HitQuality` enum and the hit grading decision |
| 4.14 | `android/app/src/main/java/com/plantarapp/ARMeasurementActivity.kt` | 1303–1318 | Two point straight + horizontal floor distance (median settle) |
| 4.15 | `android/app/src/main/java/com/plantarapp/EvalLogModule.kt` | 41–49, then 86–110 | `append` a row and `share` the log via FileProvider |
| 4.16 | `src/engine/config.ts` | 13–47, then 61–69 | WEIGHTS, DISTANCE_ZONES, LIGHT_CLASS, CONFIDENCE_SCORE, LUX_CALIBRATION |
| 4.17 | `src/engine/calibration.ts` | 20–31 | `applyLuxCalibration` linear convert + below-200-lux raw guard |
| 4.18 | `src/sensor/plateau.ts` | 123–159 | `extractPlateauReading` (longest plateau + coverage reject) |
| 4.19 | `src/engine/lightFit.ts` | 13–31, then 40–57 | `preferredFloor` + `classifyBand`, and `lightFitScore` |
| 4.20 | `src/engine/gates.ts` | 25–47 | `applyGates` (light floor gate + direct sun gate) |
| 4.21 | `src/engine/scoring.ts` | 78–82, then 118–141 | `ZONE_CLASS_FIT` matrix and `scorePlant` renormalisation |
| 4.22 | `src/sun/solar.ts` | 99–167 | `solarPosition` NOAA/Meeus core (coefficients, equation of centre) |
| 4.23 | `src/sun/solar.ts` | 282–335, then 338–344 | `estimateDirectSunThroughAperture` and `azimuthToAspect` |
| 4.24 | `src/engine/recommend.ts` | 95–118 | `recommend` orchestration (calibrate, gate, score, sort, rank) |
| 4.25 | `src/engine/explain.ts` | 67–75, then 77–110 | `recommendationConfidence` and `buildExplanation` |
| 4.26 | `App.tsx` | 100–118 | Step constants and the `step` state |
| 4.27 | `App.tsx` | 459–461, then 549–562 | Done flags and `maxReachable` / `canContinue` gating |
| 4.28 | `App.tsx` | 221–228, then 254–256, then 629 | Distance-edit safeguard, `loadPlantDbMeta` startup, provenance into eval row |
| 4.29 | `src/sensor/useLightCapture.ts` | 42–90 | The guided light capture state machine |
| 4.30 | `src/data/plantStore.ts` | 23–35, then `src/data/mapPlant.ts` 86–103 | Loading plants and mapping a row to a `Plant` |
| 4.31 | `src/components/WindowMeasureCard.tsx` | 44–47, then `src/components/SpotDistanceCard.tsx` 140–153 | `windowStepComplete` and `primaryDistance` selection |
| 4.32 | `src/components/LightCaptureCard.tsx` | 170–182 | Showing the calibrated estimate with the raw reading beneath |
| 4.33 | `src/components/AspectCaptureCard.tsx` | 196–213 | Live heading readout and the tilt warning |
| 4.34 | `src/components/RecommendationList.tsx` | 53–88, then 459–464 | `FactorBreakdown` accordion and the raw/calibrated lux line |
| 4.35 | `src/components/EvaluationCard.tsx` | 48–58 | `median` of the five reference meter readings |

## Screenshot figures (no code — author supplies images)

Figures 4.36 to 4.46 are UI screenshots in section 4.6.6. Each has a captioned
placeholder box and a one paragraph description in the docx.

| Figure | Screen |
|--------|--------|
| 4.36 | Welcome screen |
| 4.37 | Plant spot distance step (augmented reality) |
| 4.38 | Manual tape entry fallback |
| 4.39 | Window size step |
| 4.40 | Spot light capture step |
| 4.41 | Window facing step |
| 4.42 | Results screen with top recommendation |
| 4.43 | Score breakdown |
| 4.44 | Direct sun card |
| 4.45 | Direct sun card at night |
| 4.46 | Evaluation capture screen |

## Diagram figures (4.1 to 4.4)

These were already placeholders in your 4.1–4.5 draft and remain placeholders
(use case diagram, database schema, capture flowchart, recommendation engine
flowchart). Author supplies the exported `draw.io` images.

## Notes for replacement
- The colored code blocks in the docx render comment lines in green and code in
  dark grey on a light grey background. They are stand-ins so the chapter reads
  complete now. Replace each with a screenshot of the same lines.
- If you edit the source files later and the line numbers drift, re-run the
  build script in the scratchpad (`build_ch4_part2.js`) to regenerate the docx
  with the current code.
