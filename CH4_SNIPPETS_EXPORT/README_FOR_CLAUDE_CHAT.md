# README — Chapter 4 engine/snippet evidence (from Claude Code, who can see the repo)

This folder closes the §4.6 code-walkthrough gaps. Below: what's here, where the rest
lives, and my remarks on the traps that will make a §4.6 sentence wrong if assumed.

## 1. What is in THIS folder (CH4_SNIPPETS_EXPORT)
- `ENGINE_CORE_full.txt` — **all 9 files of `src/engine/`, complete and current.** The
  thesis centerpiece. This consolidates + supersedes the scattered earlier engine
  exports. Verified byte-identical to live source on 2026-06-30.
- `A_app.txt` … `F_small_files.txt` — the snippet-brief excerpts (wizard, solar
  functions, AR distance + hit-quality, results UI, window-skip, 4 small sensor files).
- `ZZ_TABLE.txt` — extraction table + every place the brief's location/scope differed.
- `README_FOR_CLAUDE_CHAT.md` — this file.

## 2. Engine completeness check (the thing you asked me to be sure of)
`src/engine/` has **9** files. All 9 are now exported in `ENGINE_CORE_full.txt`:

| File | Lines | Role | Previously exported? |
|---|---|---|---|
| config.ts | 69 | All tuning constants (weights, zones, calibration, thresholds) | yes (T3b_config) |
| types.ts | 117 | Plant / SpotInput / Recommendation / FactorScore / LightBand | yes (T3g_types) |
| calibration.ts | 31 | `applyLuxCalibration` (lux→lux, range-guarded) | yes (T3b_calibration) |
| lightFit.ts | 66 | `classifyBand` + piecewise `lightFitScore` (0.6→1.0 ramp) | yes (FA_lightFit, supplement) |
| gates.ts | 47 | The 2 hard gates (lux floor + direct-sun) | yes (T3e_gates) |
| scoring.ts | 141 | 4-factor weighted score + missing-input renormalisation | yes (T3f_scoring) |
| explain.ts | 156 | Plain-language "why", `recommendationConfidence` | yes (T3g_explain) |
| recommend.ts | 118 | Orchestrator: calibrate → gate → score → rank → explain | yes (T3g_recommend) |
| **index.ts** | 10 | Public barrel (the engine's exported API surface) | **NO — was the only gap; now included** |

So: every engine file is exported. `index.ts` (the public entrypoint) was missing from
all prior batches and is the only thing newly added — useful for §4.6 to show the
engine's clean public API boundary.

## 3. Data-flow order to describe in §4.6 (this is the "core algorithm" narrative)
`recommend(plants, spot)` (recommend.ts:95) is the heart — analogous to the SM-2
walkthrough in the reference thesis. The honest order is:
1. **Calibrate first** — recommend.ts:98-100 substitutes calibrated lux into the spot
   (`applyLuxCalibration`) BEFORE anything else. Raw is kept only for display.
2. **Gate** — gates.ts:25 `applyGates` on the CALIBRATED lux: (a) below
   `maintenance_lux_min` → eliminated; (b) `direct_sun_tolerance==='none'` AND spot has
   direct sun → eliminated. Orientation is NOT a gate.
3. **Score survivors** — scoring.ts:118 `scorePlant`: four factors (light .30 /
   directSun .25 / distance .25 / confidence .20). Unavailable factors are dropped and
   the remaining weights renormalised (scoring.ts:126-134).
4. **Rank + explain** — recommend.ts:102-113 sort by score then confidence then name;
   explain.ts attaches the "why" and the `'reduced'` confidence label.

## 4. My remarks — traps that will make a sentence wrong (carried over from all sessions)
- **Gate compares CALIBRATED lux, not raw.** (recommend.ts:99 → gates.ts:28.)
- **Orientation is neither a gate nor a scoring weight** — it only feeds the SPA
  direct-sun estimate + a display label. The four scoring factors do not include it.
- **lightFitScore floor is 0.6, excess penalty is 0.7, preferred = 1.0.** It also
  returns 0 below the floor on its own (not just relying on the gate).
- **Missing facing/sun → factor excluded + weights rescaled proportionally**, NOT a zero
  penalty; the user sees a `'reduced'` confidence label (explain.ts:67-75), not a lower
  score.
- **SPA is NOT in the engine.** Solar position (NOAA/Meeus, NOT Reda & Andreas) lives in
  `src/sun/solar.ts` (see `B_solar.txt`). The engine only consumes `directSunHours`.
- **No PPFD/DLI is measured or scored** — they exist only as a display-only reference
  panel. **No trained ML model** anywhere; the engine is rule-based + weighted by design.
- **AR hit-quality is 4 enum values + UNKNOWN fallback**, and `findValidHit()` only
  decides 3 of them (PLANE/DEPTH/FEATURE_POINT) — INSTANT_PLACEMENT comes from a separate
  path. See ZZ_TABLE.txt note on C2.

## 5. Where the NON-engine core code already lives (don't re-request)
- SPA / solar: `B_solar.txt` (this folder).
- AR native distance + hit quality: `C_ar_activity.txt` (this folder).
- Plateau-median light algorithm (the novel sensor routine): full file already in
  `CH4_IMPLEMENTATION_EXPORT_2026-06-28/T3a_plateau.txt`. Worth an excerpt in the
  light-capture subsection — ask Claude Code if you want it pulled as a clean snippet.
- Compass (native circular-mean + JS): `CH4_IMPLEMENTATION_EXPORT/T3_CompassModule.txt`
  + `F_small_files.txt` (useCompassCapture.ts, compass.ts).
- Data pipeline + DB schema: `CH4_IMPLEMENTATION_EXPORT/T2_database.txt` (.schema) and
  `T2_mapPlant.txt`; `plantStore.ts` in `F_small_files.txt`.
- Tools/versions, manifest, non-functional, constraints: the T1/T5/X files in
  `CH4_IMPLEMENTATION_EXPORT_2026-06-28`.

## 6. Verification state (so you can write §4.6 as fact, not inference)
`npx tsc --noEmit` → exit 0. `npm test` → 118 tests / 11 suites pass. Engine exports
diffed byte-identical to live source. No file in any export folder is empty.
