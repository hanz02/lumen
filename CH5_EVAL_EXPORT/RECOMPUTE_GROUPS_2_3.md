# RECOMPUTE — Table 5.6 Groups 2 and 3 on real field sessions

Read-only, no source edits. Raw jest output captured alongside this file
(`RECOMPUTE_raw_output.txt`). All six underlying observation rows (three per session) were
checked in the source workbook, not assumed.

## Task 1 — lux source, stated explicitly

**The engine is fed PHONE lux (raw sensor value) as `spot.lux`, and the engine calibrates it
internally. The fixed-label baseline bins on that same PHONE lux value, unconverted.** This is
the same pattern already used by Group 1 in the shipped test file: `SUN_PAIR` passes a single
raw `lux: 2000` both into `scoreLabelGuessed(s.lux, PLANTS)` and into `spot.lux`, and lets
`recommend()` calibrate internally. Using phone lux for both is also the realistic choice for
the comparison itself: a fixed-label competitor app has no calibration pipeline, so it would
read the same raw phone sensor value Lumen does, not a corrected one.

This is a **different** lux source from the primary 59 percent within-band figure in Section
5.5.1, which was computed on ground-truth METER lux, with calibrated-phone lux reported
separately as a 60 percent robustness check (see `SWEEP_FINDINGS.md` / `PART1_NUMERICAL_RESULTS.md`
1C). That is expected and not an inconsistency to fix: 5.5.1 is asking "how often does the real
world light change hide inside a band," which needs the true (meter) value, while Groups 1 to
3 are asking "what does each METHOD see and do with what it is given," which needs the value
each method actually receives, i.e. raw phone lux. The chapter should state this distinction if
it is not already clear, since both are legitimate but different questions.

## Task 2 to 3 — results table

| Group | Session | Distance | Phone lux | Band | Baseline count | Engine count |
|---|---|---|---:|---|---:|---:|
| 2, within band | S2, W001, 2026-04-16, partly cloudy | 50 cm | 2305 | low | 30 | 28 |
| 2, within band | S2, W001, 2026-04-16, partly cloudy | 100 cm | 1759.7 | low | 30 | 25 |
| 2, within band | S2, W001, 2026-04-16, partly cloudy | 150 cm | 1111 | low | 30 | 19 |
| 3, crossing band | S10, W004, 2026-04-19, overcast | 50 cm | 8962 | medium | 30 | 30 |
| 3, crossing band | S10, W004, 2026-04-19, overcast | 100 cm | 5653.8 | medium | 30 | 30 |
| 3, crossing band | S10, W004, 2026-04-19, overcast | 150 cm | 3213.4 | low | 30 | 30 |

Compared with the constructed numbers currently in the draft's Table 5.6 (Group 2: baseline
30/30/30, engine 30/30/19; Group 3: baseline 31/30/30, engine 30/30/30), the real Group 2
numbers are noticeably different at 50 cm and 100 cm (engine 28 and 25, not a flat 30), and the
real Group 3 numbers show the baseline staying at 30 throughout rather than dropping to 30 from
31. Report the real numbers, not the constructed ones, per the guardrail against forcing a match.

## Task 4 — set membership vs order-only, per session

**Group 2 (session 2, W001): the engine's recommended SET genuinely changes at every step, not
just the count.**
- 50 cm to 100 cm: six plants drop out of the recommended set (African Violet, African Violet
  Group, Devil's Ivy, Dracaena Fragrans, Purple Passion, Schefflera Arboricola do not survive
  the shift from 100 cm to 150 cm; see next line for the exact 100-to-150 comparison).
- 100 cm to 150 cm: `AFRICAN_VIOLET`, `AFRICAN_VIOLET_GROUP`, `DEVILS_IVY`,
  `DRACAENA_FRAGRANS`, `PURPLE_PASSION`, `SCHEFFLERA_ARBORICOLA` are recommended at 100 cm and
  eliminated by 150 cm.
- 50 cm to 100 cm: `DIEFFENBACHIA_GROUP`, `MONSTERA_GROUP`, `SWISS_CHEESE` are recommended at
  50 cm and eliminated by 100 cm.

So for real Group 2 the chapter can honestly claim a **membership change**, which is a stronger
and more direct RQ3 result than the constructed version (which only showed the count moving at
the last step, 30/30/19). The baseline, by contrast, is a flat 30 at every distance, confirmed
by set comparison as well as count (all three 30-plant lists are identical), which is the clean
"baseline structurally cannot see this" case the chapter wants for group 2.

**Group 3 (session 10, W004): both the baseline's and the engine's SETs are unchanged across all
three distances. Only the engine's scores and ranking move.** Set comparison, not just count,
confirms: the baseline's 30-plant list is identical at 50, 100, and 150 cm (verified: zero
plants differ between any pair of the three lists), and the engine's 30-plant list is also
identical at all three distances. What does change for the engine is each plant's score, for
example the top three plants score 92.5 at 50 cm and 100 cm and rise to 100 at 150 cm as the
light moves from the survival range into the preferred range, with a small reshuffle among
near-tied scores. So for real Group 3, the correct claim is a **score and ranking change only**,
never a membership change, for either method. This is an even cleaner version of the finding
already reported in `SWEEP_FINDINGS.md` Finding 2 on the constructed data, now confirmed on a
real session rather than a constructed one: the baseline does not react at all here (not even
once), and the engine's advantage is entirely in re-ranking, not in dropping or adding plants.

## Task 5 — session 10 boundary crossing, confirmed

Session 10's phone lux is 8962 / 5653.8 / 3213.4, which bins as medium / medium / low. It
crosses exactly **one** boundary, medium into low, between 100 cm and 150 cm. It never touches
the full band. **The chapter must not describe this real session as "full through medium to
low"** (that phrasing belonged to the old constructed 12040 lux value, which did start in the
full band). The correct real-session phrasing is "the light drops from the medium band into the
low band," a single crossing, not two.

## Task 6 — Group 1 unchanged, confirmed

Re-ran the untouched `ivdv_evaluation.test.ts` suite. Group 1 (`SUN_PAIR`, 2000 lux, 0 h vs 3 h
sun) is unmodified by this task and its result is unchanged: baseline 30 and 30 (identical
list), engine 28 and 8. Both relevant tests still pass (`Group 1 (same lux, different sun):
label identical, engine differs`, 9/9 tests passing overall). Group 1 already used the same raw
lux source now being applied to Groups 2 and 3, so there is nothing to reconcile there.

## Task 7 — downstream effects on 5.7, 5.8, and Figure 5.5

- **Figure 5.5** is built entirely from Group 1 (2000 lux, 28 vs 8), which is unaffected by this
  change. No update needed to that figure or its caption.
- **Section 5.7 (discussion)** restates the aggregate 59 percent within-band figure and the 41
  percent crossing figure, both computed independently in Section 5.5.1 from all 70 real
  sessions, not from Groups 2 or 3 specifically. Those aggregate numbers are unaffected. If 5.7
  contains any sentence that leans on the specific Group 2 or Group 3 counts (it currently does
  not, based on the extracted text), it would need updating to the real numbers above.
- **Section 5.8 (summary)** restates only the 59 percent figure, 620 correctness figure, and
  37/38 functional-testing figure, none of which come from Groups 2 or 3. No update needed.
- **Table 5.6 and its surrounding prose in 5.5.2 do need updating** to the real numbers in the
  Task 2/3 table above, and the prose should adopt the set-vs-order distinctions from Task 4 and
  the one-boundary correction from Task 5. This supersedes the illustrative-wording fix
  suggested earlier in `SWEEP_FINDINGS.md` Finding 2 and `DOUBTS_RESOLVED.md` Doubt 1, since
  switching to real sessions resolves the "is this a real session" problem at its root rather
  than by softening the wording around a constructed one.

## Guardrail checks

- Both sessions confirmed `direct_sun_present_now = no` at all three observation rows each
  (sheet rows 6 to 8 for session 2, rows 33 to 35 for session 10), verified directly from the
  `SPOT_OBSERVATIONS` sheet, not assumed. `directSunHours: 0, directSunPresent: false` is the
  honest input for both.
- No number was forced to match the old constructed figures. The real Group 2 counts (28, 25,
  19) and Group 3 counts (30, 30, 30 baseline; 30, 30, 30 engine) are reported exactly as
  computed, including where they differ substantially from what was in the draft before.
- Neither session broke the clean example it was chosen for. Session 2 still stays entirely
  within the low band (a valid within-band illustration) and session 10 still crosses exactly
  one boundary (a valid crossing illustration), so no next-closest session substitution is
  needed.
