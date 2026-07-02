# PART 1 — Numerical results regenerated and confirmed (Chapter 5)

All numbers below are live-regenerated from the repository or independently
re-computed from the named workbook. Raw command output is saved alongside this
file (`1A_1B_ivdv_raw_output.txt`, `1C_within_band_split.txt`,
`1D_ar_window_recompute.txt`, `1E_functional_test_log.txt`,
`1F_*_raw.txt`). Every value that the brief expected is marked CONFIRMED or the
real value is given.

---

## 1A. Input-sensitivity scenarios (Research Question 2)

Command: `npx jest tools/eval/ivdv_evaluation.test.ts`
Console line: `[IV/DV eval] lux=3000 (calibrated) → A: 8 rec / 23 elim | B: 30 rec / 1 elim | C: 8 rec / 23 elim`

Lux held constant at 3000 lx phone (**3451 lx calibrated**); only distance and SPA sun vary.

| Case | Spot (IVs, lux fixed) | # Recommended | Expected | Verdict |
|---|---|---:|---:|---|
| A | near + strong sun (0.5 m, 5 h) | **8** | 8 | CONFIRMED |
| B | deep + no sun (3.0 m, 0 h) | **30** | 30 | CONFIRMED |
| C | mid + moderate sun (1.5 m, 2 h) | **8** | 8 | CONFIRMED |

- A lux-only method returns the **same** count in all three (same 3451 lx band); the
  engine returns 8 / 30 / 8. The RQ2 argument holds exactly.
- **A vs C**: identical survivor SET (Jaccard = 1.00) but different ORDER
  (rank agreement 0.82; top-3 lists differ). CONFIRMED — distance and sun-hours change
  ranking, not membership, between A and C.
- Sub-score proof (Snake Plant): distance sub-score 0.70 (A, near) vs 1.00 (C, mid)
  and direct-sun 0.60 (A, 5 h) vs 1.00 (C, 2 h) — the IVs feed the math, not just the text.
- Gate-flip worked example: ZZ Plant (no sun tolerance) is ELIMINATED in A and C (sun
  present) but recommended at 100.0 in B (no sun) — same 3000 lx throughout.

## 1B. Fixed-label baseline comparison groups (Research Question 3)

Same run, `tools/eval/output/part2_comparison.md`. Baseline = `scoreLabelGuessed(lux)`
(Photone bands low <4000 / medium <11000 / full; lux only; unranked).

**Group 1 — same lux (2000 lx), different sun** (cleanest case)

| Spot | Lux | Band | Baseline count | Engine # rec | Engine #1 |
|---|---:|---|---:|---:|---|
| X (north, no sun) | 2000 | low | 30 | **28** | Anthurium |
| Y (west, 3 h sun) | 2000 | low | 30 | **8** | Purple Passion |

Baseline identical (30 = 30); engine separates 28 vs 8 via the sun gate. CONFIRMED.

**Group 2 — real falloff staying in ONE band** (W001, 2800→1328 lx, ~3× drop)

| Spot | Lux | Band | Baseline count | Engine # rec |
|---|---:|---|---:|---:|
| D1 (50 cm) | 2800 | low | 30 | 30 |
| D2 (100 cm) | 2443 | low | 30 | 30 |
| D3 (150 cm) | 1328 | low | 30 | **19** |

Baseline 30/30/30 (blind); engine drops to 19 at 150 cm. CONFIRMED.

**Group 3 — real falloff CROSSING bands** (W004, 12040→3410 lx)

| Spot | Lux | Band | Baseline count | Engine # rec |
|---|---:|---|---:|---:|
| B1 (50 cm) | 12040 | full | 31 | 30 |
| B2 (100 cm) | 5192 | medium | 30 | 30 |
| B3 (150 cm) | 3410 | low | 30 | 30 |

HONEST NOTE: here the baseline DOES react — its band changes full→medium→low and its
count moves 31→30→30. The engine count is steady at 30 (no plant crosses a survival
floor or scorch gate over this range with no direct sun). So in Group 3 **both methods
differentiate**, and neither is made to look worse than it is. The baseline is credited
fairly. The engine's advantage in Group 3 is ranking, not membership.

## 1C. Within-band split — CONFIRMED

Source: `tools/analysis_output/distance_falloff.csv` (repo-emitted, ground-truth METER
lux columns `meter_avg_50cm/100cm/150cm`). Bands: low <4000, medium <11000, full ≥11000.

- **41 of 70 sessions (58.6%) stay WITHIN one band; 29 (41.4%) CROSS a band.** ≈ 59 / 41. CONFIRMED.
- This is a DIFFERENT metric from the CLAUDE.md dev-log "55% same-band / engine
  differentiates 89%". That 89% is the engine's differentiation RATE (how often the engine
  changes its answer across the triplet); the 59/41 here is the band-CROSSING split of the
  ground-truth light itself. The chapter must not conflate them — they measure two things.

## 1D. AR distance + window-size agreement — INDEPENDENT re-computation

diff = App AR − Tape; sample SD; LoA = bias ± 1.96·SD. Pure-Python + openpyxl (hand-written).

**AR distance** — `AR_vs_Tape_Validation_Log_v2.xlsx` / sheet `AR_vs_Tape` / cols Tape(E), App AR(F):

| Metric | Re-computed | Brief expected | Verdict |
|---|---|---|---|
| n | 30 | 30 | CONFIRMED |
| Bias | +5.55 cm | +5.6 | CONFIRMED |
| MAE | 9.18 cm | 9.2 | CONFIRMED |
| MAPE | 11.07% | 11.1% | CONFIRMED |
| LoA | −25.2 to +36.3 cm | −25.2..+36.3 | CONFIRMED |
| r | 0.990 | 0.990 | CONFIRMED |
| Outlier | +63.3 cm (S26, tape 200→AR 263.3, PLANE hit, indoor-lit) | +63.3 | CONFIRMED |

**Window size** — `Window_Size_AR_vs_Tape_Log.xlsx` / sheet `WindowSize_vs_Tape` / cols Dimension(D), Tape(E), App AR(F):

| Dimension | n | MAE | MAPE | Verdict |
|---|---:|---|---|---|
| width | 30 | 5.3 cm | 3.6% | CONFIRMED |
| height | 30 | 15.1 cm | 7.2% | CONFIRMED |
| sill | 30 | 17.7 cm | 37.6% | CONFIRMED |
| overall | 90 | (bias −0.32 cm) | — | CONFIRMED (bias ≈ −0.3) |

Sill MAPE is REAL, not a unit artifact. Units are consistent cm. It is driven by
(1) genuinely small denominators (low sills of 8.5–15 cm, so a few cm is a large %) and
(2) two gross AR failures — W13 (tape 45 → AR 302.4, +257 cm) and W30 (tape 46 → AR 114.8,
+69 cm) where AR locked onto a far surface. This is exactly why window size is documented
as approximate and never a hard engine input.

## 1E. Functional test log — CONFIRMED including the failure

Source: `Functional_Test_Case_Log_v2 (version 1).xlsx` / sheet `Functional_Test_Cases`.
(NOTE: the real filename uses `(version 1)` with a space, not the underscores in the brief.)

- **38 cases TC-01..TC-38, 37 Pass, 1 Fail (TC-37).** CONFIRMED.
- Module coverage (19 modules): Lux Capture 2, Lux Calibration 2, AR Distance 5,
  Compass/SPA 3, Compass 1, Engine-Gate1 1, Engine-Gate2 1, Engine-Scoring 1,
  Engine-Explanation 1, Engine-Lightfit 1, Engine-Edge 1, Wizard Flow 6, Evaluation Log 2,
  SPA-Lateral 1, SPA-Diagram 1, SPA-Night 1, System 3, Window Size 4, UI/Polish 1.
  The suite spans every subsystem the thesis claims (captures, AR, both gates, scoring,
  SPA, night/lateral, eval log, offline, wizard locking).

### TC-37 root cause (from the code)

TC-37 (module AR Distance): "AR-unsupported device shows a clear message instead of a
black screen (field-confirmed, Xiaomi Redmi Note 10)."
- **Expected (as written round 11):** user taps *Measure with AR* →
  `ArCoreApk.checkAvailability()` → an AlertDialog "AR not supported..." → distinct toast
  (`E_AR_UNSUPPORTED`) → tape fallback. The row explicitly notes that pre-emptively
  greying out the AR buttons was "a possible further enhancement, **not implemented this round**."
- **Actual observed:** "AR measurement buttons for plant distances and window sizes are
  disabled and greyed out." Verdict **Fail**.
- **Why it is a genuine, honest failure (code-level):** the app has three defensive
  layers against an unsupported device, and each handles a *different* ARCore availability
  state, so the exact path a device takes is not uniform:
  1. Startup (React Native, `App.tsx:263` `checkARAvailability()`): if the device reports
     `UNSUPPORTED_DEVICE_NOT_CAPABLE`, `arUnsupported` is set true and the AR buttons are
     greyed at once with inline text ("AR not supported on this device — enter the distance
     by tape below", `SpotDistanceCard.tsx:265`).
  2. Native `onCreate` (`ARMeasurementActivity.kt:224`): same NOT_CAPABLE check before
     attaching ArFragment → AlertDialog + `ar_unsupported` extra.
  3. Native `onResume` (`ARMeasurementActivity.kt:198`): wraps `super.onResume()` in
     try/catch because the **Redmi Note 10** returns `SUPPORTED_NOT_INSTALLED` first
     (ArFragment redirects to the Play Store, which then reports the device incompatible and
     throws) → catch → AlertDialog.
  Between round 11 (when the expected result was written) and the field test, Layer 1 was
  added. On the device actually tested, `checkAvailability()` returned
  `UNSUPPORTED_DEVICE_NOT_CAPABLE`, so Layer 1 greyed the buttons at startup and the user
  never reached the "tap → AlertDialog" interaction the expected result described. The app
  did handle the device gracefully (no black screen, no crash — the original bug is fixed),
  but the observed handling PATH did not match the written expected steps, so the tester
  correctly recorded a Fail rather than bending the expectation.
- **The honest defect this exposes:** the AR-unsupported experience is not uniform across
  device types. A device reporting NOT_CAPABLE gets greyed buttons (no tap, no dialog); a
  Redmi-Note-10-style device reporting SUPPORTED_NOT_INSTALLED only fails after a Play Store
  round-trip. There is no single message-on-tap that covers both. The fix (Chapter 6 future
  work) is one unified capability pre-flight that greys the AR controls the same way for
  every unsupported state, so the user always sees the same clear inline explanation.
  This is a UX-consistency gap, not a stability or data-correctness fault.

## 1F. Anchor numbers (live)

| Item | Command | Result | Verdict |
|---|---|---|---|
| Test suite | `npm test` | 118 tests / 11 suites pass | CONFIRMED |
| Type check | `npx tsc --noEmit` | exit 0 (clean) | CONFIRMED |
| Engine correctness | `npx jest tools/eval/engine_correctness.test.ts` | 620/620, 0 mismatches | CONFIRMED |
| SQLite counts | plant / evidence / lookup | 31 / 171 / 70 | CONFIRMED (evidence = 171) |
| Calibration | `src/engine/config.ts` LUX_CALIBRATION | slope 1.1054, intercept 134.4, enabled, validMinLux 200 | CONFIRMED |

Note: the brief said "evidence 171" and the DB has 171 (CLAUDE.md §8 text mentions a 168-row
authoring source; the exported table is 171). Report 171 as the built count.

Independent oracle (for §5.3): `engine_correctness.test.ts` re-derives each verdict from the
plant's own `maintenance_lux_min` / preferred range / `direct_sun_tolerance`. It shares with
the engine ONLY `applyLuxCalibration` (the calibration transform) and
`DIRECT_SUN_HOURS_THRESHOLD` (the single published 1.0 h constant); it re-implements the
gate and band decision logic independently. 620 = 10 spots × 31 plants × 2 checks (gate + band).
