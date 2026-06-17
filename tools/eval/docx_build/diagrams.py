"""Generate clean, supervisor-friendly diagrams (PNG) for the evaluation report.
All numbers are the real engine/dataset results. Output -> img/."""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "img")
os.makedirs(IMG, exist_ok=True)

INK = "#1b2a20"
GREEN = "#2E7D45"
GREEN_L = "#D6EEDD"
GREY = "#9aa0a6"
GREY_L = "#E8EAED"
AMBER = "#E8A33D"
AMBER_L = "#FBEBD2"
RED = "#C0504D"
RED_L = "#F2DAD9"
BLUE = "#3B6EA5"
BLUE_L = "#D9E4F0"

plt.rcParams.update({"font.size": 12, "font.family": "DejaVu Sans"})


def box(ax, x, y, w, h, text, fc, ec=INK, tc=INK, fs=12, bold=False, alpha=1.0, strike=False):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.06",
                       linewidth=1.6, edgecolor=ec, facecolor=fc, alpha=alpha, mutation_aspect=1)
    ax.add_patch(p)
    t = ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
                fontsize=fs, color=tc, fontweight="bold" if bold else "normal", wrap=True)
    if strike:
        ax.plot([x + 0.06, x + w - 0.06], [y + h / 2, y + h / 2], color=RED, lw=2)
    return p


def arrow(ax, x1, y1, x2, y2, color=INK, lw=2.0):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=18,
                                 lw=lw, color=color, shrinkA=2, shrinkB=2))


def sun_icon(ax, cx, cy, r=0.05, color=AMBER):
    ax.add_patch(Circle((cx, cy), r, color=color, zorder=5))
    import numpy as np
    for a in np.linspace(0, 2 * 3.14159, 8, endpoint=False):
        import math
        ax.plot([cx + math.cos(a) * r * 1.4, cx + math.cos(a) * r * 2.0],
                [cy + math.sin(a) * r * 1.4, cy + math.sin(a) * r * 2.0], color=color, lw=2, zorder=5)


# ---------------------------------------------------------------------------
# 1. THE DOUBT
# ---------------------------------------------------------------------------
def fig_doubt():
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.3))
    for ax in axes:
        ax.set_xlim(-0.02, 1.04); ax.set_ylim(0, 1); ax.axis("off")

    ax = axes[0]
    ax.set_title("What the thesis CLAIMS the engine uses", fontsize=13, fontweight="bold", color=GREEN)
    for i, (lab, c) in enumerate([("Light (lux)", BLUE_L), ("Distance", GREEN_L), ("Sun", AMBER_L)]):
        box(ax, 0.02, 0.68 - i * 0.27, 0.30, 0.18, lab, c, fs=12, bold=True)
        arrow(ax, 0.32, 0.77 - i * 0.27, 0.52, 0.5)
    box(ax, 0.52, 0.40, 0.20, 0.20, "ENGINE", "#ffffff", ec=INK, fs=12, bold=True)
    arrow(ax, 0.72, 0.5, 0.84, 0.5)
    box(ax, 0.84, 0.40, 0.15, 0.20, "Plant\nlist", GREEN_L, fs=11, bold=True)

    ax = axes[1]
    ax.set_title("The worry: is it secretly only this?", fontsize=13, fontweight="bold", color=RED)
    box(ax, 0.02, 0.68, 0.30, 0.18, "Light (lux)", BLUE_L, fs=12, bold=True)
    arrow(ax, 0.32, 0.77, 0.52, 0.5)
    box(ax, 0.02, 0.41, 0.30, 0.18, "Distance", GREY_L, tc=GREY, fs=12, strike=True)
    box(ax, 0.02, 0.14, 0.30, 0.18, "Sun", GREY_L, tc=GREY, fs=12, strike=True)
    ax.text(0.17, 0.085, "ignored?", ha="center", color=RED, fontsize=10, style="italic")
    box(ax, 0.52, 0.40, 0.20, 0.20, "ENGINE", "#ffffff", ec=INK, fs=12, bold=True)
    arrow(ax, 0.72, 0.5, 0.84, 0.5)
    box(ax, 0.84, 0.40, 0.15, 0.20, "Plant\nlist", GREY_L, fs=11, bold=True)

    fig.tight_layout()
    fig.savefig(os.path.join(IMG, "01_doubt.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 2. ENGINE PIPELINE
# ---------------------------------------------------------------------------
def fig_pipeline():
    fig, ax = plt.subplots(figsize=(8.6, 6.6))
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

    box(ax, 0.18, 0.86, 0.64, 0.11, "YOUR MEASUREMENTS:  Light (lux)   ·   Distance (m)   ·   Sun (hours)",
        BLUE_L, fs=11.5, bold=True)
    arrow(ax, 0.5, 0.86, 0.5, 0.80)

    box(ax, 0.12, 0.62, 0.76, 0.17,
        "STEP 1 — THE GATES  (pass / fail)\n"
        "Gate 1: enough light to survive?    Gate 2: direct sun that would scorch?",
        GREEN_L, fs=11.5, bold=True)
    box(ax, 0.62, 0.45, 0.30, 0.10, "plants that fail\nare REMOVED", RED_L, ec=RED, tc=RED, fs=10.5, bold=True)
    arrow(ax, 0.5, 0.62, 0.5, 0.54, color=INK)
    arrow(ax, 0.62, 0.50, 0.50, 0.555, color=RED, lw=1.6)

    box(ax, 0.12, 0.34, 0.76, 0.18,
        "STEP 2 — THE SCORE  (0 to 100 for each survivor)\n"
        "Light 30%   +   Sun 25%   +   Distance 25%   +   Evidence 20%",
        AMBER_L, fs=11.5, bold=True)
    arrow(ax, 0.5, 0.34, 0.5, 0.27)

    box(ax, 0.24, 0.13, 0.52, 0.12, "RANKED PLANT LIST\nbest match first, each with a reason", "#ffffff", ec=GREEN, tc=GREEN, fs=12, bold=True)

    fig.savefig(os.path.join(IMG, "02_pipeline.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 3. THE SCORE RECIPE (stacked bar)
# ---------------------------------------------------------------------------
def fig_recipe():
    fig, ax = plt.subplots(figsize=(9.2, 2.2))
    parts = [("Light fit", 30, BLUE), ("Sun comfort", 25, AMBER), ("Distance fit", 25, GREEN), ("Evidence quality", 20, GREY)]
    left = 0
    for lab, val, c in parts:
        ax.barh(0, val, left=left, color=c, edgecolor="white", height=0.6)
        ax.text(left + val / 2, 0, f"{lab}\n{val}%", ha="center", va="center", color="white", fontsize=11, fontweight="bold")
        left += val
    ax.set_xlim(0, 100); ax.set_ylim(-0.5, 0.5); ax.axis("off")
    ax.set_title("Each plant's score is a blend of four ingredients (fixed shares)", fontsize=12.5, fontweight="bold")
    fig.tight_layout()
    fig.savefig(os.path.join(IMG, "03_recipe.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 4. PART 1 RESULT (bars)
# ---------------------------------------------------------------------------
def fig_part1():
    fig, ax = plt.subplots(figsize=(8.6, 4.6))
    labels = ["A\nnear + sunny\n(0.5 m, 5 h)", "B\ndeep + shaded\n(3.0 m, 0 h)", "C\nmid + some sun\n(1.5 m, 2 h)"]
    vals = [8, 30, 8]
    colors = [AMBER, GREEN, AMBER]
    bars = ax.bar(labels, vals, color=colors, edgecolor=INK, width=0.6)
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.6, str(v), ha="center", fontsize=15, fontweight="bold")
    ax.set_ylabel("plants recommended", fontsize=12)
    ax.set_ylim(0, 34)
    ax.set_title("Part 1: same light (3000 lux) in all three — only distance & sun change", fontsize=12.5, fontweight="bold")
    ax.text(0.5, 0.93, "A light-only engine would give the SAME number 3 times. It gives 8 / 30 / 8.",
            transform=ax.transAxes, ha="center", fontsize=10.5, style="italic", color=RED)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(IMG, "04_part1.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 5. SNAKE PLANT SUB-SCORES (grouped bars + score line)
# ---------------------------------------------------------------------------
def fig_subscores():
    import numpy as np
    fig, ax = plt.subplots(figsize=(8.6, 4.6))
    cases = ["A (near, 5 h)", "B (deep, 0 h)", "C (mid, 2 h)"]
    sun = [0.60, 1.00, 1.00]
    dist = [0.70, 0.70, 1.00]
    x = np.arange(3); w = 0.35
    ax.bar(x - w / 2, sun, w, label="Sun ingredient", color=AMBER, edgecolor=INK)
    ax.bar(x + w / 2, dist, w, label="Distance ingredient", color=GREEN, edgecolor=INK)
    for i, (s, d) in enumerate(zip(sun, dist)):
        ax.text(i - w / 2, s + 0.02, f"{s:.2f}", ha="center", fontsize=10, fontweight="bold")
        ax.text(i + w / 2, d + 0.02, f"{d:.2f}", ha="center", fontsize=10, fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(cases)
    ax.set_ylim(0, 1.25); ax.set_ylabel("ingredient value (0–1)")
    ax.set_title("Snake Plant: its sun & distance ingredients move with the inputs", fontsize=12.5, fontweight="bold")
    ax2 = ax.twinx()
    ax2.plot(x, [76.5, 86.5, 94.0], "-o", color=BLUE, lw=2.5, label="Final score")
    for i, sc in enumerate([76.5, 86.5, 94.0]):
        ax2.text(i, sc + 1.5, f"{sc:.1f}", ha="center", color=BLUE, fontsize=10, fontweight="bold")
    ax2.set_ylim(0, 110); ax2.set_ylabel("final score (0–100)", color=BLUE)
    ax2.tick_params(axis="y", colors=BLUE)
    ax.legend(loc="upper left", fontsize=10); ax2.legend(loc="upper right", fontsize=10)
    ax.spines["top"].set_visible(False); ax2.spines["top"].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(IMG, "05_subscores.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 6. LIGHT FALLOFF vs BANDS (two panels, real data)
# ---------------------------------------------------------------------------
def fig_falloff():
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.6), sharey=True)
    d = [50, 100, 150]

    def panel(ax, lux, title, note):
        ax.axhspan(1, 4000, color=GREEN_L, alpha=0.7)
        ax.axhspan(4000, 11000, color=AMBER_L, alpha=0.7)
        ax.axhspan(11000, 32000, color=RED_L, alpha=0.7)
        ax.axhline(4000, color=GREY, lw=1, ls="--"); ax.axhline(11000, color=GREY, lw=1, ls="--")
        ax.plot(d, lux, "-o", color=INK, lw=2.4, markersize=9, zorder=5)
        for xi, yi in zip(d, lux):
            ax.annotate(f"{yi:,} lx", (xi, yi), textcoords="offset points", xytext=(0, 11),
                        ha="center", fontsize=10, fontweight="bold")
        ax.set_xticks(d)
        ax.set_xlabel("distance from window (cm)\n\n" + note, fontsize=10)
        ax.set_title(title, fontsize=12, fontweight="bold")
        ax.set_xlim(35, 165)

    axes[0].set_ylim(200, 30000); axes[0].set_yscale("log")
    axes[0].set_ylabel("light (lux, log scale)")
    panel(axes[0], [2800, 2443, 1328], "Typical: stays inside the LOW band",
          "Light drops ~3x but all 3 are still 'LOW'\n-> fixed-label gives the SAME list (~55% of sessions)")
    panel(axes[1], [12040, 5192, 3410], "Bright day: crosses the band lines",
          "FULL -> MEDIUM -> LOW\n-> fixed-label DOES change its answer (~45% of sessions)")
    # band labels (right edge, clear of the descending data line)
    for ax in axes:
        ax.text(163, 600, "LOW", color=GREEN, fontsize=9, fontweight="bold", ha="right")
        ax.text(163, 6800, "MEDIUM", color="#b07d2a", fontsize=9, fontweight="bold", ha="right")
        ax.text(163, 20000, "FULL", color=RED, fontsize=9, fontweight="bold", ha="right")
    fig.suptitle("Your real field data: light vs distance, against the fixed-label bands", fontsize=13, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(os.path.join(IMG, "06_falloff.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 7. SAME LUX, DIFFERENT SUN (the cleanest case)
# ---------------------------------------------------------------------------
def fig_sun_same_lux():
    fig, ax = plt.subplots(figsize=(9.6, 4.8))
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
    ax.set_title("Two spots, BOTH reading 2000 lux — but one gets direct sun", fontsize=13, fontweight="bold")

    # spots row
    box(ax, 0.04, 0.64, 0.40, 0.24, "Spot X — north window\n2000 lux  ·  NO direct sun", BLUE_L, fs=11.5, bold=True)
    box(ax, 0.56, 0.64, 0.40, 0.24, "Spot Y — west window\n2000 lux  ·  3 h direct sun", AMBER_L, fs=11.5, bold=True)
    sun_icon(ax, 0.88, 0.83, r=0.020)

    # old-way row + caption in the gap below it
    box(ax, 0.04, 0.42, 0.40, 0.13, "OLD WAY: both = 'LOW' band\n→ SAME 30 plants", GREY_L, tc="#555", fs=11, bold=True)
    box(ax, 0.56, 0.42, 0.40, 0.13, "OLD WAY: both = 'LOW' band\n→ SAME 30 plants", GREY_L, tc="#555", fs=11, bold=True)
    ax.text(0.5, 0.375, "↑ identical — the old way cannot tell them apart", ha="center",
            color=RED, fontsize=11, style="italic", fontweight="bold")

    # engine row + caption in the gap below it
    box(ax, 0.04, 0.14, 0.40, 0.15, "YOUR ENGINE\n28 plants (all safe)", GREEN_L, ec=GREEN, tc=GREEN, fs=12, bold=True)
    box(ax, 0.56, 0.14, 0.40, 0.15, "YOUR ENGINE\n8 plants (sun-safe only)", GREEN_L, ec=GREEN, tc=GREEN, fs=12, bold=True)
    ax.text(0.5, 0.075, "↑ different — your engine removes the sun-sensitive plants from Y", ha="center",
            color=GREEN, fontsize=11, style="italic", fontweight="bold")
    fig.tight_layout()
    fig.savefig(os.path.join(IMG, "07_sun_same_lux.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 8. PART 2 GROUPED BARS (label vs engine)
# ---------------------------------------------------------------------------
def fig_part2():
    import numpy as np
    fig, ax = plt.subplots(figsize=(10.4, 4.8))
    spots = ["X\n(north,\nno sun)", "Y\n(west,\n3 h sun)", "D1\n50 cm", "D2\n100 cm", "D3\n150 cm", "B1\n50 cm", "B2\n100 cm", "B3\n150 cm"]
    label = [30, 30, 30, 30, 30, 31, 30, 30]
    engine = [28, 8, 30, 30, 19, 30, 30, 30]
    x = np.arange(len(spots)); w = 0.4
    ax.bar(x - w / 2, label, w, label="Old way (fixed-label)", color=GREY, edgecolor=INK)
    ax.bar(x + w / 2, engine, w, label="Your engine (measured)", color=GREEN, edgecolor=INK)
    for i, (l, e) in enumerate(zip(label, engine)):
        ax.text(i - w / 2, l + 0.4, l, ha="center", fontsize=9.5, fontweight="bold")
        ax.text(i + w / 2, e + 0.4, e, ha="center", fontsize=9.5, fontweight="bold", color=GREEN)
    ax.set_xticks(x); ax.set_xticklabels(spots, fontsize=9.5)
    ax.set_ylim(0, 40); ax.set_ylabel("plants recommended")
    # group dividers / headers
    for xpos, txt, col in [(0.5, "Group 1: same lux,\ndifferent sun", AMBER),
                           (3, "Group 2: real falloff,\nsame band", BLUE),
                           (6, "Group 3: falloff\ncrosses bands", "#777")]:
        ax.text(xpos, 33.5, txt, ha="center", va="bottom", fontsize=9.5, fontweight="bold", color=col)
    ax.axvline(1.5, color="#ccc", lw=1); ax.axvline(4.5, color="#ccc", lw=1)
    ax.legend(loc="lower left", fontsize=10)
    ax.set_title("Part 2: old way vs your engine on real spots", fontsize=12.5, fontweight="bold", pad=14)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(os.path.join(IMG, "08_part2.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


for fn in [fig_doubt, fig_pipeline, fig_recipe, fig_part1, fig_subscores, fig_falloff, fig_sun_same_lux, fig_part2]:
    fn()
    print("ok", fn.__name__)
print("all diagrams written to", IMG)
