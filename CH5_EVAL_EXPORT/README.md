# CH5_EVAL_EXPORT — Chapter 5 evaluation package

Everything produced for Chapter 5 (Results and Evaluation) of the Lumen thesis.
All numbers are live-regenerated from the repository or independently re-computed
from the named validation workbooks. Read-only for app source was honoured.

## Deliverables

**The chapter**
- `SWE2302061_Chapter5_FULL_DRAFT.docx` — the drafted chapter, thesis house style
  (Times New Roman 12pt, black bold headings, captions below tables/figures), all five
  figures embedded. Prose obeys the Ch3/Ch4 rules (no em/en dashes, no semicolons, no
  colons in running prose; verified by an automated scan).
- `SWE2302061_Chapter5_FULL_DRAFT.pdf` — rendered preview of the same.
- `build_ch5.js` — the generator. Rebuild with:
  `NODE_PATH=../tools/eval/docx_build/node_modules node build_ch5.js`

**Numerical results (Part 1)**
- `PART1_NUMERICAL_RESULTS.md` — 1A to 1F written up with verdicts and the TC-37 root cause.
- `00_SUMMARY_TABLE.md` — the final item / verdict / value / source table.
- `1A_1B_ivdv_raw_output.txt`, `1C_within_band_split.txt`, `1D_ar_window_recompute.txt`,
  `1E_functional_test_log.txt`, `1F_npm_test_raw.txt`, `1F_engine_correctness_raw.txt`,
  `1F_tsc_raw.txt` — raw command output / computations.

**Figures (Part 2, 300 dpi PNG in `figures/`, each with its `.py` generator)**
- `fig_5_1_calibration_scatter.py`  → phone-vs-meter calibration scatter
- `fig_5_2_bland_altman_ar.py`      → Bland-Altman AR distance
- `fig_5_3_window_dimensions.py`    → window size accuracy per dimension
- `fig_5_4_distance_falloff.py`     → distance fall-off vs band boundaries
- `fig_5_5_rq3_concept.py` + `fig_5_5_rq3_concept.drawio.xml` → RQ3 concept (optional)

**Data pulled for the figures**
- `calibration_pairs_210.csv` — the 210 phone/meter pairs (refit reproduces slope 1.1054,
  intercept 134.4, r 0.9964 exactly).
- `distance_falloff.csv` — copy of `tools/analysis_output/distance_falloff.csv`.

**Critical read (Part 4)**
- `REMARKS.md` — what is fragile, how to phrase it defensively, Ch3 consistency, what the
  reference theses have that this does not, and figure-honesty notes.

## How to reproduce the headline numbers
```
npx jest tools/eval/ivdv_evaluation.test.ts     # 8 / 30 / 8 ; baseline groups
npx jest tools/eval/engine_correctness.test.ts  # 620/620
npm test                                        # 118 tests / 11 suites
npx tsc --noEmit                                # clean
python CH5_EVAL_EXPORT/fig_5_1_calibration_scatter.py   # (and 5_2 .. 5_5)
```
