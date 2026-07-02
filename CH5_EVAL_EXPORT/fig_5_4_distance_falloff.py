"""
FIG 5.4 — Light fall-off with distance, against the fixed-label band boundaries.
INPUT FILE: CH5_EVAL_EXPORT/distance_falloff.csv
            (copied verbatim from tools/analysis_output/distance_falloff.csv, emitted
             by tools/analyze_spot_observations.py from the field workbook.)
            Columns used: meter_avg_50cm, meter_avg_100cm, meter_avg_150cm
            (ground-truth reference meter lux at each distance, one row per session).
Bands: low < 4000, medium < 11000, full >= 11000 lux.
Split: 41 of 70 sessions (58.6%) stay within one band; 29 (41.4%) cross a band.

Suggested caption:
Figure 5.4  Measured light at 50, 100 and 150 cm from the window for all 70 field
sessions (reference-meter values, vertical axis on a logarithmic scale). The two
horizontal lines are the fixed-label band boundaries at 4000 and 11000 lux. Blue
sessions stay inside a single band across all three distances, so a band-only method
would give them one identical answer even though the real light changes; orange
sessions cross a boundary. Fifty-nine percent stay within a band, which is where the
measured engine can tell distances apart and the fixed-label baseline cannot.
"""
import csv
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
CSV = HERE / "distance_falloff.csv"
OUT = HERE / "figures" / "fig_5_4_distance_falloff.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

BLUE, ORANGE, BLACK = "#0072B2", "#E69F00", "#000000"
LOW_HI, MED_HI = 4000, 11000
DIST = [50, 100, 150]


def band(v):
    return 0 if v < LOW_HI else 1 if v < MED_HI else 2


within = cross = 0
fig, ax = plt.subplots(figsize=(8.2, 6.0))
with open(CSV) as f:
    for row in csv.DictReader(f):
        ys = [float(row["meter_avg_50cm"]), float(row["meter_avg_100cm"]),
              float(row["meter_avg_150cm"])]
        crosses = len({band(y) for y in ys}) > 1
        if crosses:
            cross += 1
        else:
            within += 1
        ax.plot(DIST, ys, color=(ORANGE if crosses else BLUE),
                alpha=0.55, lw=1.3, marker="o", ms=3,
                zorder=(3 if crosses else 2))

n = within + cross
# band boundary lines + shaded band labels
ax.axhline(LOW_HI, color=BLACK, lw=1.6, ls="--", zorder=4)
ax.axhline(MED_HI, color=BLACK, lw=1.6, ls="--", zorder=4)
ax.text(151.5, LOW_HI, "  low | medium\n  (4000 lx)", va="center", fontsize=9)
ax.text(151.5, MED_HI, "  medium | full\n  (11000 lx)", va="center", fontsize=9)

# legend proxies
ax.plot([], [], color=BLUE, lw=2, label=f"Stays within one band  ({within} of {n}, {within/n*100:.0f}%)")
ax.plot([], [], color=ORANGE, lw=2, label=f"Crosses a band  ({cross} of {n}, {cross/n*100:.0f}%)")

ax.set_yscale("log")
ax.set_xticks(DIST)
ax.set_xlim(40, 210)
ax.set_xlabel("Distance from window (cm)")
ax.set_ylabel("Reference meter light (lux, log scale)")
ax.set_title("Light fall-off vs fixed-label band boundaries (70 sessions)")
ax.legend(loc="upper right", fontsize=9.5, framealpha=0.95)
ax.grid(True, which="both", ls=":", alpha=0.35)

fig.tight_layout()
fig.savefig(OUT, dpi=300, bbox_inches="tight")
print("saved", OUT)
print(f"within={within} cross={cross} total={n}  ({within/n*100:.1f}% / {cross/n*100:.1f}%)")
