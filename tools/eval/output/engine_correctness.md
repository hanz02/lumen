# Engine-vs-evidence correctness (rule-application verification)

For each spot below, the expected verdict (kept/eliminated) and the expected light band were re-derived **independently** from each plant's own published thresholds (`maintenance_lux_min`, the preferred range, `direct_sun_tolerance`) using the documented rule constants, then compared against what the **real engine** output end-to-end (calibration → gates → band). This verifies the engine correctly applies its evidence base; it is internal-validity verification, **not** an expert horticultural trial.

**Result:** 620 / 620 plant-spot decisions agreed (100.0%), across 10 spots × 31 plants (gate + band checks). Mismatches: 0.

## Per-spot agreement

| Spot | Description | Calibrated lux | # Recommended | # Eliminated |
|---|---|---:|---:|---:|
| S1 | very dim, no sun | 80 | 0 | 31 |
| S2 | dim, no sun | 577 | 7 | 24 |
| S3 | low-mid, no sun | 1793 | 25 | 6 |
| S4 | mid, no sun | 3451 | 30 | 1 |
| S5 | mid, 3 h sun | 3451 | 8 | 23 |
| S6 | bright, no sun | 6767 | 30 | 1 |
| S7 | bright, 4 h sun | 6767 | 8 | 23 |
| S8 | very bright, 5 h sun | 13399 | 8 | 23 |
| S9 | low, 2 h sun | 1793 | 6 | 25 |
| S10 | mid, sun present (no hours) | 2898 | 8 | 23 |

## Conclusion
The engine reproduced the evidence-derived verdict in **100%** of plant-spot decisions (every survival-floor and direct-sun gate, and every light-band classification). This demonstrates the recommendation pipeline faithfully and correctly implements the cited thresholds — there is no integration bug between the evidence base and the output.
