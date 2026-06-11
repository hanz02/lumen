# CLAUDE.md — Project Context (Indoor Plant Recommendation App)

> Drop this file in the **root of the project folder**. Claude Code auto-loads it
> at the start of every session. Treat it as **design intent + working agreements**.
> For current code internals, read the actual project files — this file says
> what the system is _supposed_ to be, not what any single file currently contains.

Do not make any changes until you have 95% confidence in what you need to build. Ask me follow up questions until you reach that confidence. Keep the MD files line within 200 lines.

---

## 1. What this project is

A **mobile app (React Native front-end + native Android Kotlin / ARCore modules)** that
recommends indoor plants for a **specific placement spot in a room**, not for a whole room.

**The gap it fills (the thesis novelty):** existing recommenders (Green Oasis, Doshi's PRES,
Jaishree's hybrid, Das's cosine-similarity system) decide using _static light labels_
("low / medium / bright") or regional weather. This app instead **measures the actual light
at the chosen spot** and matches it against **evidence-based, plant-specific light thresholds**.

This is a Final Year Project. It must stay defensible academically, so **do not over-claim
capability** (see §6 guardrails).

---

## 2. Locked design decisions (the "contract" — do not silently change these)

1. **Lux is the runtime measurement unit.** Practical and phone-readable. PPFD / PAR / DLI
   are used only as _scientific framing_ in the thesis — **the app does NOT measure PPFD/DLI.**
2. **SPA (Solar Position Algorithm) is a sunlight _interpretation_ module**, not a lux predictor.
   It answers "could direct sun reach this window, and when?" Actual suitability still comes
   from measured lux.
3. **AR is deliberately limited.** Plant-to-window **distance is the reliable AR output**.
   Window **width/height are prototype-only** inputs, treated cautiously and validated against
   a tape measure. AR is a _spatial measurement aid_, NOT decorative plant visualization.
4. **Recommendation engine = explainable rule-based filtering + weighted scoring.**
   - Rule _gates_ eliminate clearly unsuitable plants (hard fails).
   - Weighted _scoring_ ranks the survivors (light fit, direct-sun risk, distance fit,
     evidence confidence).
   - Every recommendation must come with a **plain-language explanation** ("why this plant").
   - No trained ML model — dataset is small and explanations matter.
5. **Two threshold levels per plant:** _maintenance light_ (stays alive / acceptable indoors)
   vs _preferred light_ (good growth + ornamental quality). The engine distinguishes them.
6. **Evidence has a confidence value.** Species/cultivar-specific evidence > genus/group proxy.
   Lower-confidence evidence should lower the score / be flagged, not treated as fact.

---

## 3. Tech stack & key files

- **Front-end:** React Native — `App.tsx`
- **Native bridge:** `ARModule.kt`, `ARPackage.kt`, `MainApplication.kt`
- **AR core:** `ARMeasurementActivity.kt` (the large one, ~1,100+ lines), `activity_ar.xml`
- **Config:** `AndroidManifest.xml`, `build.gradle` (project-level and app-level)
- **AR engine:** ARCore (plane detection, raycast/hit-test, anchors)
- **Data (lives in Excel, exported for the app):** `PLANT_MASTER`, `RAW_EVIDENCES`, `LOOKUPS`,
  `SPOT_INPUT / SPOT_OBSERVATIONS` → derived per-plant maintenance/preferred lux ranges +
  confidence, exported to JSON or SQLite for runtime.
- **Validation reference instrument:** UT383 lux meter (for phone-lux comparison).

---

## 4. AR module — focused context (current work area)

**Purpose:** capture the _spatial context_ of a plant spot relative to the window, primarily
**plant-to-window distance**, optionally window size.

**Design decisions already made for AR (keep consistent):**

- Plane visuals are **hidden** in the final UX (no debug grid shown to the user).
- **Pokémon-GO-style plant placement** — user taps to drop a plant marker on a detected surface.
- **Window marker** uses a disc/anchor on the window plane.
- **Line measurement** between two points (e.g. plant point → window) gives the distance.
- **Upright plant fix** — placed models must stay upright, not tilt with the surface normal.
- **Hit quality** matters — prefer high-confidence hits; warn/reject low-quality hits.
- **React Native return values** — AR results are bridged back to JS via `ARModule.kt`;
  make sure measured values (distance, and window dims if used) return cleanly to `App.tsx`.

**What AR must output to the rest of the system:**

- `plantToWindowDistance` (metres) → feeds the recommendation score as a **near / mid / deep**
  zone (distance from window changes plant-light availability — this is justified in Ch 2.5).
- `windowWidth`, `windowHeight` (metres) → **optional / prototype**, flagged as approximate.

**AR cautions (these are load-bearing for the thesis — do not paper over them):**

- White walls, plain window frames, and reflective glass give ARCore **few feature points** →
  vertical-surface (window) measurement is the least reliable part. Keep it honest in the UI.
- Low lighting reduces tracking quality.
- AR placement error can range from a few cm to metres depending on conditions.
- **Therefore AR output is an estimate** and is **validated against tape measurement** for the
  evaluation chapter. Build in a way that makes capturing AR-vs-tape pairs easy.

---

## 5. Current status (as of this handoff)

- **Working:** AR distance / window measurement module.
- **NOT built yet:** recommendation engine, phone light (lux) sensor, SPA integration,
  data export pipeline (Excel → app).
- **Thesis:** Chapter 2 (Literature Review) done. Chapters 1, 3, 4, 5 outstanding.
- **Timeline:** ~1–2 months to deadline. Prioritize the end-to-end path over polish.

**Recommended build order for the wider project** (AR is step where it slots in):

1. Data → thresholds pipeline (Excel → JSON/SQLite).
2. Recommendation engine (pure logic, unit-tested — this is the contribution).
3. Phone lux sensor (`TYPE_LIGHT`) + repeated readings.
4. **Thin end-to-end slice:** AR distance + lux + engine → ranked list w/ explanation in UI.
5. SPA API (direct-sun-risk input + "when sun hits this window" explanation).
6. Evaluation logging captured continuously (AR-vs-tape, phone-vs-UT383, rec-vs-ground-truth).

---

## 6. Working agreements / guardrails for Claude Code

- **Read the actual project files before editing** — this doc is intent, not current code state.
- **Do not over-claim AR accuracy.** Distance = reliable output; window size = prototype/approximate.
  Keep UI wording and any logs honest about this.
- **Keep the engine explainable.** Every recommendation needs a traceable "why."
- **Don't introduce a trained ML model** for the recommender — keep it rule-based + weighted.
- **Lux is runtime; PPFD/DLI are not measured** — don't add fake PPFD "measurement."
- **Make evaluation data easy to capture** (export AR distance, window dims, lux readings,
  timestamps) — Chapter 4 depends on it.
- Methodology decisions made in code should **stay consistent with thesis Chapter 3**, since
  Chapter 3 documents exactly this design.
