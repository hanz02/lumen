# FULL SWEEP — overclaiming / underclaiming check on the Chapter 5 draft

Every factual and numeric sentence in `SWE2302061_Chapter5_FULL_DRAFT.docx` was checked
against its source file or by re-running the engine. This goes beyond the five doubts already
resolved in `DOUBTS_RESOLVED.md` (Group 2/3 session-naming, Snake Plant score, dataset
identity, filename, prose scan). Two new, real findings surfaced. Everything else checked out.

---

## NEW FINDING 1 (moderate) — "38.36 percent" is misattributed to the below-200-lux zone

**§5.2.2, current text:** *"Below 200 lux the percentage gap rises sharply, to 38.36 percent
when all readings are included, because at such low light a gap of only a few lux is a large
fraction of the reading."*

This reads as if 38.36% is the error rate specifically **for** readings below 200 lux. It is
not. Source, `calibration_crossval.csv`:
```
HELD-OUT (phone>=200 lx),,183,,,267.5,383.1,15.07
HELD-OUT (all rows),,210,,,245.5,368.3,38.36
```
38.36% is the cross-validated MAPE across **all 210** held-out rows (the 183 rows at or above
200 lx plus the 27 rows below it), not the MAPE of the 27 sub-200 rows alone. It is a blended
average, pulled up from 15.07% by the minority of low readings.

I computed the true below-200-only error directly from the 27 rows (`calibration_pairs_210.csv`,
using the shipped fit, since no properly cross-validated below-200-only figure exists in any
shipped analysis file):
```
n below 200 lx: 27       MAPE (shipped fit): 294.6%
n at/above 200 lx: 183   MAPE (shipped fit): 14.0%
```
The true below-200 error is roughly eight times worse than 38.36%, not the same order of
magnitude. **The chapter currently understates, not overstates, how bad the calibration is
below 200 lux** — which actually weakens its own justification for the raw-value guard by
citing a gentler number than reality.

I cannot hand you a clean replacement number, because the shipped cross-validation pipeline
never isolates a below-200-only fold (only "≥200 lx" and "all rows" are reported), and my
294.6% figure uses the shipped fit rather than a proper held-out refit, so it should not be
inserted into the thesis as a rigorous statistic. The defensible fix is to correct what the
sentence claims about the 38.36% figure, not to invent a new one:

> Replace: *"Below 200 lux the percentage gap rises sharply, to 38.36 percent when all readings
> are included, because at such low light a gap of only a few lux is a large fraction of the
> reading."*
> With: *"The 183 held out readings at or above 200 lux gave an average percentage gap of
> 15.07 percent. When the 27 held out readings below 200 lux are added back in, the average
> percentage gap across all 210 rises to 38.36 percent, because at such low light a gap of only
> a few lux is a large fraction of the reading. This is why the app does not apply the
> conversion below 200 lux and returns the raw value instead."*

This keeps every number that is actually in the source file, removes the false implication
that 38.36% characterises the sub-200 lx zone on its own, and if anything makes the raw-value
guard's justification stronger rather than weaker, since the reader now understands 38.36% is
already a diluted, not a worst-case, figure.

---

## NEW FINDING 2 (moderate) — Group 3's "reacts... moving with the bucket" overstates a single step, and the engine side is flatter than implied

**§5.5.2, current text:** *"In group three, a fall off that crosses buckets, from 12040 down to
3410 lux, the baseline does react, its counts moving with the bucket, and this is credited
honestly. The engine's advantage in group three is that it still ranks the survivors."*

I ran both the baseline and the real engine on the three Group 3 points directly (12040, 5192,
3410 lx, the values already in Table 5.6). Two things the current wording does not reflect:

**The baseline reacts once, not continuously.** The three points cross two band boundaries
(full→medium at B1→B2, medium→low at B2→B3). The baseline count is 31, 30, 30. Checking the
actual plant IDs, not just the counts: B1→B2 is a genuine membership change (one plant drops
out). **B2→B3 is a byte-for-byte identical 30-plant set**, despite the band label changing from
medium to low. So "its counts moving with the bucket" is true for one of the two crossings and
false for the other. The phrase implies steady tracking across all three points, which the data
does not support.

**The engine's set is also completely flat across all three points**, which the current
paragraph does not mention. I checked plant-ID membership, not just the count: the engine's
30-plant recommended set is identical at B1, B2, and B3 (same 30 plant IDs throughout). What
does change is each plant's score, for example one plant's score rises from 92.5 to 100 as the
light moves from the survival band into the preferred band, and the top-3 order reshuffles
slightly among near-tied scores (Arrowhead Vine drops out of the top three between B1 and B2,
Purple Passion enters). So "the engine's advantage in group three is that it still ranks the
survivors" is technically true, but Group 3 is a weaker, same-membership, modest-rescoring
example, not a case where the engine differentiates spots the baseline cannot. That distinction
belongs to Groups 1 and 2, not Group 3.

Recommended replacement:

> Replace: *"In group three, a fall off that crosses buckets, from 12040 down to 3410 lux, the
> baseline does react, its counts moving with the bucket, and this is credited honestly. The
> engine's advantage in group three is that it still ranks the survivors."*
> With: *"In group three, a representative fall off that crosses buckets, with light levels
> chosen in the range seen in the field sessions, dropping from 12040 to 3410 lux, the baseline
> does react once, losing one plant as the light crosses from the full band into the medium
> band, and this is credited honestly. Crossing the second boundary, from medium into low, does
> not change the baseline's list further. The engine's own set of thirty plants is unchanged
> across all three points as well, but the scores within it shift as the light moves from the
> survival range toward the preferred range for several plants, which changes their order
> among near equal scores. Group three is therefore the weakest of the three comparisons, and
> the strongest evidence for a difference in method remains group one, the same light with
> different sun."*

This is the honest version, and it is consistent with your own REMARKS.md §7, which already
flags "the biggest wording risk is Group 3" and warns not to claim a membership win there. The
existing draft avoids claiming a membership win for the ENGINE, correctly, but it still implies
one for the BASELINE ("moving with the bucket") that the data does not fully support either.

---

## Everything else checked and CONFIRMED, no issues found

- **Table 5.1** (§5.2.1), all eleven rows: n, mean gap in lux, mean gap in percent, and
  correlation r were checked cell by cell against `agreement_summary.csv`. Every value matches
  to the rounding shown. This table had not been independently re-verified before this sweep
  (it was carried over from earlier drafting) and it is now confirmed in full.
- **§5.2.2 fold table**, all five folds plus the two held-out summary rows: matches
  `calibration_crossval.csv` exactly (aside from Finding 1's wording issue).
- **"15 lux into a misleading 151 lux"** (§5.2.2): confirmed as a real, documented field
  artefact, not an invented illustration. `CLAUDE.md` line 106 to 107 states verbatim
  "prevents the 15 lx to 151 lx artefact seen in the field", and the arithmetic checks out
  (1.1054 x 15 + 134.4 = 150.98, rounds to 151).
- **§5.2.3 AR distance and §5.2.4 window size** numbers: already independently re-derived in
  the original evaluation pass and unchanged.
- **§5.3 engine correctness** (620/620, ten spots): unchanged and confirmed against
  `engine_correctness.test.ts` output.
- **§5.4 input sensitivity** (8/30/8, Snake Plant 76.5 to 94.0): confirmed by direct engine
  run in Doubt 2. The "window facing is the only optional step" claim matches `CLAUDE.md`
  section 10 verbatim ("Facing is the only optional step").
- **§5.5.1 within-band split** (41/70, 59%, and the 60% calibrated-phone sensitivity check):
  confirmed by direct recomputation from `distance_falloff.csv`.
- **§5.5.2 Group 1** (30/30 baseline, 28/8 engine) and **Group 2** (30/30/30 baseline,
  30/30/19 engine): counts confirmed as genuine engine and baseline outputs (the input-triplet
  wording issue is Doubt 1, already resolved separately and not repeated here).
- **§5.6 functional testing table**: every module-area count (4, 5, 7, 6, 4, 6, 2, 3, 1,
  summing to 38) was cross-checked against the raw 38-row test log dump and matches exactly,
  including the 4-1 pass-fail split for augmented reality distance.
- **§5.6 "118 tests across 11 files"**: matches the `npm test` output exactly.
- **§5.2.1 "three distances of 50, 100 and 150 cm"**: confirmed that all 210 rows in the source
  workbook carry an explicit distance value in the sheet (not inferred from row position), so
  this is a fully data-backed claim, not an assumption.
- **§5.7 and §5.8**: every number restated in the discussion and summary (0.996 correlation,
  15 percent held-out gap, 9 cm AR gap, 59 percent, 41 percent, 620, 37/38, 118) matches a value
  already confirmed elsewhere in the chapter. No new claim is introduced in these two sections.

---

## Outstanding, still unfixed (carried over from the previous pass, restated for completeness)

- **Doubt 1**: §5.5.2 currently attributes the Group 2 and Group 3 triplets to "a real fall
  off" without qualification, and the underlying test file's own comments name specific
  sessions (W001, W004) that do not match the triplets used. The Finding 2 replacement text
  above already folds in the "representative... chosen in the range seen in the field
  sessions" phrasing from Doubt 1, so fixing Group 3 per Finding 2 also fixes Doubt 1 for
  that group. Group 2's sentence still needs the same treatment (see `DOUBTS_RESOLVED.md`
  Doubt 1, Task 3, for the exact Group 2 wording).
- **Doubt 4**: Table 5.7's caption (line 601 of the extracted text) still reads
  `Functional_Test_Case_Log_v2.xlsx` and needs the real filename,
  `Functional_Test_Case_Log_v2 (version 1).xlsx`.

## Net assessment

No fabricated numbers, no reversed directions, no invented sessions. The two new findings are
both cases of a real, correctly-sourced number being used in a sentence that claims slightly
more precision or continuity than the underlying data supports, one in the calibration
section (understates the below-200 lx problem) and one in the RQ3 comparison (overstates how
continuously the baseline, and to a lesser extent the framing around the engine, reacts in
Group 3). Neither number is wrong; both sentences need narrower wording. Everything else in
the chapter, including all of Table 5.1 which had not been independently checked before this
sweep, is confirmed accurate.
