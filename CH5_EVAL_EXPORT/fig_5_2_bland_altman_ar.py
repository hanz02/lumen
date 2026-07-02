"""
FIG 5.2 — Bland-Altman plot for the AR plant-to-window distance.
INPUT FILE: C:\\Users\\tommy\\Downloads\\Lumen_Evaluation_FINAL\\evaluation_spreadsheets\\
            AR_vs_Tape_Validation_Log_v2.xlsx  (sheet AR_vs_Tape)
            Tape column (E) = reference; App AR column (F) = measured.
Difference plotted = App AR - Tape (cm). n = 30.
Stats (independently re-computed, sample SD): bias +5.55, SD 15.67,
lower LoA -25.2, upper LoA +36.3, r 0.990. Method: hand-written pure-Python
(no scipy); openpyxl only reads the cells.

Suggested caption:
Figure 5.2  Bland-Altman agreement plot for the augmented-reality distance
measurement against a tape measure (n = 30). Each point is one spot; the horizontal
axis is the average of the two tools and the vertical axis is their difference
(app minus tape). The solid line is the mean difference (bias, +5.6 cm) and the
dashed lines are the limits of agreement (bias plus or minus 1.96 standard
deviations), inside which about 95 percent of differences fall. One outlier at
+63.3 cm (a poor floor detection on a semi-reflective surface) is marked.
"""
from pathlib import Path
import statistics
import openpyxl
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

XLSX = Path(r"C:\Users\tommy\Downloads\Lumen_Evaluation_FINAL\evaluation_spreadsheets\AR_vs_Tape_Validation_Log_v2.xlsx")
OUT = Path(__file__).resolve().parent / "figures" / "fig_5_2_bland_altman_ar.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

BLUE, ORANGE, VERM, BLACK, GREY = "#0072B2", "#E69F00", "#D55E00", "#000000", "#999999"

wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb["AR_vs_Tape"]
tape, app = [], []
for r in ws.iter_rows(values_only=True):
    sid = r[0]
    if isinstance(sid, str) and sid.startswith("S") and sid[1:].isdigit():
        tape.append(float(r[4]))
        app.append(float(r[5]))

diff = [a - t for a, t in zip(app, tape)]
mean_xy = [(a + t) / 2 for a, t in zip(app, tape)]
n = len(diff)
bias = statistics.mean(diff)
sd = statistics.stdev(diff)
lo, hi = bias - 1.96 * sd, bias + 1.96 * sd

# identify the +63.3 outlier
out_i = max(range(n), key=lambda i: diff[i])

fig, ax = plt.subplots(figsize=(7.6, 5.6))
ax.axhspan(lo, hi, color=BLUE, alpha=0.06, lw=0)
ax.scatter([mean_xy[i] for i in range(n) if i != out_i],
           [diff[i] for i in range(n) if i != out_i],
           s=42, color=BLUE, alpha=0.75, edgecolor="white", linewidth=0.5,
           zorder=3, label="Spot (n = 30)")
ax.scatter([mean_xy[out_i]], [diff[out_i]], s=90, color=VERM, edgecolor="black",
           linewidth=0.7, zorder=4, marker="D",
           label=f"Outlier +{diff[out_i]:.1f} cm (poor floor detection)")

ax.axhline(bias, color=ORANGE, lw=2.0, zorder=2)
ax.axhline(hi, color=BLACK, lw=1.3, ls="--", zorder=2)
ax.axhline(lo, color=BLACK, lw=1.3, ls="--", zorder=2)
ax.axhline(0, color=GREY, lw=0.9, ls=":", zorder=1)

xr = max(mean_xy)
ax.set_xlabel("Mean of tape and AR distance (cm)")
ax.set_ylabel("Difference: AR minus tape (cm)")
ax.set_title("Bland-Altman agreement — AR plant-to-window distance (n = 30)")
ax.set_xlim(0, xr + 40)
ax.set_ylim(lo - 12, max(diff) + 10)
ax.legend(loc="upper left", fontsize=9.5, framealpha=0.95)
ax.grid(True, ls=":", alpha=0.4)

# Right-hand reference ticks for bias and the two limits of agreement — avoids
# text labels colliding with the data or the legend.
ax2 = ax.twinx()
ax2.set_ylim(ax.get_ylim())
ax2.set_yticks([lo, bias, hi])
ax2.set_yticklabels([f"lower LoA\n{lo:.1f} cm",
                     f"bias\n+{bias:.1f} cm",
                     f"upper LoA\n+{hi:.1f} cm"])
ax2.tick_params(length=0)
for t, col in zip(ax2.get_yticklabels(), [BLACK, ORANGE, BLACK]):
    t.set_color(col)
    t.set_fontsize(9)
    t.set_fontweight("bold")

fig.tight_layout()
fig.savefig(OUT, dpi=300, bbox_inches="tight")
print("saved", OUT)
print(f"n={n} bias={bias:.2f} sd={sd:.2f} LoA=[{lo:.1f},{hi:.1f}]")
