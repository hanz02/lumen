"""
FIG 5.5 — RQ3 concept diagram (non-statistical), rendered for embedding.
Mirrors fig_5_5_rq3_concept.drawio.xml. Shows two spots that fall in the SAME
fixed-label bucket (identical baseline list) but differ in measured sun, so the
engine differentiates and ranks them. Numbers are the real Group-1 run
(2000 lx; baseline 30 vs 30; engine 28 vs 8).

Suggested caption:
Figure 5.5  Why the measured approach separates spots the fixed-label method
collapses. Both spots read 2000 lux, so the fixed-label method places them in the
same band and returns one identical unranked list. The measured engine also reads
the distance and whether direct sun reaches the spot, so it keeps 28 plants for the
shaded spot but only 8 for the sunny one and ranks each list.
"""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = Path(__file__).resolve().parent / "figures" / "fig_5_5_rq3_concept.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

BLUE, ORANGE, GREY, INK = "#0072B2", "#D55E00", "#B0B0B0", "#1B2A20"
BLUE_F, ORANGE_F, GREY_F = "#D6E8F5", "#FBE6CC", "#F0F0F0"

fig, ax = plt.subplots(figsize=(9.6, 6.8))
ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")


def box(x, y, w, h, text, fc, ec, fs=10.5, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                 boxstyle="round,pad=0.6,rounding_size=2",
                 fc=fc, ec=ec, lw=1.6))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fs, color=INK, fontweight=("bold" if bold else "normal"))


def arrow(x1, y1, x2, y2, color):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2),
                 arrowstyle="-|>", mutation_scale=16, lw=1.6, color=color))


ax.text(50, 97, "Two spots read the same light band, but are not the same place",
        ha="center", va="center", fontsize=13, fontweight="bold", color=INK)

box(4, 80, 42, 13,
    "Spot A\n2000 lux  ·  north window, no direct sun  ·  1 m",
    BLUE_F, BLUE)
box(54, 80, 42, 13,
    "Spot B\n2000 lux  ·  west window, 3 h direct sun  ·  1 m",
    ORANGE_F, ORANGE)

# fixed-label path (centre)
box(28, 57, 44, 12,
    "FIXED-LABEL METHOD\nboth fall in the same band (under 4000 lux)\nsun and distance ignored",
    GREY_F, GREY, fs=9.5)
box(31, 42, 38, 9, "Same identical list for both spots\n30 plants, unranked",
    GREY_F, GREY, fs=9.5)
arrow(25, 80, 42, 69, GREY)
arrow(75, 80, 58, 69, GREY)
arrow(50, 57, 50, 51, GREY)

# engine paths
box(4, 22, 42, 11,
    "LUMEN ENGINE\nreads exact light + distance + sun",
    BLUE_F, BLUE, fs=9.5)
box(54, 22, 42, 11,
    "LUMEN ENGINE\nreads exact light + distance + sun",
    ORANGE_F, ORANGE, fs=9.5)
box(7, 5, 36, 11,
    "28 plants recommended, ranked\ntop pick  Anthurium",
    BLUE_F, BLUE, fs=9.5, bold=True)
box(57, 5, 36, 11,
    "8 plants recommended, ranked\nscorch-prone plants removed\ntop pick  Purple Passion",
    ORANGE_F, ORANGE, fs=9.5, bold=True)
arrow(20, 80, 20, 33, BLUE)
arrow(80, 80, 80, 33, ORANGE)
arrow(25, 22, 25, 16, BLUE)
arrow(75, 22, 75, 16, ORANGE)

fig.savefig(OUT, dpi=300, bbox_inches="tight")
print("saved", OUT)
