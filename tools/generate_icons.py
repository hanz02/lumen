"""Generate Android launcher icons for Lumen using Pillow only — no SVG libs needed.

Draws the LumenMark (sun + leaf) at 1024x1024, then resizes and writes
ic_launcher.png and ic_launcher_round.png into all five mipmap folders.

Run from the project root:
    python tools/generate_icons.py
"""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES  = os.path.join(ROOT, "android", "app", "src", "main", "res")

SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

# ── colours (matching LumenMark / theme.ts) ──────────────────────────────────
BG      = (11,  26, 17,  255)   # #0B1A11
MINT    = (169, 232, 195, 255)  # #A9E8C3  — sun + rays
LEAF_HI = (157, 235, 190, 255)  # #9DEBBE  — leaf gradient highlight
LEAF_LO = (62,  158,  99, 255)  # #3E9E63  — leaf gradient deep
MIDRIB  = (31,  85,  56,  128)  # #1F5538 @ 50% opacity

# ── scale helper (original viewBox 0 0 40 40 → 1024×1024) ──────────────────
S = 1024 / 40
def sc(v): return round(v * S)


def draw_icon(size=1024) -> Image.Image:
    scale = size / 1024
    img = Image.new("RGBA", (size, size), BG)
    d   = ImageDraw.Draw(img)

    def p(v): return round(v * scale)

    # ── sun disc ──────────────────────────────────────────────────────────────
    cx, cy, r = p(sc(11)), p(sc(11)), p(sc(4.2))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=MINT)

    # ── sun rays (thick rounded lines via wide ellipses at each endpoint) ─────
    ray_w = max(2, p(sc(1.8)))
    rays = [
        ((sc(11), sc(2.5)),  (sc(11), sc(5))),
        ((sc(2.5), sc(11)),  (sc(5),  sc(11))),
        ((sc(4.6), sc(4.6)), (sc(6.4), sc(6.4))),
        ((sc(17.4),sc(4.6)), (sc(15.6),sc(6.4))),
        ((sc(4.6),sc(17.4)), (sc(6.4),sc(15.6))),
    ]
    for (x1, y1), (x2, y2) in rays:
        x1, y1, x2, y2 = p(x1), p(y1), p(x2), p(y2)
        d.line([(x1, y1), (x2, y2)], fill=MINT, width=ray_w)
        cap_r = ray_w // 2
        for cx2, cy2 in [(x1, y1), (x2, y2)]:
            d.ellipse([cx2-cap_r, cy2-cap_r, cx2+cap_r, cy2+cap_r], fill=MINT)

    # ── leaf (Bézier approximated with a polygon) ─────────────────────────────
    # Original path: M32 12 C 32 26 24 34 10 34 C 10 20 18 12 32 12 Z
    # Approximate both cubic curves with 40 points each.
    def cubic_bezier(p0, p1, p2, p3, n=40):
        pts = []
        for i in range(n + 1):
            t = i / n
            u = 1 - t
            x = u**3*p0[0] + 3*u**2*t*p1[0] + 3*u*t**2*p2[0] + t**3*p3[0]
            y = u**3*p0[1] + 3*u**2*t*p1[1] + 3*u*t**2*p2[1] + t**3*p3[1]
            pts.append((p(round(x*scale)), p(round(y*scale))))
        return pts

    sc_ = lambda v: v * S  # raw scaled float

    curve1 = cubic_bezier(
        (sc_(32), sc_(12)), (sc_(32), sc_(26)),
        (sc_(24), sc_(34)), (sc_(10), sc_(34)),
    )
    curve2 = cubic_bezier(
        (sc_(10), sc_(34)), (sc_(10), sc_(20)),
        (sc_(18), sc_(12)), (sc_(32), sc_(12)),
    )
    leaf_poly = curve1 + curve2[1:]

    # Vertical gradient fill via horizontal scanlines
    ys = [pt[1] for pt in leaf_poly]
    y_min, y_max = min(ys), max(ys)
    span = max(1, y_max - y_min)
    leaf_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    leaf_d   = ImageDraw.Draw(leaf_img)
    leaf_d.polygon(leaf_poly, fill=LEAF_LO)
    # Overlay gradient bands
    for y in range(y_min, y_max + 1):
        t = (y - y_min) / span
        r2 = round(LEAF_HI[0] + t * (LEAF_LO[0] - LEAF_HI[0]))
        g2 = round(LEAF_HI[1] + t * (LEAF_LO[1] - LEAF_HI[1]))
        b2 = round(LEAF_HI[2] + t * (LEAF_LO[2] - LEAF_HI[2]))
        leaf_d.line([(0, y), (size, y)], fill=(r2, g2, b2, 0))
    # Re-draw polygon with gradient rows clipped to shape
    grad_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad_d   = ImageDraw.Draw(grad_img)
    for y in range(y_min, y_max + 1):
        t = (y - y_min) / span
        r2 = round(LEAF_HI[0] + t * (LEAF_LO[0] - LEAF_HI[0]))
        g2 = round(LEAF_HI[1] + t * (LEAF_LO[1] - LEAF_HI[1]))
        b2 = round(LEAF_HI[2] + t * (LEAF_LO[2] - LEAF_HI[2]))
        grad_d.line([(0, y), (size - 1, y)], fill=(r2, g2, b2, 255))
    # Mask gradient to leaf shape
    mask_img = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask_img).polygon(leaf_poly, fill=255)
    grad_img.putalpha(mask_img)
    img = Image.alpha_composite(img, grad_img)

    # ── midrib ────────────────────────────────────────────────────────────────
    d2 = ImageDraw.Draw(img)
    midrib = cubic_bezier(
        (sc_(14), sc_(30)), (sc_(19), sc_(24)),
        (sc_(25), sc_(18)), (sc_(30), sc_(15)),
    )
    midrib_scaled = [(p(round(x * scale)), p(round(y * scale)))
                     for x, y in [(sc_(14), sc_(30)), (sc_(19), sc_(24)),
                                  (sc_(25), sc_(18)), (sc_(30), sc_(15))]]
    midrib_pts = cubic_bezier(
        (sc_(14)*scale, sc_(30)*scale), (sc_(19)*scale, sc_(24)*scale),
        (sc_(25)*scale, sc_(18)*scale), (sc_(30)*scale, sc_(15)*scale),
    )
    mw = max(2, p(sc(1.6)))
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(len(midrib_pts) - 1):
        od.line([midrib_pts[i], midrib_pts[i+1]], fill=MIDRIB, width=mw)
    img = Image.alpha_composite(img, overlay)

    return img


def make_round(img: Image.Image) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = img.copy().convert("RGBA")
    out.putalpha(mask)
    return out


def main():
    print("Drawing LumenMark icon at 1024x1024 …")
    master = draw_icon(1024)
    master_path = os.path.join(ROOT, "icon.png")
    master.save(master_path, "PNG")
    print(f"  saved master -> icon.png")

    for folder, px in SIZES.items():
        dest = os.path.join(RES, folder)
        if not os.path.isdir(dest):
            print(f"  skip  {folder}/ — folder not found")
            continue

        resized = master.resize((px, px), Image.LANCZOS)
        resized.save(os.path.join(dest, "ic_launcher.png"), "PNG")
        make_round(resized).save(os.path.join(dest, "ic_launcher_round.png"), "PNG")
        print(f"  wrote {folder}/ic_launcher.png + ic_launcher_round.png ({px}px)")

    print("\nDone. Rebuild to pick up the new icons:")
    print("  cd android && .\\gradlew assembleDebug")


if __name__ == "__main__":
    main()
