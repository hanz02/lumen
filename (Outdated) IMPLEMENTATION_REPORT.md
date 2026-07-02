# Lumen — Implementation & Evaluation Work Report (for thesis Chapters 3 & 4)

> **To: Claude (chat).** This is the **accurate, verified current state** of the Lumen
> system after three rounds of implementation work by Claude Code on the author's
> machine. Use it together with `THESIS_HANDOFF.md` (architecture + methodology) and
> `tools/report/Lumen_Technical_Report.docx` (deep technical reference).
>
> **Integrity rule (the author is strict about this):** when writing the thesis, only
> describe features and numbers listed here as **DONE / VERIFIED**. Do not claim
> anything beyond this report. Every number below was produced by running the real
> code/tools on the real data; nothing is estimated.

---

## 0. Status at a glance

- **Build:** complete and working (RN + native Android/ARCore). All features built.
- **Automated checks:** `npx tsc --noEmit` clean; **`npm test` = 105 tests, 11 suites, all pass.**
- **Three rounds of enhancements** done and verified (details in §2).
- **Evaluation evidence** produced and re-runnable (the Chapter-4 numbers, §3).
- **Not done (intentionally):** on-device *visual* confirmation of a few UI items (needs an
  APK build — cannot be automated); two **optional** evaluation add-ons (external RHS
  spot-check; a fresh-readings calibration sheet). None are required.
- **Source control:** all three rounds are currently **uncommitted** in the working tree
  (the author has not asked to commit yet).

---

## 1. The reframed objective (carry this into Chapter 1)

The FYP-1 proposal's Objective (ii) ("compare rule-based vs a hybrid/ML technique") was
**dropped** — no ML model was built, and one would be indefensible/unexplainable on a
31-plant evidence dataset. The thesis objective is reframed to:

> *"Does measuring the actual spot conditions — illuminance (lux) + AR plant-to-window
> distance + SPA potential-direct-sun — produce more differentiated, spot-specific,
> explainable recommendations than the fixed-label ('low/medium/bright') approach used by
> existing apps (e.g. Green Oasis)?"*

Reuse the proposal's Chapter-1 background/problem/motivation; rewrite the objectives/scope.

---

## 2. What was built — by round (proposed → implemented → verified)

### Round 1 — Lateral plant position · eval metadata · night results view

**Proposed:** the SPA aperture model assumed the plant on the window centre-line (symmetric
azimuth cone), over-estimating direct-sun hours for off-centre plants; add a lateral input
and make the cone asymmetric. Add non-engine eval-log context. Add a night results theme.

**Implemented & VERIFIED:**
- `src/sun/solar.ts` — `estimateDirectSunThroughAperture` now takes signed `lateralOffsetM`
  and builds an **asymmetric** cone from the two window edges seen from the off-centre plant
  (`atan((±W/2 − x)/d) ± 6° margin`); `x = 0` reproduces the old symmetric result exactly.
  Added `signedAngularDiffDeg`. The vertical (penetration) test deliberately stays on the
  perpendicular distance (lateral slant is below the margins — avoids false precision).
- Input: optional 5-position picker (Far-left … Centre … Far-right) on the Spot step
  (`SpotDistanceCard`); `App.tsx` converts the fraction to signed metres and feeds the model.
- `DirectSunCard` Top-view draws the shifted/asymmetric cone.
- Eval-log: new non-engine columns `plant_lateral_offset_m`, `capture_sun_elevation_deg`
  (filters night/dusk rows), `sky_condition` (sunny/partly_cloudy/overcast/indoor_lit).
- Night view: `capturedAtNight` → `DirectSunCard` shows a moon/stars view, hides the
  side/top toggle; hours still shown as POTENTIAL daytime sun.
- **Verification:** tsc clean; 3 new `solar` unit tests; an end-to-end check showed lateral
  changes the hours (centre 3.00 h → edge 2.17 h) and flips the scorch gate.
- **Validity framing (use this):** lateral is justified **geometrically** (trigonometry +
  unit tests), **not** field-validated against lux — describe it as improved *geometric
  fidelity* of the POTENTIAL estimate, never as "field-validated accuracy."

### Round 2 — Field-test fixes (compass · 0-h sun diagram · layout)

Driven by real device testing at a west-facing window with a black metal frame.

**Implemented & VERIFIED:**
- **Compass live readout** (`src/sensor/cardinal.ts` + `AspectCaptureCard`): a rotating SVG
  rose + the heading **in words** ("West") + degrees, updating live; a light **haptic** tick
  on each cardinal change; the accuracy line colour-coded; and a **figure-8 + metal-frame
  caution** when accuracy is low/unreliable. Root cause of the field "compass flip" was
  **environmental** (hard-iron interference from the metal frame), **not** a code bug —
  `CompassModule.kt` is correct. The fix makes a bad reading *visible* so it's re-taken.
- **Sun diagram at 0 h** (`daylightWindow` in `solar.ts` + `DirectSunCard` `noSun` branch):
  even when no direct sun reaches the spot, the Top/Side diagram is still drawn, with the
  sun path visibly **missing** the window opening and the plant never highlighted.
- **Verified the puzzling field case** (west window 5.5 h vs east window 0 h with the same
  "Left" pick) is **correct geometry**, not a bug: the compass had flipped between runs, and
  at KL in June the sun is in the **north**, so an ESE opening with a left-shifted cone
  legitimately gets ~0 h. (A throwaway test reproduced 5.5 h / 0 h exactly, then was deleted.)
- **Layout:** widened the window-size input (was clipping "115.1"); made the AR result dialog
  a responsive width (`inflate(…, null)` had dropped its fixed 300 dp).
- **Verification:** tsc clean; added `cardinal` + `daylightWindow` unit tests.

### Round 3 — Factor-breakdown UI · manual distance · evaluation artifacts

**Implemented & VERIFIED:**
- **Factor-breakdown accordion** (`RecommendationList`): every plant card has a *"See score
  breakdown"* toggle (one open at a time) showing the **four weighted factors** — Light fit
  30% / Sun comfort 25% / Distance fit 25% / Evidence quality 20% — as green/amber/red bars
  with the real sub-score (0–100) and a plain-language note; an unavailable factor says
  "not captured". Uses the engine's own `factors` data. *(This previously existed only as a
  design mockup, not in the running app — see remark R1.)*
- **Manual distance fallback** (`SpotDistanceCard` + `App.tsx`): a tape-cm input for when
  ARCore can't track; exactly one source active (`effectiveDistanceM`); eval-log gains
  `plant_distance_cm` + `plant_distance_source` (`ar`/`manual`), AR-quality fields left blank
  on manual rows so AR-accuracy stats stay clean.
- **Evaluation artifacts:** see §3/§4.
- **Verification:** tsc clean; `npm test` 105 pass (added the distance-source assertion + the
  3 engine-correctness tests).

---

## 3. Evaluation evidence (the real Chapter-4 numbers)

| Evidence | Result | Source (re-runnable) |
|---|---|---|
| Unit-test correctness | **105 tests pass**, 11 suites, tsc clean | `npm test` |
| **Engine-vs-evidence correctness** (internal validity) | **620/620 (100%)** plant-spot gate+band decisions match the verdict re-derived independently from the dataset's own thresholds | `tools/eval/engine_correctness.test.ts` → `tools/eval/output/engine_correctness.md` |
| **IV/DV Part 1** (do distance+sun drive the output?) | lux held at 3000; output moved **8 → 30 → 8** recommendations as only distance+sun changed (a lux-only system would not move) | `tools/eval/ivdv_evaluation.test.ts` → `part1_verification.md` |
| **IV/DV Part 2** (measured vs fixed-label) | distance falloff stays in one Photone band ~**55%** of sessions (fixed-label blind); the measured engine still differentiates **89%** of those (median **11 of 31** plants); sun is the part lux can never encode | `part2_comparison.md` |
| **Lux calibration — in-sample fit** | `meter = 1.1054·phone + 134.4`, **R² = 0.9928**, n = 210 (unchanged; this ships in `config.ts`) | `tools/analyze_spot_observations.py` → `calibration_constants.txt` |
| **Lux calibration — cross-validated (held-out)** | session-level 5-fold: **MAE ≈ 268 lux, MAPE ≈ 15%** in the valid range (≥200 lx); ~38% if sub-200 rows are included (inflated — see remark R3) | `calibration_crossval.csv` |
| Distance/light falloff | median light falls to ~**34%** (≈2.9× drop) from 50 → 150 cm | `distance_falloff.csv` |
| Instrument validation logs | **templates ready to fill:** AR-distance-vs-tape, window-size-vs-tape, calibration hold-out | `Downloads/files/*.xlsx` |

---

## 4. Where the artifacts live (for upload / citation)

**In `Downloads/files/` (hand these to Claude chat for Chapter 4):**
- `Functional_Test_Case_Log_v2.xlsx` — corrected + expanded manual test cases (TC-01…TC-23).
- `AR_vs_Tape_Validation_Log_v2.xlsx` — AR distance vs tape (Bland-Altman ready).
- `Window_Size_AR_vs_Tape_Log.xlsx` — new template (per-dimension; sill separate).
- `Evaluation_Verification_Summary.md` — the spreadsheet-verification write-up.
- *(originals `*_v2`-less are kept untouched for comparison.)*

**In the repo:**
- `tools/eval/output/{variables,part1_verification,part2_comparison,engine_correctness}.md`
  — paste-ready evaluation results from the real engine.
- `tools/analysis_output/{agreement_summary,distance_falloff,within_spot_spread,
  calibration_crossval}.csv` + `calibration_constants.txt`.
- `tools/eval/output/Lumen_Evaluation_Report.docx` (plain-language, 8 diagrams) and
  `tools/report/Lumen_Technical_Report.docx` (deep technical, 10 diagrams).
- `THESIS_HANDOFF.md` (architecture + per-chapter guidance).

---

## 5. Validity framing for Chapter 4 (say it exactly like this)

The evaluation has three honest pillars; keep them distinct:
1. **Internal validity (verification) — DONE.** The engine **faithfully applies its evidence
   base**: 620/620 gate+band decisions match an independent re-derivation from the cited
   thresholds. This is "the engine does its own job correctly," proven by independent
   re-implementation (differential testing). It does **not** claim the thresholds match
   reality.
2. **Differentiation — DONE.** The measured-spot engine produces different, more
   spot-specific recommendations than the fixed-label baseline (IV/DV Part 1 + Part 2).
3. **Instrument accuracy — DONE for lux (cross-validated), templates ready for AR.** Report
   the **cross-validated held-out** calibration error (MAE ≈ 268 lux / MAPE ≈ 15%), not only
   the in-sample R² = 0.993.

**External validity** (do the recommendations match real horticulture?) is the *only* gap —
optionally a thin **RHS coarse spot-check** (qualitative; an independent authority broadly
agreeing with the dataset's light categories). It is a nice-to-have, **not** required, and
must be framed as coarse agreement, never as a controlled trial.

---

## 6. Remarks for Claude (chat) — load-bearing; do not let the thesis contradict these

- **R1 — the factor-breakdown UI now exists (it did not before).** Earlier docs/mockups
  implied a four-bar breakdown screen that was never coded; it has now been built for real,
  so it is safe to describe and screenshot. Do not, however, retro-claim it existed earlier.
- **R2 — AR distance is mandatory in the UI; only the sun step is optional.** Do not say the
  user can skip distance. The new manual tape fallback is the alternative way to satisfy it.
  (The "missing-distance" weight-renormalisation path therefore exists in code but is
  exercised by unit tests only, not reachable by a user.)
- **R3 — calibration: report the held-out number, not just R².** R² = 0.993 is the in-sample
  fit on the same 210 pairs used to build the line. The honest accuracy is the
  cross-validated **MAE ≈ 268 lux / MAPE ≈ 15%** (valid range ≥200 lx). The ~38% all-rows
  MAPE is inflated by sub-200-lux dimness — which is exactly why the app returns raw lux
  below 200 lx (the range guard). State both and explain.
- **R4 — the gate compares the CALIBRATED lux, not the raw reading.** If you quote an
  elimination reason string, use the exact wording (in the v2 sheet).
- **R5 — window orientation is NOT an engine gate or score term.** It only feeds the SPA sun
  estimate (an upstream variable). Keep that distinction in the IV/DV table.
- **R6 — measured vs computed vs assumed are three different words.** The app **measures**
  lux; **computes** POTENTIAL direct sun (clear-sky, geometric); and **assumes** an
  unobstructed sky + a 0.4 m plant top. Never blur these.
- **R7 — the locked guardrails still hold:** lux is the runtime unit (PPFD/DLI are NOT
  measured); AR distance is reliable, AR window-size is prototype/approximate; no trained ML
  model exists; every recommendation is explainable.
- **R8 — AR hit-quality has four values** (`PLANE / DEPTH / FEATURE_POINT /
  INSTANT_PLACEMENT`, plus an `UNKNOWN` fallback, and a plane hit downgraded to DEPTH on
  plane-mismatch) — not a simple 3-tier scale.

---

## 7. Open / optional items (the author's call — none block the thesis)

- On-device **visual** verification of the accordion + manual-distance field (build the APK).
- Optional **RHS external face-validity** spot-check sheet (qualitative external validity).
- Optional **fresh-readings** calibration sheet (~25 new pairs) — only if extra field data is
  wanted beyond the cross-validation.
- **Commit** the working tree (Rounds 1–3 are currently uncommitted).

*End of report. Pair this with `THESIS_HANDOFF.md` for methodology and the two `.docx`
reports for diagrams. Keep the writing measured, explainable, and honest — like the system.*
