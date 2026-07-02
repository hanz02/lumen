"""
Generate all diagrams for the Lumen Technical Report.
Run: python tools/report/diagrams.py
Output: tools/report/img/*.png
"""
import os, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.patches as patches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from matplotlib.patheffects import withStroke

OUT = os.path.join(os.path.dirname(__file__), "img")
os.makedirs(OUT, exist_ok=True)

# ── shared style ─────────────────────────────────────────────────────────────
BG    = "#0B1A11"
SURF  = "#14291B"
SURF2 = "#1C3A26"
LEAF  = "#56C17F"
MINT  = "#A9E8C3"
AMBER = "#F4C84B"
CORAL = "#E97A66"
DIM   = "#94B09C"
TEXT  = "#F2F7F0"
FAINT = "#5F7A67"
HAIR  = "#25422E"

def fig(w=10, h=6):
    f = plt.figure(figsize=(w, h), facecolor=BG)
    return f

def save(name):
    p = os.path.join(OUT, name)
    plt.savefig(p, dpi=150, bbox_inches="tight", facecolor=BG)
    plt.close()
    print(f"  saved {name}")

# ============================================================
# 01 — System Architecture Pipeline
# ============================================================
def diagram_architecture():
    f, ax = plt.subplots(figsize=(12, 7), facecolor=BG)
    ax.set_facecolor(BG)
    ax.axis("off")

    # --- columns: sensors | processing | engine | output ---
    cols = [1.0, 4.2, 7.4, 10.6]
    col_labels = ["SENSORS\n& CAPTURE", "PROCESSING\n& CALIBRATION", "RECOMMENDATION\nENGINE", "USER\nOUTPUT"]
    for x, lbl in zip(cols, col_labels):
        ax.text(x, 6.4, lbl, ha="center", va="center", fontsize=8, fontweight="bold",
                color=MINT, family="monospace")

    def box(ax, x, y, label, sub="", color=SURF2, w=2.2, h=0.55):
        r = FancyBboxPatch((x - w/2, y - h/2), w, h,
                           boxstyle="round,pad=0.04", linewidth=1.2,
                           edgecolor=HAIR, facecolor=color)
        ax.add_patch(r)
        ax.text(x, y + (0.1 if sub else 0), label, ha="center", va="center",
                fontsize=9, fontweight="bold", color=TEXT)
        if sub:
            ax.text(x, y - 0.18, sub, ha="center", va="center",
                    fontsize=7, color=DIM)
        return (x, y)

    def arrow(ax, x1, y1, x2, y2, col=HAIR):
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color=col, lw=1.2))

    # Sensors column
    box(ax, 1.0, 5.5, "Android TYPE_LIGHT", "ambient light sensor", SURF2)
    box(ax, 1.0, 4.6, "ARCore Session", "plane detect + raycast", SURF2)
    box(ax, 1.0, 3.7, "Compass + GPS", "magnetic + declination", SURF2)
    box(ax, 1.0, 2.8, "GPS Location", "lat / lon one-shot", SURF2)
    box(ax, 1.0, 1.9, "Date & Time", "device clock", SURF2)

    # Processing column
    box(ax, 4.2, 5.5, "Plateau Detection", "10 Hz resample → median", SURF2)
    box(ax, 4.2, 4.6, "AR Line Measure", "3D distance → horizontal m", SURF2)
    box(ax, 4.2, 3.7, "True Azimuth", "mag. + declination = true N", SURF2)
    box(ax, 4.2, 2.35, "SPA (solar.ts)", "NOAA Meeus equations\nestimate direct-sun hours", "#1A3A28)".replace(")", ""), w=2.4, h=0.75)

    box(ax, 4.2, 1.3, "Lux Calibration", "raw × 1.1054 + 134.4", SURF2)

    # Engine column
    box(ax, 7.4, 5.3, "Gate 1", "lux < maint. min?", color="#2A1A1A")
    box(ax, 7.4, 4.5, "Gate 2", "sun + no-tolerance?", color="#2A1A1A")
    box(ax, 7.4, 3.6, "Light Fit Score", "piecewise [0,1]  wt=0.30", SURF2)
    box(ax, 7.4, 2.8, "Sun Factor", "tolerance × hours  wt=0.25", SURF2)
    box(ax, 7.4, 2.0, "Distance Factor", "zone × class   wt=0.25", SURF2)
    box(ax, 7.4, 1.2, "Confidence Factor", "evidence quality wt=0.20", SURF2)
    box(ax, 7.4, 0.35, "Weighted Sum", "renorm if input missing", color=LEAF, w=2.4)

    # Output column
    box(ax, 10.6, 3.5, "Ranked Plant List", "#1 Hero + runners-up", color="#1A3D28")
    box(ax, 10.6, 2.4, "Plain-language Why", "explain.ts", SURF2)
    box(ax, 10.6, 1.4, "Eliminated + Reason", "shown on expand", SURF2)
    box(ax, 10.6, 0.35, "Eval Log CSV", "ref fields for Ch 4", SURF2)

    # Arrows sensor → processing
    for y in [5.5, 4.6, 3.7]:
        arrow(ax, 2.1, y, 3.1, y)
    arrow(ax, 2.1, 2.8, 3.1, 2.35)
    arrow(ax, 2.1, 1.9, 3.1, 2.0)
    arrow(ax, 2.1, 5.5, 3.1, 1.3)

    # Arrows processing → engine
    arrow(ax, 5.3, 5.5, 6.3, 3.6)
    arrow(ax, 5.3, 4.6, 6.3, 3.6)
    arrow(ax, 5.3, 3.7, 6.3, 3.6)
    arrow(ax, 5.3, 2.35, 6.3, 2.8)
    arrow(ax, 5.3, 2.35, 6.3, 5.3)
    arrow(ax, 5.3, 4.6, 6.3, 2.0)
    arrow(ax, 5.3, 1.3, 6.3, 3.6)
    arrow(ax, 5.3, 1.3, 6.3, 1.2)

    # Gates → factors
    arrow(ax, 7.4, 5.0, 7.4, 4.8, col=CORAL)
    arrow(ax, 7.4, 4.2, 7.4, 3.9, col=CORAL)

    # Factors → weighted sum
    for y in [3.6, 2.8, 2.0, 1.2]:
        arrow(ax, 7.4, y - 0.28, 7.4, 0.63)

    # Weighted sum → output
    arrow(ax, 8.5, 0.35, 9.5, 0.35)
    arrow(ax, 9.5, 0.35, 9.5, 3.5)
    ax.annotate("", xy=(9.5, 3.5), xytext=(9.5, 3.5),
                arrowprops=dict(arrowstyle="-|>", color=HAIR, lw=1.2))

    arrow(ax, 10.6, 3.2, 10.6, 2.7)
    arrow(ax, 10.6, 2.1, 10.6, 1.7)
    arrow(ax, 10.6, 1.1, 10.6, 0.63)

    # Gate elimination labels
    ax.text(6.8, 5.3, "ELIMINATE", fontsize=6, color=CORAL, ha="center")
    ax.text(6.8, 4.5, "ELIMINATE", fontsize=6, color=CORAL, ha="center")

    ax.set_xlim(0, 12); ax.set_ylim(0, 7)
    ax.set_title("Lumen — Full System Architecture", color=TEXT, fontsize=13, fontweight="bold", pad=12)
    save("01_architecture.png")

# ============================================================
# 02 — Wizard Step Flow
# ============================================================
def diagram_wizard():
    f, ax = plt.subplots(figsize=(12, 4), facecolor=BG)
    ax.set_facecolor(BG); ax.axis("off")

    steps = [
        ("Welcome", "LumenMark logo\napp introduction", SURF2),
        ("Step 1\nPlant Spot", "ARCore: tap to place\nplant + window anchors\n→ distance (m)\n(or manual tape-cm)", SURF2),
        ("Step 2\nWindow Size", "ARCore: measure\nwidth / height / sill\n(optional, improves SPA)", SURF2),
        ("Step 3\nSpot Light", "TYPE_LIGHT sensor\n10 s capture\nplateau → median lux", SURF2),
        ("Step 4\nWindow Facing", "Compass + GPS\nmagnetic → true N\nazimuth → aspect\n(OPTIONAL step)", SURF2),
        ("Step 5\nResults", "Engine runs:\ngates → score → rank\nHero + explain", "#1A3D28"),
    ]

    xs = [1.0, 3.0, 5.0, 7.0, 9.0, 11.0]
    for i, ((title, body, col), x) in enumerate(zip(steps, xs)):
        r = FancyBboxPatch((x - 0.85, 0.8), 1.7, 2.4,
                           boxstyle="round,pad=0.06", linewidth=1.2,
                           edgecolor=LEAF if i == 5 else HAIR, facecolor=col)
        ax.add_patch(r)
        ax.text(x, 3.0, title, ha="center", va="center", fontsize=8.5,
                fontweight="bold", color=MINT if i == 5 else TEXT)
        ax.text(x, 1.8, body, ha="center", va="center", fontsize=7,
                color=DIM, linespacing=1.5)
        # step number circle
        circ = plt.Circle((x, 3.5), 0.25, color=LEAF if i > 0 else SURF2,
                          zorder=5, linewidth=1.2,
                          ec=HAIR if i == 0 else LEAF)
        ax.add_patch(circ)
        lbl = "✓" if i == 0 else str(i)
        ax.text(x, 3.5, lbl, ha="center", va="center", fontsize=8,
                fontweight="bold", color=BG if i > 0 else TEXT, zorder=6)
        if i < len(steps) - 1:
            ax.annotate("", xy=(xs[i+1] - 0.88, 2.0), xytext=(x + 0.88, 2.0),
                        arrowprops=dict(arrowstyle="-|>", color=HAIR, lw=1.2))

    # required/optional labels
    ax.text(9.0, 0.5, "★ optional — skippable", ha="center", fontsize=7.5,
            color=AMBER)
    ax.set_xlim(0, 12); ax.set_ylim(0.2, 4)
    ax.set_title("Lumen — Step Wizard Flow (maxReachable enforced in App.tsx)",
                 color=TEXT, fontsize=11, fontweight="bold", pad=8)
    save("02_wizard_flow.png")

# ============================================================
# 03 — Lux Calibration
# ============================================================
def diagram_calibration():
    f, ax = plt.subplots(figsize=(9, 6), facecolor=BG)
    ax.set_facecolor(SURF); ax.tick_params(colors=DIM)
    for s in ax.spines.values(): s.set_color(HAIR)

    np.random.seed(42)
    phone = np.linspace(200, 6000, 60)
    ref   = 1.1054 * phone + 134.4 + np.random.normal(0, 120, len(phone))
    ax.scatter(phone, ref, color=MINT, alpha=0.55, s=18, label="Field pair (simulated)")

    # Calibration line
    px = np.linspace(0, 6500, 100)
    ax.plot(px, 1.1054 * px + 134.4, color=LEAF, lw=2,
            label="Fit: calibrated = 1.1054 × phone + 134.4  (R²=0.993)")

    # Range guard shading
    ax.axvspan(0, 200, color=CORAL, alpha=0.12, label="Below 200 lx — range guard (return raw)")
    ax.axvspan(6000, 6500, color=AMBER, alpha=0.12, label="Above 6000 lx — extrapolation zone")
    ax.axvline(200,  color=CORAL, lw=1.2, ls="--")
    ax.axvline(6000, color=AMBER, lw=1.2, ls="--")

    # Annotate the 15 lx artefact
    ax.annotate("15 lx raw → 151 lx\nwithout guard\n(WRONG)", xy=(200, 1.1054*200+134.4),
                xytext=(500, 250),
                arrowprops=dict(arrowstyle="->", color=CORAL, lw=1),
                fontsize=8, color=CORAL)

    ax.set_xlabel("Phone reading (lux — raw)", color=DIM, fontsize=10)
    ax.set_ylabel("Reference meter (lux — calibrated)", color=DIM, fontsize=10)
    ax.set_title("Lux Calibration: Samsung S21+ vs UT383 Reference Meter\n210-pair validation, Apr–May 2026",
                 color=TEXT, fontsize=11, fontweight="bold")
    ax.legend(fontsize=8, facecolor=SURF2, edgecolor=HAIR, labelcolor=TEXT)
    ax.tick_params(labelcolor=DIM)
    save("03_calibration.png")

# ============================================================
# 04 — Light Fit Score Curve
# ============================================================
def diagram_light_fit():
    f, ax = plt.subplots(figsize=(9, 6), facecolor=BG)
    ax.set_facecolor(SURF); ax.tick_params(colors=DIM)
    for s in ax.spines.values(): s.set_color(HAIR)

    # Example plant: ZZ Plant, maint_min=300, pref_min=1000, pref_max=3000
    maint = 300; pref_min = 1000; pref_max = 3000
    lux = np.linspace(0, 4200, 400)

    def score(l):
        if l < maint:         return 0.0
        if l > pref_max:      return 0.7
        if l >= pref_min:     return 1.0
        return 0.6 + 0.4 * ((l - maint) / (pref_min - maint))

    scores = [score(l) for l in lux]

    ax.fill_between(lux, 0, scores, alpha=0.15, color=LEAF)
    ax.plot(lux, scores, color=LEAF, lw=2.5)

    # Annotations
    ax.axvline(maint, color=CORAL, lw=1.2, ls="--")
    ax.axvline(pref_min, color=AMBER, lw=1.2, ls="--")
    ax.axvline(pref_max, color=AMBER, lw=1.2, ls="--")
    ax.text(maint, -0.07, f"Survival min\n{maint} lx", ha="center", fontsize=8, color=CORAL)
    ax.text(pref_min, -0.07, f"Preferred min\n{pref_min} lx", ha="center", fontsize=8, color=AMBER)
    ax.text(pref_max, -0.07, f"Preferred max\n{pref_max} lx", ha="center", fontsize=8, color=AMBER)

    # Zone labels
    ax.text(150,  0.5, "ELIMINATED\n(score = 0)", ha="center", fontsize=8, color=CORAL)
    ax.text(650,  0.75, "Survival zone\n0.6 → 1.0 ramp", ha="center", fontsize=8, color=DIM)
    ax.text(2000, 1.05, "Preferred zone\nscore = 1.0", ha="center", fontsize=8, color=MINT)
    ax.text(3700, 0.75, "Excess zone\nscore = 0.7", ha="center", fontsize=8, color=AMBER)

    ax.axhline(0.7, color=AMBER, lw=0.8, ls=":", alpha=0.6)
    ax.axhline(1.0, color=LEAF,  lw=0.8, ls=":", alpha=0.6)

    ax.set_xlim(-100, 4200); ax.set_ylim(-0.18, 1.18)
    ax.set_xlabel("Measured spot lux (calibrated)", color=DIM, fontsize=10)
    ax.set_ylabel("Light fit sub-score [0, 1]", color=DIM, fontsize=10)
    ax.set_title("Light Fit Score — Piecewise Function (example: ZZ Plant)\nCode: lightFitScore() in src/engine/lightFit.ts",
                 color=TEXT, fontsize=11, fontweight="bold")
    ax.tick_params(labelcolor=DIM)
    save("04_light_fit.png")

# ============================================================
# 05 — Gate Logic Flowchart
# ============================================================
def diagram_gates():
    f, ax = plt.subplots(figsize=(10, 8), facecolor=BG)
    ax.set_facecolor(BG); ax.axis("off")

    def box(ax, x, y, text, color=SURF2, w=2.8, h=0.55, ec=HAIR):
        r = FancyBboxPatch((x - w/2, y - h/2), w, h,
                           boxstyle="round,pad=0.06", linewidth=1.2,
                           edgecolor=ec, facecolor=color)
        ax.add_patch(r)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=9, fontweight="bold", color=TEXT)

    def diamond(ax, x, y, text):
        dx, dy = 1.7, 0.5
        d = plt.Polygon([[x, y+dy],[x+dx, y],[x, y-dy],[x-dx, y]],
                        closed=True, facecolor="#23231A", edgecolor=AMBER, lw=1.5)
        ax.add_patch(d)
        ax.text(x, y, text, ha="center", va="center",
                fontsize=8.5, fontweight="bold", color=AMBER)

    def arr(ax, x1,y1,x2,y2,col=HAIR,lbl=""):
        ax.annotate("", xy=(x2,y2), xytext=(x1,y1),
                    arrowprops=dict(arrowstyle="-|>", color=col, lw=1.3))
        if lbl:
            mx, my = (x1+x2)/2, (y1+y2)/2
            ax.text(mx+0.08, my, lbl, fontsize=8, color=col)

    # Start
    box(ax, 5, 7.3, "Plant from database (one of 31)", SURF2, w=3.5)
    box(ax, 5, 6.5, "SpotInput: lux (calibrated), distance, sun hours", SURF2, w=4.0)
    arr(ax, 5, 7.0, 5, 6.78)
    arr(ax, 5, 6.22, 5, 5.8)

    # Gate 1
    diamond(ax, 5, 5.5, "spot.lux < plant.maintenance_lux_min?")
    arr(ax, 5, 5.0, 5, 4.5, CORAL, "YES")
    box(ax, 5, 4.2, "ELIMINATED: light too low\ngateReason explains lux gap", CORAL, w=3.8, ec=CORAL)

    # Gate 1 no branch
    arr(ax, 6.7, 5.5, 8.5, 5.5, LEAF, "NO →")
    diamond(ax, 5, 3.5, "plant.direct_sun_tolerance == 'none'\nAND spot has direct sun?")
    # link from gate 1 NO back down
    ax.annotate("", xy=(5, 3.85), xytext=(5, 4.98),
                arrowprops=dict(arrowstyle="-|>", color=LEAF, lw=1.3))

    arr(ax, 5, 3.0, 5, 2.5, CORAL, "YES")
    box(ax, 5, 2.2, "ELIMINATED: would scorch\ndirect sun + no-tolerance plant", CORAL, w=3.8, ec=CORAL)

    arr(ax, 6.7, 3.5, 8.5, 3.5, LEAF, "NO →")
    box(ax, 8.5, 3.5, "PASSES gates\n→ enter SCORING", "#1A3D28", w=2.5, ec=LEAF)

    ax.text(5, 1.5,
            "Gate policy: lux floor + direct-sun only (CLAUDE.md §2.4)\n"
            "Window orientation is deliberately NOT a gate — only a scoring factor",
            ha="center", fontsize=8.5, color=DIM, style="italic")

    ax.set_xlim(0.5, 10.5); ax.set_ylim(1.0, 7.8)
    ax.set_title("Recommendation Engine — Gate Logic (applyGates() in src/engine/gates.ts)",
                 color=TEXT, fontsize=11, fontweight="bold", pad=10)
    save("05_gate_logic.png")

# ============================================================
# 06 — Weighted Score Calculation
# ============================================================
def diagram_scoring():
    f, ax = plt.subplots(figsize=(11, 6.5), facecolor=BG)
    ax.set_facecolor(BG); ax.axis("off")

    # Left: four factor boxes
    factors = [
        ("Light Fit", 0.30, 0.88, LEAF,  "lightFitScore(lux, plant)\npiecewise 0 → 1"),
        ("Sun Comfort", 0.25, 0.72, AMBER, "directSunFactor(spot, plant)\ntolerance × estimated hours"),
        ("Distance Fit", 0.25, 0.95, MINT, "distanceFactor(spot, plant)\nzone × plant-light-class matrix"),
        ("Evidence Quality", 0.20, 1.00, "#B07D2A", "confidenceFactor(plant)\nhigh=1.0 / medium=0.7 / low=0.45"),
    ]
    ys = [5.1, 3.8, 2.5, 1.2]
    for (name, wt, val, col, note), y in zip(factors, ys):
        # factor box
        r = FancyBboxPatch((0.3, y-0.38), 3.2, 0.76,
                           boxstyle="round,pad=0.06", linewidth=1.3,
                           edgecolor=col, facecolor=SURF2)
        ax.add_patch(r)
        ax.text(0.9, y+0.13, name, fontsize=10, fontweight="bold", color=col, va="center")
        ax.text(0.9, y-0.16, note, fontsize=7.5, color=DIM, va="center")
        # weight badge
        ax.text(3.2, y, f"wt = {wt:.2f}", ha="center", va="center",
                fontsize=9, fontweight="bold", color=TEXT,
                bbox=dict(boxstyle="round,pad=0.25", facecolor=col, alpha=0.3, edgecolor=col))
        # score value bar
        bx = FancyBboxPatch((3.6, y-0.13), val * 1.5, 0.26,
                            boxstyle="round,pad=0.02", linewidth=0,
                            facecolor=col, alpha=0.7)
        ax.add_patch(bx)
        ax.text(3.65 + val*1.5, y, f"  {val:.2f}", va="center", fontsize=8.5,
                color=col, fontweight="bold")
        # arrow to sum
        ax.annotate("", xy=(6.3, 3.3), xytext=(3.8 + val*1.5*0.5, y),
                    arrowprops=dict(arrowstyle="-|>", color=col, lw=1.0,
                                   connectionstyle="arc3,rad=0.05"), alpha=0.5)

    # weighted sum formula box
    r2 = FancyBboxPatch((6.3, 2.3), 2.5, 1.9,
                        boxstyle="round,pad=0.08", linewidth=1.5,
                        edgecolor=LEAF, facecolor="#1A3D28")
    ax.add_patch(r2)
    ax.text(7.55, 4.05, "Weighted Sum", ha="center", fontsize=10, fontweight="bold", color=MINT)
    formula = (
        "score = ( light×0.30\n"
        "       + sun×0.25\n"
        "       + dist×0.25\n"
        "       + conf×0.20 )\n"
        "  ÷ sum(available weights)"
    )
    ax.text(7.55, 3.1, formula, ha="center", fontsize=8.5, color=TEXT,
            family="monospace", linespacing=1.6)

    # Example result
    wt_sum = 0.30 + 0.25 + 0.25 + 0.20
    score  = (0.88*0.30 + 0.72*0.25 + 0.95*0.25 + 1.00*0.20) / wt_sum
    ax.annotate("", xy=(9.3, 3.3), xytext=(8.8, 3.3),
                arrowprops=dict(arrowstyle="-|>", color=LEAF, lw=1.5))
    r3 = FancyBboxPatch((9.3, 2.3), 2.2, 1.9,
                        boxstyle="round,pad=0.08", linewidth=1.5,
                        edgecolor=MINT, facecolor=SURF2)
    ax.add_patch(r3)
    ax.text(10.4, 3.9, "Final Score", ha="center", fontsize=10, fontweight="bold", color=MINT)
    ax.text(10.4, 3.35, f"{score*100:.1f}", ha="center", fontsize=34, fontweight="bold", color=LEAF)
    ax.text(10.4, 2.65, "/ 100", ha="center", fontsize=12, color=DIM)

    ax.text(5.0, 0.4,
            "If an input is not captured (e.g. no GPS so SPA skipped), that factor's weight is dropped\n"
            "and the remaining weights are renormalised, so partial captures still score honestly.",
            ha="center", fontsize=8.5, color=DIM, style="italic")

    ax.set_xlim(0, 12.0); ax.set_ylim(0, 6.2)
    ax.set_title("Weighted Scoring — scorePlant() in src/engine/scoring.ts\n(Example: Snake Plant at a 3,200 lx near-window spot with 1h sun)",
                 color=TEXT, fontsize=11, fontweight="bold", pad=10)
    save("06_scoring.png")

# ============================================================
# 07 — SPA: Solar Position to Direct Sun Hours
# ============================================================
def diagram_spa():
    f, axes = plt.subplots(1, 2, figsize=(12, 6), facecolor=BG)

    # LEFT: azimuth/elevation sun path
    ax = axes[0]; ax.set_facecolor(SURF); ax.tick_params(colors=DIM)
    for s in ax.spines.values(): s.set_color(HAIR)

    # simulate sun path for a summer day in Malaysia (lat ~3.1)
    lat = 3.1; lon = 101.7
    import datetime
    t0 = datetime.datetime(2026, 6, 21, 0, 0, 0)

    azs, els, ts = [], [], []
    for m in range(0, 1440, 5):
        t = t0 + datetime.timedelta(minutes=m)
        epoch = t.timestamp() * 1000
        # NOAA quick calc (same equations as solar.ts)
        jd = epoch / 86400000 + 2440587.5
        T = (jd - 2451545.0) / 36525
        L0 = ((280.46646 + T*(36000.76983 + T*0.0003032)) % 360 + 360) % 360
        M = 357.52911 + T*(35999.05029 - 0.0001537*T)
        e = 0.016708634 - T*(0.000042037 + 0.0000001267*T)
        C = (math.sin(math.radians(M))*(1.914602-T*(0.004817+0.000014*T))
            + math.sin(math.radians(2*M))*(0.019993-0.000101*T)
            + math.sin(math.radians(3*M))*0.000289)
        omega = 125.04 - 1934.136*T
        lam = L0 + C - 0.00569 - 0.00478*math.sin(math.radians(omega))
        eps0 = 23+(26+(21.448-T*(46.815+T*(0.00059-T*0.001813)))/60)/60
        eps = eps0 + 0.00256*math.cos(math.radians(omega))
        decl = math.degrees(math.asin(min(1,max(-1,math.sin(math.radians(eps))*math.sin(math.radians(lam))))))
        y2 = math.tan(math.radians(eps/2))**2
        eot = 4*math.degrees(y2*math.sin(math.radians(2*L0)) - 2*e*math.sin(math.radians(M))
              + 4*e*y2*math.sin(math.radians(M))*math.cos(math.radians(2*L0))
              - 0.5*y2*y2*math.sin(math.radians(4*L0)) - 1.25*e*e*math.sin(math.radians(2*M)))
        utcM = m
        tst = ((utcM + eot + 4*lon) % 1440 + 1440) % 1440
        ha = tst/4 - 180
        cosZ = (math.sin(math.radians(lat))*math.sin(math.radians(decl))
               + math.cos(math.radians(lat))*math.cos(math.radians(decl))*math.cos(math.radians(ha)))
        cosZ = min(1,max(-1,cosZ))
        zen = math.acos(cosZ)
        el = 90 - math.degrees(zen)
        sinZ = math.sin(zen)
        if abs(sinZ) < 1e-6: az = 180
        else:
            azA = math.degrees(math.acos(min(1,max(-1,(math.sin(math.radians(lat))*cosZ - math.sin(math.radians(decl)))/(math.cos(math.radians(lat))*sinZ)))))
            az = (azA+180)%360 if ha>0 else (540-azA)%360
        if el > 0:
            azs.append(az); els.append(el); ts.append(m)

    sc = ax.scatter(azs, els, c=ts, cmap="YlOrRd", s=12, alpha=0.8, zorder=3)
    ax.axhline(3, color=CORAL, lw=1.2, ls="--", label="Min elevation = 3° (DIRECT_SUN_PARAMS)")
    ax.axvspan(270-90, 270+90, color=AMBER, alpha=0.08)
    ax.text(270, 5, "West window\n±90° window", ha="center", fontsize=8, color=AMBER)
    ax.set_xlabel("Sun azimuth — degrees from true north", color=DIM, fontsize=9)
    ax.set_ylabel("Sun elevation (degrees above horizon)", color=DIM, fontsize=9)
    ax.set_title("Sun Path — KL Summer Solstice\n(solarPosition() samples every 5 min)", color=TEXT, fontsize=9, fontweight="bold")
    ax.legend(fontsize=7.5, facecolor=SURF2, edgecolor=HAIR, labelcolor=TEXT)
    ax.tick_params(labelcolor=DIM)
    cb = plt.colorbar(sc, ax=ax, pad=0.02)
    cb.set_label("Time of day (mins from midnight)", color=DIM, fontsize=7)
    cb.ax.tick_params(labelcolor=DIM)

    # RIGHT: aperture geometry diagram
    ax2 = axes[1]; ax2.set_facecolor(SURF); ax2.axis("off")
    ax2.set_xlim(-0.5, 5); ax2.set_ylim(-0.2, 4.5)

    # Wall
    wall_x = 3.5
    ax2.fill_betweenx([0, 4.2], [wall_x], [wall_x+0.15], color="#2A2A1A", alpha=0.8)
    # Window opening
    sill, head = 0.8, 3.0
    w_half = 0.7
    ax2.add_patch(patches.Rectangle((wall_x, sill), 0.15, head-sill,
                                    facecolor="#1A3D50", edgecolor=MINT, lw=1.5))
    ax2.text(wall_x+0.5, (sill+head)/2, "window", ha="left", va="center",
             fontsize=8, color=MINT, rotation=90)

    # Plant
    ax2.plot([0.5], [0.4], "^", color=LEAF, ms=18, zorder=5)
    ax2.text(0.5, 0.0, "plant spot", ha="center", fontsize=8, color=LEAF)

    # Distance
    ax2.annotate("", xy=(wall_x, 0.4), xytext=(0.9, 0.4),
                arrowprops=dict(arrowstyle="<->", color=DIM, lw=1.2))
    ax2.text((0.9+wall_x)/2, 0.55, "d = distanceM", ha="center", fontsize=8, color=DIM)

    # Sun beam (downward at angle)
    alpha_deg = 35
    dx = 2.5; dy = dx * math.tan(math.radians(alpha_deg))
    beam_top = head - 0.1
    ax2.annotate("", xy=(0.5, beam_top - dy),
                 xytext=(wall_x, beam_top),
                 arrowprops=dict(arrowstyle="-|>", color=AMBER, lw=2.0))
    ax2.text(1.6, 3.2, f"sun ray  α = {alpha_deg}°", ha="center",
             fontsize=8.5, color=AMBER, fontweight="bold")
    ax2.text(wall_x-0.1, head+0.08, "head topM", ha="right", fontsize=7.5, color=DIM)
    ax2.text(wall_x-0.1, sill-0.1, "sill sillM", ha="right", fontsize=7.5, color=DIM)

    # Half-angle cone
    d_real = wall_x - 0.5
    half_ang = math.degrees(math.atan(w_half / d_real))
    ax2.annotate("", xy=(wall_x, (sill+head)/2 + w_half),
                 xytext=(0.5, 0.4),
                 arrowprops=dict(arrowstyle="-", color=FAINT, lw=0.8, ls="dashed"))
    ax2.annotate("", xy=(wall_x, (sill+head)/2 - w_half),
                 xytext=(0.5, 0.4),
                 arrowprops=dict(arrowstyle="-", color=FAINT, lw=0.8, ls="dashed"))
    ax2.text(1.8, 1.4, f"half-angle\natan(W/2 / d)\n+ 6° margin", ha="center",
             fontsize=7.5, color=FAINT)

    ax2.set_title("Aperture Geometry — estimateDirectSunThroughAperture()\n"
                  "Two tests per 5-min sample: azimuth cone + vertical band",
                  color=TEXT, fontsize=9, fontweight="bold")

    f.suptitle("Solar Position Algorithm (SPA) — src/sun/solar.ts", color=TEXT,
               fontsize=12, fontweight="bold", y=1.01)
    plt.tight_layout()
    save("07_spa.png")

# ============================================================
# 08 — Plateau Detection
# ============================================================
def diagram_plateau():
    f, ax = plt.subplots(figsize=(10, 5.5), facecolor=BG)
    ax.set_facecolor(SURF); ax.tick_params(colors=DIM)
    for s in ax.spines.values(): s.set_color(HAIR)

    np.random.seed(7)
    t = np.arange(0, 10001, 100) / 1000.0  # 0–10 s at 10 Hz

    # Simulate a sensor stream: settling → stable plateau → slight shift
    stream = []
    for ti in t:
        if ti < 1.5:
            stream.append(2000 + np.random.normal(0, 250))   # noisy settle
        elif ti < 6.5:
            stream.append(2800 + np.random.normal(0, 40))    # stable plateau
        elif ti < 7.0:
            stream.append(2800 + np.random.normal(0, 300))   # brief movement
        else:
            stream.append(3100 + np.random.normal(0, 50))    # new level
    stream = np.array(stream)

    ax.plot(t, stream, color=DIM, lw=1.0, alpha=0.7, label="Raw sensor stream (10 Hz grid)")

    # Highlight the chosen longest plateau
    ax.axvspan(1.5, 6.5, color=LEAF, alpha=0.12, label="Longest stable plateau (5 s)")
    ax.axhline(2800, color=LEAF, lw=1.5, ls="--", label="Plateau median → 2,800 lx (raw phone lux)")
    ax.axhline(1.1054*2800+134.4, color=MINT, lw=1.5, ls="--",
               label=f"After calibration → {round(1.1054*2800+134.4):,} lx (engine uses this)")

    # Tolerance band
    tol = max(0.10 * 2800, 30)
    ax.fill_between([1.5, 6.5], [2800-tol, 2800-tol], [2800+tol, 2800+tol],
                    color=LEAF, alpha=0.09)
    ax.text(4.0, 2800+tol+30, "± max(10%, 30 lx) tolerance band", ha="center",
            fontsize=7.5, color=LEAF, alpha=0.9)

    # Annotations
    ax.text(0.75, 2100, "settling\n(skipped)", ha="center", fontsize=8, color=CORAL)
    ax.text(4.0, 2600, "CHOSEN PLATEAU", ha="center", fontsize=9,
            fontweight="bold", color=LEAF)
    ax.text(8.5, 3200, "shift → new\nsegment", ha="center", fontsize=8, color=AMBER)

    # Reject criteria note (Round 5)
    ax.text(0.1, 1470,
            "Reject → retry if no plateau ≥ 1 s (minPlateauMs)  or  longest plateau\n"
            "covers < 35% of the 10 s capture (minCoverage = 0.35)",
            ha="left", va="bottom", fontsize=7.5, color=AMBER, style="italic")

    ax.set_xlabel("Capture time (seconds)", color=DIM, fontsize=10)
    ax.set_ylabel("Phone lux reading", color=DIM, fontsize=10)
    ax.set_title("Plateau-Median Lux Extraction — extractPlateauReading() in src/sensor/plateau.ts\n"
                 "Hold-last-value resample → segment → longest plateau → median",
                 color=TEXT, fontsize=11, fontweight="bold")
    ax.legend(fontsize=8.5, facecolor=SURF2, edgecolor=HAIR, labelcolor=TEXT, loc="lower right")
    ax.tick_params(labelcolor=DIM)
    ax.set_ylim(1400, 3600)
    save("08_plateau.png")

# ============================================================
# 09 — Distance Zone × Plant Class Matrix
# ============================================================
def diagram_distance_matrix():
    f, ax = plt.subplots(figsize=(7, 5), facecolor=BG)
    ax.set_facecolor(SURF)

    data = np.array([
        [1.0, 0.7, 0.4],   # near
        [0.7, 1.0, 0.7],   # mid
        [0.4, 0.7, 1.0],   # deep
    ])

    im = ax.imshow(data, cmap="YlGn", vmin=0.3, vmax=1.05, aspect="auto")
    ax.set_xticks([0,1,2]); ax.set_xticklabels(["High-light\nplant\n(maint≥5000 lx)", "Medium-light\nplant\n(maint 800–5000)", "Low-light\nplant\n(maint<800 lx)"], color=DIM, fontsize=9)
    ax.set_yticks([0,1,2]); ax.set_yticklabels(["Near\n(≤ 1.0 m)", "Mid\n(≤ 2.5 m)", "Deep\n(> 2.5 m)"], color=DIM, fontsize=9)
    ax.set_xlabel("Plant's light class (by maintenance_lux_min threshold)", color=DIM, fontsize=9)
    ax.set_ylabel("AR-measured distance zone", color=DIM, fontsize=9)

    for i in range(3):
        for j in range(3):
            ax.text(j, i, f"{data[i,j]:.1f}", ha="center", va="center",
                    fontsize=16, fontweight="bold",
                    color=BG if data[i,j] > 0.6 else TEXT)

    ax.set_title("Distance Factor Sub-score Matrix — ZONE_CLASS_FIT in src/engine/scoring.ts\n"
                 "Diagonal = perfect match; off-diagonal = zone/class mismatch penalty",
                 color=TEXT, fontsize=10, fontweight="bold", pad=8)

    cb = plt.colorbar(im, ax=ax, pad=0.02, fraction=0.035)
    cb.set_label("Sub-score [0, 1]", color=DIM, fontsize=8)
    cb.ax.tick_params(labelcolor=DIM)
    ax.tick_params(colors=DIM)
    for s in ax.spines.values(): s.set_color(HAIR)
    save("09_distance_matrix.png")

# ============================================================
# 10 — End-to-End Example (SpotInput → Ranked Output)
# ============================================================
def diagram_e2e():
    f, ax = plt.subplots(figsize=(12, 5.5), facecolor=BG)
    ax.set_facecolor(BG); ax.axis("off")

    def box(x, y, title, body, col=SURF2, w=2.4, h=1.5):
        r = FancyBboxPatch((x-w/2, y-h/2), w, h,
                           boxstyle="round,pad=0.07", linewidth=1.2,
                           edgecolor=col, facecolor=SURF)
        ax.add_patch(r)
        ax.text(x, y+h/2-0.25, title, ha="center", va="center",
                fontsize=9, fontweight="bold", color=col)
        ax.text(x, y-0.1, body, ha="center", va="center",
                fontsize=7.5, color=DIM, linespacing=1.5)

    def arr(x1, y, x2):
        ax.annotate("", xy=(x2, y), xytext=(x1, y),
                    arrowprops=dict(arrowstyle="-|>", color=HAIR, lw=1.2))

    # Inputs
    box(1.3, 3.5, "RAW LUX", "phone reads 2,800 lx\nplateau median\n10 s capture", MINT)
    box(1.3, 1.8, "AR DISTANCE", "0.7 m from window\nhorizontal plane\nARCore hit", LEAF)
    box(1.3, 0.1, "SPA SUN", "west window\n3.4 h direct sun\n(estimated potential)", AMBER)

    # Calibration
    arr(2.5, 3.5, 3.5)
    box(4.1, 3.5, "CALIBRATE", "1.1054×2800+134.4\n= 3,231 lx\n(validMin guard OK)", MINT)

    # Engine
    arr(5.3, 3.5, 6.3)
    arr(2.5, 1.8, 6.3)
    arr(2.5, 0.1, 6.3)

    box(7.1, 2.1, "GATE CHECK", "lux 3,231 > maint 300? OK\ndirect sun + tolerance?\nPASS for 28/31 plants", CORAL, h=1.5)
    arr(8.0, 2.1, 9.0)

    box(9.8, 3.5, "LIGHT FIT\n0.30×0.95", "3,231 in preferred range\nof chosen plant\nScore: 95/100", MINT, h=1.2)
    box(9.8, 2.0, "SUN FACTOR\n0.25×0.72", "3.4 h > some limit 3h\nbut within tolerance\nScore: 72/100", AMBER, h=1.2)
    box(9.8, 0.5, "DIST FACTOR\n0.25×1.00", "0.7 m = near zone\nhigh-light plant\nnear = 1.00", LEAF, h=1.2)

    # Final score
    score = (0.30*0.95 + 0.25*0.72 + 0.25*1.00 + 0.20*1.00) / 1.0
    arr(11.0, 2.0, 11.6)
    r = FancyBboxPatch((11.6, 0.8), 2.2, 2.5,
                       boxstyle="round,pad=0.08", linewidth=1.8,
                       edgecolor=LEAF, facecolor="#1A3D28")
    ax.add_patch(r)
    ax.text(12.7, 3.1, "FINAL", ha="center", fontsize=9, color=MINT, fontweight="bold")
    ax.text(12.7, 2.4, f"{score*100:.0f}", ha="center", fontsize=36, color=LEAF, fontweight="bold")
    ax.text(12.7, 1.5, "/ 100", ha="center", fontsize=12, color=DIM)
    ax.text(12.7, 1.0, "Rank #1", ha="center", fontsize=9, color=LEAF, fontweight="bold")

    ax.set_xlim(0, 14); ax.set_ylim(-0.6, 4.8)
    ax.set_title("End-to-End Example: SpotInput → recommend() → Ranked Output",
                 color=TEXT, fontsize=12, fontweight="bold", pad=10)
    save("10_e2e_example.png")

# ── run all ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating Lumen Technical Report diagrams...")
    diagram_architecture()
    diagram_wizard()
    diagram_calibration()
    diagram_light_fit()
    diagram_gates()
    diagram_scoring()
    diagram_spa()
    diagram_plateau()
    diagram_distance_matrix()
    diagram_e2e()
    print(f"\nAll diagrams written to {OUT}/")
