# DOUBTS RESOLVED — verification pass on the Chapter 5 draft

Re-investigated against the actual test code, the actual field workbook, and the shipped
docx. No prior claim was trusted without re-running it.

---

## DOUBT 1 (CRITICAL) — CORRECTED, and worse than REMARKS.md said

**The triplets are constructed, and they do not even match the sessions the test file's own
comments name.** This is a more serious finding than REMARKS.md flagged: REMARKS.md said
"illustrative, not literal rows" — true — but the code comments in `ivdv_evaluation.test.ts`
go further and claim these ARE specific real sessions ("Field session W001", "Field session
W004"), and that claim does not hold up.

**Group 2 (D1/D2/D3), `ivdv_evaluation.test.ts` lines 307-314:**
```ts
// --- Group 2: REAL light falloff that stays INSIDE one band ------------------
// Field session W001 (2026-04-16), diffuse daylight, no direct sun. Light drops
// 2800 -> 1328 lx across 50/100/150 cm but never leaves the Photone LOW band.
const FALLOFF_WITHIN_BAND: EvalSpot[] = [
  { id: 'D1', lux: 2800, note: '50 cm from window', spot: { lux: 2800, distanceToWindowM: 0.5, directSunPresent: false, directSunHours: 0 } },
  { id: 'D2', lux: 2443, note: '100 cm from window', spot: { lux: 2443, distanceToWindowM: 1.0, directSunPresent: false, directSunHours: 0 } },
  { id: 'D3', lux: 1328, note: '150 cm from window', spot: { lux: 1328, distanceToWindowM: 1.5, directSunPresent: false, directSunHours: 0 } },
];
```
The named session, W001 dated 2026-04-16, is real (`distance_falloff.csv` row: session 2,
window W001, date 2026-04-16, sky partly_cloudy). Its actual values are:
- meter (ground truth): 3056.3 / 2404.3 / 1423.3 lux
- phone (raw): 2305 / 1759.7 / 1111 lux

Neither matches the test's 2800 / 2443 / 1328 lx. The 100 cm and 150 cm figures are close to
the session's METER values (within about 2 to 7 percent), but the 50 cm figure is off by
8.4 percent, and none of the three match the session's PHONE values at all, which is what a
"lux" SpotInput is meant to represent (the app measures phone lux, then calibrates it
internally). So the test's inline comment overclaims. The numbers are a constructed
illustration loosely inspired by session 2, not that session's data.

**Group 3 (B1/B2/B3), lines 316-324:**
```ts
// --- Group 3: REAL light falloff that CROSSES band lines ---------------------
// Field session W004, diffuse daylight. Light drops 12040 -> 3410 lx and crosses
// FULL -> MEDIUM -> LOW, so here the fixed-label method DOES change its answer.
```
All eleven real W004 sessions in `distance_falloff.csv` were checked. None is close to
12040 / 5192 / 3410. The nearest by shape is session 10 (overcast): meter 10220.4 / 6293.6 /
3772.4, still 15 to 20 percent off at every distance, and several other W004 sessions (6, 22,
32) are far brighter. So "Field session W004" is also not a literal row. It is a constructed
triplet in the same numeric neighbourhood as the W004 sessions, not one of them.

**Task 2 — are the engine counts nonetheless real:** Yes, unconditionally. `rowFor()` calls
`recommend(PLANTS, s.spot)` directly on these `SpotInput` objects using the real, unmodified
production engine and the real 31-plant dataset. The engine has no way to know whether its
input was typed in or copied from a workbook. So 30/30/19 and 31/30/30 vs 30/30/30 are genuine
engine outputs of genuine engine code, only the choice of what lux/distance to feed it is
constructed.

**Task 3 — wording.** Your proposed phrasing is accurate and should be tightened further,
because "drawn from the field data" still risks implying a closer link than exists. Recommended
replacement for the current §5.5.2 sentences:

> Replace: *"a real fall off that stays inside one bucket, the light drops from 2800 to 1328
> lux across the three distances yet never leaves the low bucket"*
> With: *"a representative fall off that stays inside one bucket, with light levels chosen in
> the range seen in the field sessions, dropping from 2800 to 1328 lux across the three
> distances and never leaving the low bucket"*

> Replace: *"a fall off that crosses buckets, from 12040 down to 3410 lux"*
> With: *"a representative fall off that crosses buckets, with light levels chosen in the range
> seen in the field sessions, dropping from 12040 to 3410 lux and crossing from full through
> medium to low"*

Also add one sentence directly after Table 5.6, before "Even when the two methods...":

> *"The three group inputs are representative spots constructed to sit within or across a
> band, at magnitudes consistent with the real fall off data, and both methods are run on
> them using the real engine and the real baseline rule. The 59 percent figure in Section
> 5.5.1 is the one number in this comparison computed directly from all seventy real
> sessions, and it remains the evidence for how often this situation arises in practice."*

Do NOT name W001 or W004 in the running prose, since neither triplet is that session's data.
If you want a real-session citation, Doubt 1 Task 4 below gives the closest honest option.

**Task 4 — closest real sessions, if you want to cite one directly instead:**
- Within-band: session 2 (W001, 2026-04-16, partly cloudy). Real meter values 3056.3 / 2404.3
  / 1423.3 lux, all inside the low band (under 4000). This is close in spirit to Group 2 and
  is a real, nameable session if you prefer a genuine citation over a constructed one.
- Crossing-band: session 10 (W004, 2026-04-19, overcast). Real meter values 10220.4 / 6293.6 /
  3772.4 lux, crossing full to medium to low, same as the constructed Group 3 pattern. This is
  the closest real substitute.
Neither is an exact match to the numbers already in the chapter, so switching to them means
changing the numbers in Table 5.6's row labels too (the baseline/engine counts would need to be
recomputed on the session's real lux values, not assumed to carry over).

---

## DOUBT 2 — CONFIRMED, with the raw output

Ran the real engine directly (`recommend(PLANTS, spot)`) for the Snake Plant at spots A and C
and printed the full `Recommendation` object.

**Spot A** (near, 0.5 m, south facing, 5 h sun, lux 3451 calibrated):
```
score: 76.5
factors: light 1.00, directSun 0.60, distance 0.70, confidence 0.70
```
**Spot C** (mid, 1.5 m, east facing, 2 h sun, lux 3451 calibrated):
```
score: 94
factors: light 1.00, directSun 1.00, distance 1.00, confidence 0.70
```

- **76.5 and 94.0 are exact.** CONFIRMED, not an approximation.
- **Direction confirmed.** A (76.5) < C (94.0), a rise, matching the draft's claim.
- **Cause confirmed as stated.** Both the distance factor (0.70 to 1.00) and the direct sun
  factor (0.60 to 1.00) improve from A to C, while light (1.00) and confidence (0.70) are
  unchanged. So the rise is caused jointly by distance and sun, exactly as the draft says.

No change needed to this sentence in the chapter.

---

## DOUBT 3 — CONFIRMED, one dataset described twice

Both the 210 calibration pairs and the 70 fall off sessions come from the same sheet,
`SPOT_OBSERVATIONS` in `SPOT_INPUT_master_template.xlsx`, and are in fact the same 210 rows,
reshaped two different ways by two different scripts reading that one sheet.

Evidence, `tools/analyze_spot_observations.py` lines 225 to 245: `distance_falloff.csv` is
built from the exact same in-memory `rows` list used for the 210-pair calibration fit
(`for i in range(0, len(rows) - 2, 3): a, b, c = rows[i], rows[i+1], rows[i+2]`), grouping the
210 individual paired readings into consecutive triplets of three. `210 // 3 = 70` exactly,
which is why there are 70 fall-off sessions.

Independently confirmed by re-reading the source workbook: `SPOT_OBSERVATIONS` has 224
non-blank observation rows, of which exactly 210 have both a phone reading and a meter
reading present (the other 14 are incomplete stub rows the script already skips). No session
has fewer or more than 3 usable distances. `210 = 70 x 3` with no remainder and no dropped
sessions.

**Task 2 wording.** Yes, the chapter can safely say so. Suggested one sentence, usable in
either §5.2.1 or §5.5.1 with a forward or back reference:

> *"These are the same 210 paired readings described in Section 5.2.1, in this case grouped
> into seventy sessions of three distances each rather than treated as 210 independent
> pairs."*

No correction needed to the existing separate descriptions, since both are individually
accurate. Adding the cross reference sentence above removes any appearance that they are two
different collections.

---

## DOUBT 4 (SMALL) — CONFIRMED

Exact real filename, verified again directly from the folder listing: **`Functional_Test_Case_Log_v2 (version 1).xlsx`** (a space before the opening parenthesis, not an underscore). The chapter's Table 5.7 caption should cite this exact string.

---

## DOUBT 5 (SMALL) — CONFIRMED, re-run independently

Re-scanned `SWE2302061_Chapter5_FULL_DRAFT.docx` body text directly from the shipped XML
(not reusing the earlier build-time check). Every paragraph was tested for em dash, en dash,
and semicolon anywhere, and for colon outside of `Table 5.x:` / `Figure 5.x:` caption lines.

```
em-dash count: 0
en-dash count: 0
semicolon count: 0
colon-in-prose count: 0
TOTAL: 0
```

Zero violations, confirmed.

---

## Net effect on the draft

Only Doubt 1 requires a prose correction, and it is more serious than originally flagged. Do
not use "Field session W001" or "Field session W004" language even indirectly, since neither
triplet matches its named session. Use the "representative spots... at magnitudes consistent
with the field data" phrasing above, or switch to the real sessions 2 (W001) and 10 (W004)
identified in Task 4 and recompute the table row for that choice. Doubts 2, 3, 4, and 5 need
no changes to the numbers already in the chapter; Doubt 3 only benefits from one added
cross-reference sentence for clarity.
