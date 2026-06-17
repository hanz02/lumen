# AGENTS.md — Project Context (Indoor Plant Recommendation App)

> Drop this file in the **root of the project folder**. Codex auto-loads it
> at the start of every session. Treat it as **design intent + working agreements**.
> For current code internals, read the actual project files — this file says
> what the system is _supposed_ to be, not what any single file currently contains.

Do not make any changes until you have 95% confidence in what you need to build. Ask me follow up questions until you reach that confidence. Keep the MD files line within 300 lines.

---

## 1. What this project is

A **mobile app (React Native front-end + native Android Kotlin / ARCore modules)** that
recommends indoor plants for a **specific placement spot in a room**, not for a whole room.

**The gap it fills (the thesis novelty):** existing recommenders (Green Oasis, Doshi's PRES,
Jaishree's hybrid, Das's cosine-similarity system) decide using _static light labels_
("low / medium / bright") or regional weather. This app instead **measures the actual light
at the chosen spot** and matches it against **evidence-based, plant-specific light thresholds**.

This is a Final Year Project. It must stay defensible academically, so **do not over-claim
capability** (see §12). The user is highly integrity-focused: every dataset value must trace
to a URL-accessible source; no derived/inferred values, no hand-tuned constants.

---

## 2. Locked design decisions (the "contract" — do not silently change these)

1. **Lux is the runtime measurement unit.** Practical and phone-readable. PPFD/PAR/DLI are
   only _scientific framing_ in the thesis — **the app does NOT measure PPFD/DLI.**
2. **SPA is a sunlight _interpretation_ module**, not a lux predictor — it answers "could
   direct sun reach this window, and when?" Suitability still comes from measured lux. Output
   is always labelled **POTENTIAL** direct sun (unobstructed-sky assumption).
3. **AR is deliberately limited.** Plant-to-window **distance is the reliable AR output**;
   window **width/height/sill are prototype-only**, validated against a tape measure. AR is a
   _spatial measurement aid_, NOT decorative plant visualization.
4. **Recommendation engine = explainable rule-based filtering + weighted scoring.** No trained
   ML model — dataset is small and explanations matter (locked gate/weight policy, §4).
5. **Two threshold levels per plant:** _maintenance light_ (stays alive) vs _preferred light_
   (good growth + ornamental quality) — the engine distinguishes them.
6. **Evidence has a confidence value.** Species/cultivar-specific > genus/group proxy.
   Lower-confidence evidence lowers the score / is flagged, not treated as fact.

---

## 3. Tech stack & repo map

- **Front-end:** React Native — `App.tsx` (step-wizard shell + all `useMemo` glue).
- **Native bridge modules:** `ARModule.kt`, `ARPackage.kt`, `CompassModule.kt`, `LocationModule.kt`,
  `EvalLogModule.kt`, `PlantDataModule.kt`, `MainApplication.kt`.
- **AR core:** `ARMeasurementActivity.kt` (~1,100+ lines), `activity_ar.xml`, `ar_*` drawables,
  `ic_window_frame.xml` / `ic_potted_plant.xml`. Uses ARCore via Gorisse Sceneform fork 1.23.0
  (plane detection, raycast/hit-test, anchors, `instructionsController` to hide onboarding).
- **Config:** `AndroidManifest.xml`, `build.gradle` (project + app level).
- **Validation reference instrument:** UT383 lux meter (for phone-lux comparison).

**`src/` layout (TypeScript, RN side):**

- `src/ar/arMeasurement.ts` — thin wrapper around the `ARModule` native bridge.
- `src/engine/` (§4) — `config.ts`, `types.ts`, `gates.ts`, `lightFit.ts`, `scoring.ts`,
  `calibration.ts`, `explain.ts`, `recommend.ts`, `index.ts`.
- `src/sun/solar.ts` — SPA + window-aperture direct-sun model (§5).
- `src/sensor/` (§7) — `compass.ts`, `useCompassCapture.ts`, `lightSensor.ts`, `plateau.ts`,
  `useLightCapture.ts`. `src/location/location.ts` — GPS one-shot wrapper.
- `src/data/` — `plantStore.ts` (loads bundled SQLite), `mapPlant.ts` (row → `Plant`).
- `src/eval/` (§9) — `evalRow.ts`, `evalLog.ts`. `src/theme/theme.ts` — `palette` + tokens.
- `src/ui/` (§10) — `Icon`, `GradientButton`, `CardHeader`, `StepProgress`, `Backdrop`,
  `HeroPlant`, `FadeSlideIn`, `Toast`, `ConfirmModal`.
- `src/components/` — step cards: `SpotDistanceCard`, `WindowMeasureCard`,
  `LightCaptureCard`, `AspectCaptureCard`, `DirectSunCard`, `RecommendationList`,
  `EvaluationCard`.
- **Data (Excel → app, §8):** `PLANT_MASTER`, `RAW_EVIDENCES`, `LOOKUPS`,
  `SPOT_INPUT / SPOT_OBSERVATIONS` → per-plant maintenance/preferred lux ranges + confidence,
  exported to `android/app/src/main/assets/plant_db.sqlite`.

---

## 4. Recommendation engine (`src/engine/`)

All tuning constants live in `src/engine/config.ts` — every value there is a design decision
that must be stated/defended in the Methodology chapter. Never hand-tune.

**Gate policy = "lux floor + direct-sun only"** (chosen for academic defensibility). Only two
hard gates eliminate a plant: (1) measured spot lux below `maintenance_lux_min` (cannot
survive); (2) `direct_sun_tolerance === 'none'` AND the spot has direct sun (leaf scorch).
**Window orientation is deliberately NOT a gate** — only a scoring/explanation factor, since
gating on it would contradict the thesis spine (measured spot lux beats static labels).

**Balanced weighted scoring** (`WEIGHTS`): `light .30 / directSun .25 / distance .25 /
confidence .20`. Any `FactorScore` with `available=false` (no SPA / no AR distance yet) is
dropped and remaining weights renormalised — partial captures score honestly and
`recommendationConfidence` becomes `'reduced'`.

**Other tuning constants:** `DISTANCE_ZONES` — `near` ≤ 1.0 m, `mid` ≤ 2.5 m, else `deep`.
`LIGHT_CLASS` (by `maintenance_lux_min`) — low ≤ 800 lx, medium ≤ 5000 lx, else high.
`DIRECT_SUN_HOURS_THRESHOLD = 1.0` h/day counts as "present"; a `'some'`-tolerance plant is
comfortable up to `SOME_TOLERANCE_HOURS_OK = 3.0` h/day. `CONFIDENCE_SCORE` — high 1.0 /
medium 0.7 / low 0.45 / provisional 0.3.

**Lux calibration — "both" mode** (`LUX_CALIBRATION`): `meter = 1.1054 × phone + 134.4`
(R²=0.993, from the 210-pair S21+ vs UT383 field validation, Apr–May 2026, valid ~200–6000 lx).
`SpotInput.lux` stays RAW; `recommend()` scores with the calibrated value; every
`Recommendation` carries both `luxRaw` and `luxUsed`. Regenerate ONLY via
`tools/analyze_spot_observations.py` — never hand-tune.

Every `Recommendation` has a plain-language `explanation` (built by `explain.ts`) — this is
non-negotiable for the thesis ("why this plant").

---

## 5. SPA & sun module (`src/sun/solar.ts`)

Pure TypeScript, no react-native imports, unit-tested against known ephemeris values
(solstice declination, equation-of-time extrema, solar-noon azimuth/elevation).

- **`solarPosition(epochMs, lat, lon)`** — Meeus/NOAA general solar position equations
  (~±0.01°), returns `{azimuthDeg, elevationDeg, declinationDeg, equationOfTimeMin}`. Chapter 3
  cites **Reda & Andreas (2004)** as the reference SPA, justified by accuracy analysis: 0.01°
  is ~3 orders of magnitude finer than the 90° window-aspect sectors and ~5–10° phone-compass
  error, so full NREL coefficient tables add no usable precision.
- **`DIRECT_SUN_PARAMS`**: `minElevationDeg = 3` (below this, sun is almost always blocked by
  terrain/buildings), `maxIncidenceDeg = 85`, `sampleStepMin = 5` (day-sampling resolution).
- **`estimateDirectSun(...)`** — orientation-only fallback: is the sun within the window's
  facing sector at a given time, above the elevation floor.
- **`estimateDirectSunThroughAperture(...)`** — spot-specific model, the **only place AR
  window dimensions enter computation**. Inputs: `widthM`, `sillM`, `topM` (= sill + height),
  `distanceM`. Two tests per 5-min sample: (1) **azimuth-cone** — sun azimuth within
  `atan((W/2)/d) + azMarginDeg` (6°) of the window's facing; (2) **vertical penetration-band**
  — `sillM − d·tan(α)` .. `topM − d·tan(α)` (α = elevation) must overlap
  `[0, assumedPlantTopM ± vertMarginM]` (plant top 0.4 m, margin 0.1 m). Passing samples cluster
  into `SunInterval{startMin,endMin}`s, summed into `hours`. Fixed centre-line/height/margin
  assumptions avoid false precision from noisy vertical-surface AR (Szerman et al. 2014 + LBNL
  daylighting rules).
- **App selection** (`App.tsx` `sunResult` useMemo): prefers `estimateDirectSunThroughAperture`
  when `windowDims.width/height/sill` + `distanceResult` are all present (`perSpot: true`),
  else `estimateDirectSun` (`perSpot: false`). Needs `aspectInfo.trueAzimuthDeg` + GPS (`geo`).

---

## 6. AR module — native (ARCore)

**Purpose:** capture the _spatial context_ of a plant spot relative to the window, primarily
**plant-to-window distance**, optionally window size (width/height/sill).

**Design decisions already made for AR (keep consistent):**

- Plane visuals **hidden** (`instructionsController.isEnabled = false`, plane renderer
  disabled) — no debug grid or default ARCore onboarding.
- **Pokémon-GO-style placement** — tap to drop a plant marker; **window marker** is a
  disc/anchor on the window plane; **line measurement** between the two gives the distance.
- **Upright plant fix** — placed models stay upright, not tilted to the surface normal.
- **Hit quality** matters — prefer high-confidence hits; warn/reject low-quality hits.
- **AR coach overlay** (`activity_ar.xml` `coachOverlay`, shown once per tool per app run via
  `coachSeenTools`): Lottie (`com.airbnb.android:lottie:6.5.2`) loads
  `assets/coach_plant.json` / `coach_window.json` (hand-authored, no licence issues), falling
  back to vector + `ObjectAnimator` keyframes (`ic_potted_plant`/`ic_window_frame`) on failure.

**What AR must output to the rest of the system:**

- `plantToWindowDistance` (metres) → feeds the recommendation score as a **near / mid / deep**
  zone (§4) and is the primary input to `estimateDirectSunThroughAperture` (§5).
- `windowWidth`, `windowHeight`, `windowSill` (metres) → **optional / prototype**, flagged as
  approximate; feed the window-aperture sun model when all present.

**AR cautions (load-bearing for the thesis — do not paper over them):** white walls, plain
window frames, and reflective glass give ARCore **few feature points**, so vertical-surface
(window) measurement is the least reliable part — keep it honest in the UI. Low lighting
reduces tracking quality; placement error ranges from a few cm to metres. **AR output is
therefore an estimate**, validated against tape measurement (`ref_tape_cm` in the eval log, §9).

---

## 7. Sensors — lux, compass, location

- **Lux capture** (`src/sensor/lightSensor.ts`, `plateau.ts`, `useLightCapture.ts`): Android
  `TYPE_LIGHT` (on-change), 10 s guided capture, hold-last resampling at 10 Hz, then
  **plateau-median segmentation** (`max(10%, 30 lx)` band, longest plateau, `null` if none) —
  the same criterion used offline (`tools/extract_phone_readings.py`), so Ch 3 can describe
  one criterion for both. Captured value stays RAW; engine calibrates it (§4 "both" mode).
- **Compass capture** (`src/sensor/compass.ts`, `useCompassCapture.ts`, `CompassModule.kt`):
  circular-mean heading sampling. Window-facing aspect is the optional wizard step (a dead
  magnetometer must not dead-end the flow).
- **Location** (`LocationModule.kt`, `src/location/location.ts`): device GPS one-shot
  (coarse) + `GeomagneticField` declination converts the compass's magnetic azimuth to true
  north (`trueAzimuthDeg`); falls back to magnetic azimuth if no GPS fix (declination ≪ 90°
  aspect sectors).

---

## 8. Data pipeline (Excel → SQLite)

The evidence-based plant dataset (the project's data contribution) is authored in Excel in the
user's OneDrive, **not in the repo**:

- `(LATEST 6-7-final-v3) PLANT_MASTER_updated_with_zhang2023_support.xlsx` (31 plants, 27 cols)
- `(LATEST 6-7-final-v3) RAW_EVIDENCES_updated_with_zhang2023_support.xlsx` (168 rows;
  `direct_sun_tolerance` + note at cols 30/31)
- `PLANT DATA\LOOKUPS.xlsx` (controlled vocab — moved into the `PLANT DATA\` subfolder)
- `PLANT_MASTER_v1_with_runtime_schema.xlsx` — defines `SPOT_INPUT_SCHEMA`,
  `DERIVED_APP_FIELDS`, `PLACEMENT_RULE_TEMPLATE`
- `SPOT INPUT COLLECTION.xlsx` → `SPOT_OBSERVATIONS`, 402 rows of phone-lux-vs-UT383 field data
  (Ch 4 validation seed)

**`tools/export_to_sqlite.py`** reads the v3 Excel + LOOKUPS and emits
`android/app/src/main/assets/plant_db.sqlite` (tables: `plant`, `evidence`, `lookup`, `meta`).
It **gates the build on integrity** (row counts, orphan FKs, missing evidence refs,
LOOKUP-code compliance, empty URLs) and **aborts on any violation**. Re-run after any dataset
edit.

**Field light dataset** (calibration source, §4): `LIGHT DATA COMPLETED\SPOT_INPUT_master_template.xlsx`
(`SPOT_OBSERVATIONS` + `WINDOW_MASTER`). 210 real paired observations = 70 sessions × 3
distances (50/100/150 cm). Pearson r=0.996, fit `meter = 1.1054 × phone + 134.4` (R²=0.9928).
`tools/enrich_spot_master.py` adds live formulas/backfills triplets (timestamped backup, fails
if the workbook is open). `tools/analyze_spot_observations.py` → `tools/analysis_output/` CSVs
— the Ch 4 data source and **only** legitimate source for `LUX_CALIBRATION`. Manual
`SPOT_OBSERVATIONS` readings are **final**; plateau-median re-extraction
(`extract_phone_readings.py`) is an independent QA cross-check only (median bias +8.8%, same
fit) — never used to overwrite master data. `WINDOW_MASTER` gaps (W008–W017, duplicate W001)
are the **user's** to fill — do not edit that sheet.

---

## 9. Evaluation logging

Append-only CSV in `filesDir` + Android share sheet (`EvalLogModule.kt`), columns in
`src/eval/evalRow.ts` / written via `evalLog.ts`, surfaced by `EvaluationCard.tsx`. Each row
captures AR distance, window dims, raw/calibrated lux, timestamps, and optional `ref_tape_cm` /
`ref_meter_lux` fields for AR-vs-tape and phone-vs-UT383 pairs (the Ch 4 data source).
`EvaluationCard` log-clear uses `ConfirmModal` (destructive), not OS `Alert`.

---

## 10. Frontend / UI architecture

**Locked step wizard** (not a single scroll), order: Welcome → 1 Plant spot (AR distance) →
2 Window size → 3 Spot light (lux) → 4 Window facing (optional) → 5 Results + evaluation. A
step cannot be opened until the previous required capture is done — enforced by `maxReachable`
in `App.tsx`, shown by `src/ui/StepProgress.tsx` (completed=check, current=ring,
locked=padlock). Facing is the only optional step.

**Visual layer:** `react-native-svg` + `react-native-linear-gradient` (native, autolinked) —
self-contained vector design, **no photo/stock assets** (avoids licensing footnotes, stays
reproducible). Do NOT invent features from inspiration mockups (no "AI plant scan"/care
reminders) — see §12.

**Shared toolkit (`src/ui/`)**: `Icon`, `GradientButton`, `CardHeader`, `StepProgress`,
`Backdrop`, `HeroPlant`, `FadeSlideIn` (staggered fade+slide-up entrance), `Toast` (info) and
`ConfirmModal` (destructive, dimmed scrim) — both replace OS `Alert.alert`.

**Results screen**: `DirectSunCard` (§5 output, prominent "Direct sun at this spot" card with
hours + interval pills, with a fallback prompt if the sun estimate isn't ready — capture
facing / GPS failed / locating) + `RecommendationList` (§4) + `EvaluationCard` (§9).

Jest stubs the native UI libs (`react-native-svg`, `react-native-linear-gradient`, Lottie) in
`jest.setup.js`.

---

## 11. Current status & pending work (as of 2026-06-14)

- **Working / built:** AR distance + window-size module, lux sensor + capture, SPA + window-aperture
  direct-sun model, recommendation engine, Excel→SQLite export, compass + GPS, evaluation CSV log,
  full step-wizard UI, Toast/ConfirmModal, AR coach overlay (Lottie + vector fallback).
- **Thesis:** Chapter 2 (Literature Review) done. Chapters 1, 3, 4, 5 outstanding.
- **Timeline:** ~1–2 months to deadline; build essentially complete — remaining work is UI polish,
  evaluation data collection, and writing up Chapters 1/3/4/5.

**DONE this session** (`DirectSunCard` diagrams + window sill UX; rest is thesis write-up):

1. **Side/Top toggle.** `SideView` = faithful elevation (ray **sweeps** α; `d·tan α` rays, penetration
   band, α wedge, "hit" glow). `TopView` = plan-view **azimuth cone** (`atan((W/2)/d)+azMargin`); the
   sun sweeps its real bearing **time-proportionally**, lit only during the ACTUAL interval, so a
   shorter window shows a shorter bright sweep and motion reflects facing. Limitation: in-interval
   bearing is linear (endpoints/duration exact, pacing smoothed). Fed by `sunDiagram` +
   `sunElevationAtMinute`/`sunAzimuthAtMinute`/`intervalMinutes`; `SchematicView` = fallback.
2. **Plain-language explanation** — view-aware legend + expandable "How is this calculated?"
   (`HowItWorks`) walks `solarPosition` → 5-min loop → azimuth-cone (Top) → penetration band (Side)
   → clustering. Formal version folds into Ch 3.
3. **Window sill UX** (`WindowMeasureCard`) — floor-to-ceiling toggle sets sill = 0; expandable
   "small sill?" picker (preset chips 5–30 cm + manual; AR poor for short gaps, sill ≤30 cm ≈ no effect).

---

## 12. Working agreements / guardrails for Codex

- **Read the actual project files before editing** — this doc is intent, not current code state.
- **Do not over-claim AR accuracy.** Distance = reliable output; window size =
  prototype/approximate. Keep UI wording and logs honest about this.
- **Keep the engine explainable** — every recommendation needs a traceable "why."
- **Don't introduce a trained ML model** — keep it rule-based + weighted.
- **Lux is runtime; PPFD/DLI are not measured** — don't add fake PPFD "measurement."
- **Never hand-tune `LUX_CALIBRATION`** or other derived constants — regenerate only via the
  designated `tools/*.py` scripts (§8).
- **Don't edit the source Excel workbooks without the user** — `WINDOW_MASTER` gaps and
  dataset edits are the user's to make; re-run `export_to_sqlite.py` after any change.
- **Make evaluation data easy to capture** (AR distance, window dims, lux, timestamps) —
  Chapter 4 depends on it (§9).
- Methodology decisions in code should **stay consistent with thesis Chapter 3**.
