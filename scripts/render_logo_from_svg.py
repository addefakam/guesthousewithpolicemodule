"""
Render the organization logo SVG to a high-resolution transparent PNG.

SVG source: /home/z/my-project/upload/orpimag.svg
  - 111KB SVG file
  - 715×725 pt viewBox
  - fill="#000000" (black paths) on transparent background
  - Circular emblem with "Poolisii Oromiyaa" text and a star center

Output: /home/z/my-project/guesthousewithpolicemodule/public/fonts/orompolice.png
  - 800×800 px (high-res for crisp PDF embedding)
  - RGBA with transparent background
  - Black paths preserved as-is (vector → raster at high DPI)

Run:  python3 /home/z/my-project/scripts/render_logo_from_svg.py
"""

import cairosvg
from pathlib import Path

SRC = "/home/z/my-project/upload/orpimag.svg"
DST = "/home/z/my-project/guesthousewithpolicemodule/public/fonts/orompolice.png"

# Render at high resolution — 800px is plenty for a corner badge
# that renders at ~72pt (1pt = 1.33px @96dpi, so 72pt = ~96px displayed,
# 800px source = ~8x headroom for crisp rendering).
OUTPUT_SIZE = 800

def main():
    Path(DST).parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        url=SRC,
        write_to=DST,
        output_width=OUTPUT_SIZE,
        output_height=OUTPUT_SIZE,
    )
    size = Path(DST).stat().st_size
    print(f"[OK] Rendered SVG → PNG")
    print(f"  Source: {SRC}")
    print(f"  Output: {DST}")
    print(f"  Size: {OUTPUT_SIZE}x{OUTPUT_SIZE} px, {size} bytes ({size/1024:.1f} KB)")

if __name__ == "__main__":
    main()
