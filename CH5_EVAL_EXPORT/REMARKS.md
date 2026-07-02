# REMARKS — critical read of the Chapter 5 evidence (Part 4)

Written after regenerating every number. Precision and honesty over reassurance.

---

## 1. Numbers in the brief that differ from reality

Almost everything the brief expected reproduced exactly. The differences are small
but worth stating so no sentence in the chapter is wrong.

| Item | Brief said | Reality | Note |
|---|---|---|---|
| Input-sensitivity A/B/C | 8 / 30 / 8 | 8 / 30 / 8 | Exact. |
| Within-band split | 59 / 41 | 58.6 / 41.4 (meter lux) | Round to 59 / 41. Robust (see §4). |
| AR distance stats | bias +5.6, MAE 9.2, MAPE 11.1%, LoA −25.2..+36.3, r 0.990 | +5.55, 9.18, 11.07%, −25.2..+36.3, 0.990 | Exact to rounding. |
| Window per-dimension | 5.3/3.6, 15.1/7.2, 17.7/37.6 | identical | Exact. |
| Functional log | 37 Pass / 1 Fail | 37 / 1 | Exact. |
| SQLite evidence rows | 171 | 171 | Exact (CLAUDE.md prose elsewhere says the 168-row authoring source; the built table is 171). |
| Functional-log filename | `Functional_Test_Case_Log_v2__version_1_.xlsx` | `Functional_Test_Case_Log_v2 (version 1).xlsx` | Space + parentheses, not underscores. Cosmetic. |
| Group 3 baseline "reacts" | implied both change counts | baseline count 31→30→30, **engine count 30/30/30** | See §2 — the engine's Group-3 edge is ranking, not membership. Report honestly. |

No expected value had to be turned from a pass into a fail or vice versa.

## 2. Claims that are fragile or attackable, and how to phrase them defensively

**(a) The Part 2 group spots are representative, not verbatim workbook rows.**
The engine and baseline COUNTS are real (the real engine is run on the stated inputs),
but the input triplets (Group 2: 2800/2443/1328 lx; Group 3: 12040/5192/3410 lx) and the
Group 1 pair (2000 lx, 0 h vs 3 h) are illustrative spots CHOSEN to sit within or across a
band, with magnitudes consistent with the real fall-off data. They are not literal rows of
`distance_falloff.csv`.
- *Defensive phrasing:* "Representative spots, with light levels and fall-off magnitudes
  drawn from the field data, are run through both methods." Do NOT write "these measured
  sessions", because the exact numbers are constructed. The QUANTIFIED backing for how often
  the within-band case occurs is the separate 59% figure computed on all 70 real sessions —
  keep that as the empirical anchor and treat the three groups as worked illustrations of it.

**(b) Group 1 (same lux, different sun) is a definitional contrast, not a sampled result.**
It shows that a lux number cannot encode sun, which is true by construction. That is fine as
the "cleanest case", but an examiner may say it is engineered.
- *Defensive phrasing:* frame it as "a controlled illustration of an information gap that is
  true by definition — one number cannot carry two independent facts" rather than as an
  empirical frequency. Its strength is logical, not statistical.

**(c) Group 3 does NOT show the engine beating the baseline on membership.** Both differentiate
(baseline band changes full→medium→low; engine count is flat at 30). If the chapter implies the
engine wins here on the recommended SET, that is false and easily checked.
- *Defensive phrasing:* "Where the light crosses a band (about 41% of sessions), the fixed-label
  method also reacts, and it is credited for this. The engine's remaining advantage in these
  cases is that it still ranks the survivors, which the fixed-label method never does."

**(d) AR limits of agreement are wide (−25 to +36 cm) on a small sample (n=30).** An examiner
will note ±30 cm sounds large for a "reliable" measurement.
- *Defensive phrasing:* the distance is consumed as one of three coarse zones (near ≤ 1.0 m,
  mid ≤ 2.5 m, deep), so a typical error of a few cm (MAE 9 cm) only changes the recommendation
  near a zone boundary, and the engine renormalises its weights when distance is unavailable.
  Report the outlier (+63.3 cm, a poor floor lock on a semi-reflective surface) openly. Call AR
  distance "accurate enough for zone assignment", not "accurate".

**(e) Engine correctness is on 10 representative spots, and the oracle shares two things with
the engine.** The 620/620 is 10 spots × 31 plants × 2 checks. The independent oracle re-derives
gate and band decisions from each plant's own thresholds, but it DOES reuse the calibration
transform and the single published 1.0 h "sun present" constant.
- *Defensive phrasing:* state both facts plainly (as §5.3 already plans). The shared pieces are a
  data transform and one cited constant, not the decision logic, so agreement is not circular.
  Call it "rule-application correctness (internal validity)", never "accuracy" or "validation".

**(f) The SPA sun-hours are geometric, not field-validated.** No measured sun-hour ground truth
exists. The solar position maths is unit-tested against ephemeris values, and the window-aperture
model is a trigonometric refinement. RQ2/RQ3 lean on sun as an input that MOVES the result — which
is true — but the chapter must not claim the sun-HOURS themselves are validated against reality.
- *Defensive phrasing:* "The direct-sun estimate is a geometric prediction (labelled POTENTIAL
  sun), verified for internal correctness against known solar positions, not against measured
  on-site sun duration." This matches the Chapter 3 framing and must stay consistent.

## 3. Consistency between the outputs and what Chapter 3 promised

- Chapter 3 promised a Bland-Altman method-agreement plot by name → delivered (Fig 5.2, and
  window sizes in the same family, Fig 5.3). Good.
- Chapter 3 framed engine correctness as a precondition gate before the RQ results → §5.3 keeps
  that order. Good.
- Chapter 3 committed to lux as the runtime unit and PPFD/DLI as framing only → nothing in the
  evaluation measures PPFD/DLI. Good — do not let any figure caption imply otherwise.
- One thing to watch: Chapter 3's calibration is validated for ~200–6000 lx (Samsung S21+). Figure
  5.1 deliberately shows points beyond 6000 lx (up to ~39000) because they anchor the line, with
  the extrapolation zone shaded. Keep the sentence "the shipped range guard returns raw values
  below 200 lx and the fit is validated to about 6000 lx" so the figure and the claim agree.
- Device scope: every instrument number is single-device (S21+ for lux, one phone for AR). Chapter
  3 already scopes this; Chapter 5 must repeat "on the test device" and defer multi-device work to
  Chapter 6, or an examiner will ask about generalisation.

## 4. Sill weakness, AR outlier, TC-37 — report together or separately?

Report each at the point it arises (sill in 5.2.4, AR outlier in 5.2.3, TC-37 in 5.6), THEN pull
them into one short honest paragraph in the 5.7 discussion titled around "the limits of the
measurement layer". Reasoning: each belongs to a different instrument, so burying all three in one
place would hide them from the section that reports that instrument; but collecting them once in the
discussion turns three separate admissions into a single credible "we know exactly where our
measurements are weak and why" statement. That framing is stronger than either extreme. All three
share one root theme — vertical, low-texture, or unusual surfaces defeat the phone (glass/sill for
AR, an unsupported GPU/driver stack for ARCore in TC-37) — which is a clean sentence to land.

Supporting robustness check (pre-empts an examiner): the within-band split barely moves with which
lux is binned — 58.6% on ground-truth meter lux, 60.0% on the calibrated phone lux the app actually
bins, 65.7% on raw phone lux. Report the conservative meter-based 59% and note it is not an artifact
of the lux source.

## 5. What the reference theses' evaluation chapters have that this one should acknowledge

- **A usability / questionnaire pillar.** Joshua's Chapter 5 has one; this project has none
  (supervisor-approved, theoretical). Already handled by substitution — but keep the single
  sentence in 5.1 and defer to Chapter 6, do not expand.
- **A comparison against the ACTUAL competing app.** The baseline here is a faithful re-implementation
  of the fixed-label rule, not Green Oasis / Photone run on the same spots. State this explicitly:
  "the baseline is a controlled re-implementation of the published fixed-label rule, which isolates
  the method difference; it is not the third-party app itself." An examiner from the reference-thesis
  tradition will look for this.
- **Reliability / repeatability.** Reference chapters sometimes report test-retest. The engine is
  deterministic (same input → same output, covered by the 118 automated tests), so a one-line
  statement to that effect closes the gap without new data.
- **Performance/latency.** The reference chapters occasionally include response time. Do NOT invent
  one — no measurement exists (brief rule). A single sentence that responsiveness was not
  instrumented and is left to future work is enough.

## 6. Would any figure mislead as specified, and better alternatives

- **Fig 5.1 (calibration):** a plain full-range linear scatter would visually crush the dense
  0–3000 lx cluster and make r=0.996 look like it rests on a few bright outliers. Fixed by adding
  the 0–3000 lx inset so the tight low-light cluster is visible AND the high-lux anchor points are
  still shown. This is the honest version — it neither hides the outliers nor lets them dominate.
- **Fig 5.3 (window sizes):** a single Bland-Altman would be dominated by one +257 cm sill outlier
  and squash width/height into an unreadable strip. Grouped MAE/MAPE bars carry the one required
  message (width reliable, sill not) far more clearly. Chosen deliberately; noted in the script.
- **Fig 5.4 (fall-off):** plotting all 70 sessions on a LOG y-axis is necessary (values span 4 to
  43000 lux); on a linear axis the low sessions would be invisible. The one risk is that a log axis
  makes the fall-off look gentler than it is, so the caption states the real magnitude (light drops
  to about a third from 50 to 150 cm) in words. The band lines are the true fixed-label boundaries.
- **Fig 5.2 (Bland-Altman):** standard and not misleading; the outlier is marked, not dropped.

## 7. Bottom line

The evidence is solid and the numbers are real. The three genuine soft spots — the constructed
Part 2 group inputs, the wide AR limits of agreement, and the un-validated (geometric-only) SPA
sun-hours — are all defensible IF the chapter states them in the honest terms above and does not
over-claim. The single functional-test failure (TC-37) and the sill error are assets, not
liabilities, as long as they are reported plainly and tied to Chapter 6. The biggest wording risk
is Group 3: do not claim a membership win where only a ranking win exists.
