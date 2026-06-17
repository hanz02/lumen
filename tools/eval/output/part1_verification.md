# Part 1 — Do the independent variables actually change the recommendation?

**Independent variables (IV):** measured spot lux, AR plant-to-window distance, SPA direct-sun exposure (duration + presence).  
**Dependent variable (DV):** the ranked list of recommended plants, each plant's 0–100 suitability score, and whether it is eliminated by a rule gate.

**Design:** lux is held constant at **3000 lx** (engine scores with the calibrated value 3451 lx — calibration is on for all cases, so it is not a confound). Only **distance** and **SPA sun** change between the three spots. The engine and dataset are the real ones shipped in the app (31 plants).

## Result summary

| Case | Spot (IVs, lux fixed) | # Recommended | # Eliminated | Top 3 (score) |
|---|---|---:|---:|---|
| A | near + strong sun (0.5 m, 5 h direct) | 8 | 23 | 1. Ficus (86.5)<br>2. Alii Fig (85.0)<br>3. Purple Passion (82.5) |
| B | deep + no sun (3.0 m, 0 h direct) | 30 | 1 | 1. Alii Fig (100.0)<br>2. ZZ Plant (100.0)<br>3. Boston Fern (94.0) |
| C | mid + moderate sun (1.5 m, 2 h direct) | 8 | 23 | 1. Purple Passion (100.0)<br>2. Dwarf Umbrella Tree / Hawaiian Schefflera (94.0)<br>3. Ficus (94.0) |

## How different are the outputs? (pairwise)

| Pair | Jaccard of recommended sets | Rank agreement on shared plants |
|---|---:|---:|
| A vs B | 0.27 | 0.89 |
| A vs C | 1.00 | 0.82 |
| B vs C | 0.27 | 0.86 |

## Per-criterion sub-scores for representative plants

Each surviving plant's score is a weighted blend (light 0.3, direct-sun 0.25, distance 0.25, confidence 0.2); unavailable factors are dropped and the rest renormalised. The distance and direct-sun sub-scores below change with the IVs — proof they feed the math, not just the explanation text.

**Snake Plant / Mother-in-Law's Tongue** (tolerance: some, confidence: medium)

| Case | Gate | Score | light | directSun | distance | confidence |
|---|---|---:|---:|---:|---:|---:|
| A | pass | 76.5 | 1.00 | 0.60 | 0.70 | 0.70 |
| B | pass | 86.5 | 1.00 | 1.00 | 0.70 | 0.70 |
| C | pass | 94.0 | 1.00 | 1.00 | 1.00 | 0.70 |

**ZZ Plant** (tolerance: none, confidence: high)

| Case | Gate | Score | light | directSun | distance | confidence |
|---|---|---:|---:|---:|---:|---:|
| A | ELIMINATED | 0.0 | 0.00 | — | — | — |
| B | pass | 100.0 | 1.00 | 1.00 | 1.00 | 1.00 |
| C | ELIMINATED | 0.0 | 0.00 | — | — | — |

**Swiss Cheese Plant / Monstera** (tolerance: some, confidence: low)

| Case | Gate | Score | light | directSun | distance | confidence |
|---|---|---:|---:|---:|---:|---:|
| A | pass | 66.7 | 0.84 | 0.60 | 0.70 | 0.45 |
| B | pass | 76.7 | 0.84 | 1.00 | 0.70 | 0.45 |
| C | pass | 84.2 | 0.84 | 1.00 | 1.00 | 0.45 |

**Alii Fig** (tolerance: tolerant, confidence: high)

| Case | Gate | Score | light | directSun | distance | confidence |
|---|---|---:|---:|---:|---:|---:|
| A | pass | 85.0 | 1.00 | 1.00 | 0.40 | 1.00 |
| B | pass | 100.0 | 1.00 | 1.00 | 1.00 | 1.00 |
| C | pass | 92.5 | 1.00 | 1.00 | 0.70 | 1.00 |

## Worked example of a gate flip (same lux, sun is the only change)

- **ZZ Plant**, spot A (sun present): _ELIMINATED_ — “This spot receives direct sun, which scorches ZZ Plant (no direct-sun tolerance).”
- **ZZ Plant**, spot B (no sun, same 3000 lx): _recommended_, score 100.0.

The only thing that changed was the SPA direct-sun input. This is the direct-sun gate (GATE 2) flipping a plant in and out of the list.

## Conclusion (Part 1)

Holding lux fixed at 3000 lx, changing distance and SPA sun changed the DV in every way that matters: the **set** of recommended plants (A=8, B=30, C=8), their **ranking/scores** (A vs C share the same survivors but rank them differently), and **gate outcomes** (the direct-sun gate adds/removes whole plants). The engine's output is therefore **not** a function of lux alone — distance and sun are load-bearing. Part 2 (the measured-vs-label comparison) is justified.
