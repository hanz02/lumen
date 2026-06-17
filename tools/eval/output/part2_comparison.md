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

Light drops 2800 → 1328 lx (a 3× change) but never leaves the LOW band, so the fixed-label list is identical at every distance. The engine resolves it.

| Spot | Lux | Photone band | Label-guessed (count) | Engine # rec | Engine #1 pick |
|---|---:|---|---:|---:|---|
| D1 (50 cm from window) | 2800 | low | 30 | 30 | Anthurium / Flamingo Flower |
| D2 (100 cm from window) | 2443 | low | 30 | 30 | Anthurium / Flamingo Flower |
| D3 (150 cm from window) | 1328 | low | 30 | 19 | Anthurium / Flamingo Flower |

### Group 3 — real falloff that CROSSES bands (W004 session)  ·  *honest case*

Here light drops 12040 → 3410 lx and crosses FULL → MEDIUM → LOW, so the fixed-label method **does** change its answer. About 45% of field sessions look like this; the other 55% look like Group 2 (the change hides inside one band).

| Spot | Lux | Photone band | Label-guessed (count) | Engine # rec | Engine #1 pick |
|---|---:|---|---:|---:|---|
| B1 (50 cm from window) | 12040 | full | 31 | 30 | Anthurium / Flamingo Flower |
| B2 (100 cm from window) | 5192 | medium | 30 | 30 | Anthurium / Flamingo Flower |
| B3 (150 cm from window) | 3410 | low | 30 | 30 | Anthurium / Flamingo Flower |

## Interpretation

- **Sun (Group 1) is the part lux can never reveal.** The fixed-label method gives the two spots the same list; the engine removes scorch-prone plants from the sunny one. This holds no matter how lux and distance correlate, so it is the strongest evidence.
- **Distance shows up in lux, but only crosses a band line ~45% of the time.** When it stays in one band (Group 2, ~55% of sessions) the fixed-label method cannot tell the distances apart even though the real light tripled; the engine, reading the precise value against each plant's own floor, can. When it crosses a band (Group 3) the fixed-label method differentiates too — credited honestly.
- **The engine always ranks; the fixed-label method never does.** Even with the same survivors, the engine returns a best-first order using distance and sun.
