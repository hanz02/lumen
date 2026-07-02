"""
FIG 5.1 — Light-sensor calibration scatter (phone lux vs reference meter lux).
INPUT FILE: CH5_EVAL_EXPORT/calibration_pairs_210.csv
            (210 per-observation averaged pairs dumped verbatim from
             ...\\LIGHT DATA COMPLETED\\SPOT_INPUT_master_template.xlsx, sheet
             SPOT_OBSERVATIONS, phone cols 14-18, meter cols 20-24 — the single
             source of truth for src/engine/config.ts LUX_CALIBRATION.)
Fit shown: meter = 1.1054*phone + 134.4  (n=210, r=0.996, R2=0.993).
Analysis method: hand-written pure-Python OLS (no scipy/sklearn); this script only
plots the already-fitted line and the raw pairs.

Suggested caption:
Figure 5.1  Agreement between the phone light sensor and the reference lux meter
across 210 paired readings. Each point is one spot reading (phone value on the
horizontal axis, meter value on the vertical axis). The solid line is the fitted
conversion meter = 1.1054 x phone + 134.4 and the dashed line is perfect agreement
(y = x). Points sit above the dashed line, showing the phone reads consistently low;
the fitted line corrects this. The right panel magnifies the dense 0 to 3000 lux
region. Shaded bands mark the below-200-lux zone (where the app returns the raw
value) and the above-6000-lux zone (beyond the validated range).
"""
import csv
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
CSV = HERE / "calibration_pairs_210.csv"
OUT = HERE / "figures" / "fig_5_1_calibration_scatter.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

SLOPE, INTERCEPT, R, R2, N = 1.1054, 134.4, 0.996, 0.993, 210
VALID_MIN, EXTRAP_MAX = 200, 6000
ZOOM_MAX = 3000

# Okabe-Ito colour-blind-safe palette
BLUE, ORANGE, GREY, BLACK = "#0072B2", "#E69F00", "#999999", "#000000"

phone, meter = [], []
with open(CSV) as f:
    for row in csv.DictReader(f):
        phone.append(float(row["phone_lux"]))
        meter.append(float(row["meter_lux"]))

xmax = max(max(phone), max(meter)) * 1.05

fig, (ax, axz) = plt.subplots(1, 2, figsize=(13.0, 6.0))


def draw_panel(ax, xlim):
    ax.axvspan(0, VALID_MIN, color=GREY, alpha=0.18, lw=0,
               label=f"< {VALID_MIN} lx raw-value guard")
    ax.axvspan(EXTRAP_MAX, xmax, color=ORANGE, alpha=0.10, lw=0,
               label=f"> {EXTRAP_MAX} lx extrapolation")
    ax.scatter(phone, meter, s=22, color=BLUE, alpha=0.55, edgecolor="white",
               linewidth=0.4, zorder=3, label=f"Paired readings (n = {N})")
    xs = [0, xmax]
    ax.plot(xs, [SLOPE * x + INTERCEPT for x in xs], color=ORANGE, lw=2.2, zorder=4,
            label=f"Fit:  meter = {SLOPE} x phone + {INTERCEPT}")
    ax.plot(xs, xs, color=BLACK, lw=1.2, ls="--", zorder=2,
            label="Perfect agreement (y = x)")
    ax.set_xlim(*xlim)
    ax.set_ylim(*xlim)
    ax.set_xlabel("Phone light-sensor reading (lux)")
    ax.grid(True, ls=":", alpha=0.4)


# Left panel: full range.
draw_panel(ax, (0, xmax))
ax.set_ylabel("Reference meter reading (lux)")
ax.set_title("Full range (n = 210)")
# Stats box: at x_frac=0.70 the fit line sits at y_frac~0.78 and the identity
# line at y_frac=0.70, so anchoring the box top at 0.62 clears both, and the
# legend (lower right) tops out well below 0.62 too.
ax.annotate(f"r = {R}\nR² = {R2}\nn = {N}",
            xy=(0.70, 0.62), xycoords="axes fraction",
            fontsize=12, va="top", ha="left",
            bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=GREY))
ax.legend(loc="lower right", fontsize=8.5, framealpha=0.95)

# Right panel: zoom into the dense 0-3000 lx cluster, own full-size axes
# (not an inset), so it no longer overlaps or hides the left panel.
draw_panel(axz, (0, ZOOM_MAX))
axz.set_ylabel("Reference meter reading (lux)")
axz.set_title(f"Zoom: 0 to {ZOOM_MAX} lx")

fig.suptitle("Phone-to-meter light calibration", fontsize=15, y=1.0)
fig.tight_layout()
fig.savefig(OUT, dpi=300, bbox_inches="tight")
print("saved", OUT)
