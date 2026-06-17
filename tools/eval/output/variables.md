# Variables for the recommendation evaluation (IV / DV)

These definitions are taken from how `src/engine` actually consumes each input, so the methodology chapter matches the implementation. They are grouped by *where* each variable enters the computation, which is important for honesty: window aspect and window geometry are **upstream** variables — they do not enter the engine score directly, they shape the SPA direct-sun estimate, which then enters the engine.

## Independent variables (manipulated / measured at the spot)

| # | Variable | Operational form | How it is captured | Where it enters the engine |
|---|---|---|---|---|
| IV1 | Spot illuminance (lux) | Continuous lux; engine scores with the calibrated value (meter = 1.1054×phone + 134.4) | Phone TYPE_LIGHT sensor, 10 s plateau-median capture | GATE 1 survival floor **and** the light-fit sub-score |
| IV2 | Plant-to-window distance (m) | Continuous metres → near ≤1.0 / mid ≤2.5 / deep zone | AR (ARCore) plant-to-window measurement | Distance sub-score (zone × plant light-class matrix) |
| IV3 | Direct-sun exposure | Duration (h/day) + present flag (≥1 h = present) | SPA aperture model output (`estimateDirectSunThroughAperture`) | GATE 2 direct-sun gate **and** the direct-sun sub-score |
| IV4 (upstream) | Window aspect (N/E/S/W) | Categorical facing | Compass + GPS declination | Feeds the SPA estimate (→ IV3); in the engine itself it is explanation-only, never a gate or score term |
| IV5 (upstream) | Window geometry (width, sill, head height) | Continuous metres | AR (prototype / approximate) | Feeds the SPA aperture model (→ IV3); not a direct engine term |

## Dependent variables (the recommendation output)

| # | Variable | Operational form |
|---|---|---|
| DV1 | Recommended set | Which plants survive the gates (set membership) |
| DV2 | Ranking | Order of survivors by suitability score |
| DV3 | Suitability score | 0–100 weighted blend (light/sun/distance/confidence) per plant |
| DV4 | Gate outcome | Eliminated or not, plus the human-readable reason |
| DV5 | Recommendation confidence | high/medium/low/provisional, or "reduced" when optional inputs are missing |

## Controlled (held constant across the evaluation)

- Plant dataset: the bundled 31-plant evidence base (same SQLite as the app).
- Scoring weights: light 0.3, direct-sun 0.25, distance 0.25, confidence 0.2.
- Lux calibration: on for every run.

## Note on the fixed-label baseline (Part 2)
The comparison baseline `scoreLabelGuessed` deliberately uses **only IV1 (lux)**, binned into the Photone global bands. Holding the plant dataset constant, the contrast between it and the full engine isolates the added value of IV2 (distance) and IV3 (sun) — which is the reframed Objective (ii).
