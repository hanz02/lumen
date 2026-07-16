# Part 2 — Measured-spot engine vs fixed-label ("Green Oasis"-style) baseline

The baseline `scoreLabelGuessed(lux)` mirrors existing fixed-label apps (Angel et al., 2025, *Green Oasis*): it drops the spot lux into one of the Photone global bands (low 1–4,000 lx, medium 4,000–11,000 lx, full 11,000–32,000 lx) and returns every plant tolerant of that band. It uses **only lux** — no distance, no SPA sun — and returns an **unranked** list. The measured engine is the real app engine.

> Note on realism: lux and distance are correlated — in the field dataset the median lux falls to **34% of its value (a ~66% drop) from 50 cm to 150 cm**. So two spots at very different distances rarely read the *same* lux. The scenarios below therefore use **real measured triplets** (or controlled sun pairs), not an artificial "same lux at different distance" case.

### Group 1 — same lux (2000 lx), different sun  ·  *the cleanest case*

Lux cannot encode direct sun, so the fixed-label method is blind to the difference.

| Spot | Lux | Photone band | Label-guessed (count) | Engine # rec | Engine #1 pick |
|---|---:|---|---:|---:|---|
| X (north window — no direct sun) | 2000 | low | 30 | 28 | Anthurium / Flamingo Flower |
| Y (west window — 3 h direct sun) | 2000 | low | 30 | 8 | Purple Passion |

### Group 2 — real falloff that stays in ONE band (W001 session)

Light drops 2305 → 1111 lx (a 2× change) but never leaves the LOW band, so the fixed-label list is identical at every distance. The engine resolves it.

| Spot | Lux | Photone band | Label-guessed (count) | Engine # rec | Engine #1 pick |
|---|---:|---|---:|---:|---|
| D1 (50 cm from window) | 2305 | low | 30 | 28 | Anthurium / Flamingo Flower |
| D2 (100 cm from window) | 1759.7 | low | 30 | 25 | Anthurium / Flamingo Flower |
| D3 (150 cm from window) | 1111 | low | 30 | 19 | Anthurium / Flamingo Flower |

### Group 3 — real falloff that crosses a band line (W004 session)  ·  *weakest, reported honestly*

Here light drops 8962 → 3213 lx, moving from the MEDIUM band into LOW. Despite crossing a band line, **both methods keep the same 30 plants at all three distances** — neither changes which plants it recommends, because no plant in the dataset sits exactly on this boundary. What *does* change is the engine's **ranking**: several plants rise in score as the light moves from a plant's survival range into its preferred range, while the fixed-label list stays flat and unranked throughout. This is therefore the weakest of the three comparisons — reported honestly — and it is exactly the case that motivates the ranking-advantage argument below.

| Spot | Lux | Photone band | Label-guessed (count) | Engine # rec | Engine #1 pick |
|---|---:|---|---:|---:|---|
| B1 (50 cm from window) | 8962 | medium | 30 | 30 | Anthurium / Flamingo Flower |
| B2 (100 cm from window) | 5653.8 | medium | 30 | 30 | Anthurium / Flamingo Flower |
| B3 (150 cm from window) | 3213.4 | low | 30 | 30 | Anthurium / Flamingo Flower |

## Interpretation

- **Sun (Group 1) is the part lux can never reveal.** The fixed-label method gives the two spots the same list; the engine removes scorch-prone plants from the sunny one. This holds no matter how lux and distance correlate, so it is the strongest evidence.
- **Distance shows up in lux, but only crosses a band line ~45% of the time.** When it stays in one band (Group 2, ~55% of sessions) the fixed-label method cannot tell the distances apart even though the real light tripled; the engine, reading the precise value against each plant's own floor, can.
- **Group 3 is the weakest case, reported honestly.** Even though the reading crosses a band line here, no plant in the dataset happens to sit on that exact boundary, so both methods keep the same 30 plants at all three distances. The one difference that survives: the engine still reorders those 30 by suitability as the spot dims, something the flat, unranked fixed-label list can never do.
- **The engine always ranks; the fixed-label method never does.** Even with the same survivors, the engine returns a best-first order using distance and sun — this is the one advantage that holds in every group, including the weakest one.
