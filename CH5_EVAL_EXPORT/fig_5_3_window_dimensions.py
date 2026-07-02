"""
FIG 5.3 — Window-size AR accuracy per dimension (width / height / sill).
INPUT FILE: C:\\Users\\tommy\\Downloads\\Lumen_Evaluation_FINAL\\evaluation_spreadsheets\\
            Window_Size_AR_vs_Tape_Log.xlsx  (sheet WindowSize_vs_Tape)
            Dimension column (D), Tape (E), App AR (F). n = 30 per dimension, 90 total.
Difference = App AR - Tape.

CHOICE OF CHART: grouped bars of MAE (cm) and MAPE (%) per dimension, NOT a
Bland-Altman. Reason: a single Bland-Altman would be dominated by one gross sill
outlier (+257 cm) and would compress the reliable width/height points into an
unreadable strip. Two side-by-side bar panels make the one message the figure must
carry unmistakable: width is reliable, sill is not.

Suggested caption:
Figure 5.3  Augmented-reality accuracy for each window dimension against a tape
measure (30 windows each). Left panel is the mean absolute error in centimetres;
right panel is the same error as a percentage of the true size. Width is measured
well (5.3 cm, 3.6 percent) and sill height is the weakest (17.7 cm, 37.6 percent),
which is why the window dimensions are treated as approximate and are never used as
a hard input to the recommendation.
"""
from pathlib import Path
from collections import defaultdict
import statistics
import openpyxl
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

XLSX = Path(r"C:\Users\tommy\Downloads\Lumen_Evaluation_FINAL\evaluation_spreadsheets\Window_Size_AR_vs_Tape_Log.xlsx")
OUT = Path(__file__).resolve().parent / "figures" / "fig_5_3_window_dimensions.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

GREEN, BLUE, VERM, GREY = "#009E73", "#0072B2", "#D55E00", "#666666"
DIMS = ["width", "height", "sill"]
COLOURS = {"width": GREEN, "height": BLUE, "sill": VERM}

wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb["WindowSize_vs_Tape"]
groups = defaultdict(list)  # dim -> (tape, app)
for r in ws.iter_rows(min_row=5, values_only=True):
    wid, dim, tape, app = r[0], r[3], r[4], r[5]
    if wid and dim and isinstance(tape, (int, float)) and isinstance(app, (int, float)):
        d = str(dim).strip().lower()
        if d in DIMS:
            groups[d].append((float(tape), float(app)))

mae, mape, ns = {}, {}, {}
for d in DIMS:
    diffs = [a - t for t, a in groups[d]]
    tapes = [t for t, a in groups[d]]
    ns[d] = len(diffs)
    mae[d] = statistics.mean(abs(x) for x in diffs)
    mape[d] = statistics.mean(abs(x) / t for x, t in zip(diffs, tapes)) * 100

fig, (axl, axr) = plt.subplots(1, 2, figsize=(10.2, 5.0))
x = range(len(DIMS))
labels = [f"{d}\n(n={ns[d]})" for d in DIMS]

b1 = axl.bar(x, [mae[d] for d in DIMS], color=[COLOURS[d] for d in DIMS],
             edgecolor="black", linewidth=0.5, width=0.6)
axl.set_xticks(list(x)); axl.set_xticklabels(labels)
axl.set_ylabel("Mean absolute error (cm)")
axl.set_title("Absolute error per dimension")
for i, d in enumerate(DIMS):
    axl.text(i, mae[d] + 0.3, f"{mae[d]:.1f} cm", ha="center", va="bottom",
             fontsize=10, fontweight="bold")
axl.set_ylim(0, max(mae.values()) * 1.15)  # headroom so the value labels stay inside the box
axl.grid(True, axis="y", ls=":", alpha=0.4)

b2 = axr.bar(x, [mape[d] for d in DIMS], color=[COLOURS[d] for d in DIMS],
             edgecolor="black", linewidth=0.5, width=0.6)
axr.set_xticks(list(x)); axr.set_xticklabels(labels)
axr.set_ylabel("Mean absolute percentage error (%)")
axr.set_title("Relative error per dimension")
for i, d in enumerate(DIMS):
    axr.text(i, mape[d] + 0.5, f"{mape[d]:.1f}%", ha="center", va="bottom",
             fontsize=10, fontweight="bold")
axr.set_ylim(0, max(mape.values()) * 1.15)  # headroom so the value labels stay inside the box
axr.grid(True, axis="y", ls=":", alpha=0.4)

fig.suptitle("Window-size AR accuracy vs tape measure (90 measurements)",
             fontsize=13, y=1.02)
fig.tight_layout()
fig.savefig(OUT, dpi=300, bbox_inches="tight")
print("saved", OUT)
for d in DIMS:
    print(f"{d}: n={ns[d]} MAE={mae[d]:.1f} MAPE={mape[d]:.1f}%")
