# CH5 EVAL — final summary table

Every item the brief asked for, the verdict, the exact value, and the input file used.
Raw command output and computations are in the numbered `1x_*.txt` files.

| Item | Result | Exact value | Input file used |
|---|---|---|---|
| 1A Input sensitivity A/B/C | CONFIRMED | 8 / 30 / 8 recommended (lux 3000 → 3451) | `tools/eval/ivdv_evaluation.test.ts` |
| 1A A vs C set/order | CONFIRMED | same 8-plant set, different order (Jaccard 1.00, rank agr. 0.82) | same |
| 1B Group 1 (same lux, diff sun) | CONFIRMED | baseline 30 / 30; engine 28 / 8 | `ivdv_evaluation.test.ts` |
| 1B Group 2 (within band) | CONFIRMED | baseline 30/30/30; engine 30/30/19 | same |
| 1B Group 3 (crosses bands) | CONFIRMED (nuance) | baseline 31/30/30; engine 30/30/30 (both react; engine edge is ranking) | same |
| 1C Within-band split | CONFIRMED | 41/70 within (58.6%), 29/70 cross (41.4%) ≈ 59/41 | `tools/analysis_output/distance_falloff.csv` |
| 1C split robustness | CONFIRMED | 60.0% on calibrated phone lux (not an artifact) | same |
| 1C vs "89% differentiation" | CONFIRMED DIFFERENT METRIC | 89% is engine differentiation rate, not the band-crossing split | CLAUDE.md dev log |
| 1D AR bias | CONFIRMED | +5.55 cm | `AR_vs_Tape_Validation_Log_v2.xlsx` / AR_vs_Tape |
| 1D AR MAE / MAPE | CONFIRMED | 9.18 cm / 11.07% | same |
| 1D AR LoA | CONFIRMED | −25.2 to +36.3 cm | same |
| 1D AR correlation r | CONFIRMED | 0.990 | same |
| 1D AR outlier | CONFIRMED | +63.3 cm (S26, tape 200 → AR 263.3) | same |
| 1D Window width | CONFIRMED | MAE 5.3 cm, MAPE 3.6% (n=30) | `Window_Size_AR_vs_Tape_Log.xlsx` / WindowSize_vs_Tape |
| 1D Window height | CONFIRMED | MAE 15.1 cm, MAPE 7.2% (n=30) | same |
| 1D Window sill | CONFIRMED (real, not unit artifact) | MAE 17.7 cm, MAPE 37.6% (n=30); W13 +257, W30 +69 | same |
| 1D Window overall bias | CONFIRMED | −0.32 cm (n=90) | same |
| 1E Functional cases | CONFIRMED | 38 cases, 37 Pass, 1 Fail (TC-37) | `Functional_Test_Case_Log_v2 (version 1).xlsx` |
| 1E Filename | DIFFERENT (cosmetic) | actual name uses `(version 1)` with a space, not underscores | same |
| 1E TC-37 root cause | CONFIRMED (code-level) | UX-consistency gap across 3 AR-unsupported layers; no crash/black screen | `App.tsx`, `ARMeasurementActivity.kt`, `SpotDistanceCard.tsx` |
| 1F Test suite | CONFIRMED | 118 tests / 11 suites pass | `npm test` |
| 1F Type check | CONFIRMED | tsc --noEmit exit 0 | `npx tsc --noEmit` |
| 1F Engine correctness | CONFIRMED | 620/620, 0 mismatches (10 spots × 31 plants × 2) | `engine_correctness.test.ts` |
| 1F SQLite counts | CONFIRMED | plant 31 / evidence 171 / lookup 70 | `plant_db.sqlite` |
| 1F Calibration constants | CONFIRMED | slope 1.1054, intercept 134.4, validMinLux 200, enabled | `src/engine/config.ts` |
| Calibration regression | CONFIRMED | n=210, r=0.996, R²=0.993 | `agreement_summary.csv` (refit from 210 pairs reproduces exactly) |
| Cross-validation | CONFIRMED | 183 held-out ≥200 lx, MAE 267.5, MAPE 15.07% (38.36% incl. <200) | `calibration_crossval.csv` |
| Fig 5.1 calibration scatter | DELIVERED | `figures/fig_5_1_calibration_scatter.png` (300 dpi) | `calibration_pairs_210.csv` |
| Fig 5.2 Bland-Altman AR | DELIVERED | `figures/fig_5_2_bland_altman_ar.png` (300 dpi) | `AR_vs_Tape_Validation_Log_v2.xlsx` |
| Fig 5.3 window per-dimension | DELIVERED | `figures/fig_5_3_window_dimensions.png` (300 dpi) | `Window_Size_AR_vs_Tape_Log.xlsx` |
| Fig 5.4 distance fall-off | DELIVERED | `figures/fig_5_4_distance_falloff.png` (300 dpi) | `distance_falloff.csv` |
| Fig 5.5 RQ3 concept (optional) | DELIVERED | `.drawio.xml` (editable) + `.png` (embedded) | judged worthwhile (shows the sun case) |
| Chapter 5 draft | DELIVERED | `SWE2302061_Chapter5_FULL_DRAFT.docx` (+ `.pdf`) | thesis house style, prose rules verified |

## Notes on the two DIFFERENT items
- **Functional-log filename** is `Functional_Test_Case_Log_v2 (version 1).xlsx` (space + parentheses), not the underscore form in the brief. Cosmetic only, same file.
- **Group 3** is CONFIRMED but with the honest nuance that the baseline count moves (31→30→30)
  while the engine count is flat (30/30/30). Both differentiate there; the engine's edge in
  Group 3 is ranking, not membership. See REMARKS.md §2(c) for the defensive phrasing.

Nothing was NOT FOUND. No expected value had to be turned from a failure into a pass.

## What NOT to claim (from the brief's guardrails, all honoured here)
- No runtime latency figure is reported (none was measured).
- The analysis is hand-written pure Python plus openpyxl, not scipy/sklearn/pandas.
- TC-37, the AR +63.3 cm outlier, and the 37.6% sill error are all reported plainly, not smoothed over.
