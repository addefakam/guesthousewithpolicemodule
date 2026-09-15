"""
Render the organization logo SVG directly to a transparent PNG.

No post-processing, no color modifications, no dilation, no smoothing.
Just a clean high-resolution render of the SVG as-is.

The SVG is the source of truth — we render it at high resolution
(1000×1000 px) so it stays crisp at any zoom level when embedded
into the PDF certificate.

Run:  python3 scripts/render_logo_from_svg.py
"""

import cairosvg
from pathlib import Path

SRC = "/home/z/my-project/upload/orpimag.svg"
DST = "/home/z/my-project/guesthousewithpolicemodule/public/fonts/orompolice.png"

# High-resolution render — 1000px gives plenty of headroom for crisp
# display at the corner badge size (~60pt = ~80px displayed).
OUTPUT_SIZE = 1000

def main():
    Path(DST).parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        url=SRC,
        write_to=DST,
        output_width=OUTPUT_SIZE,
        output_height=OUTPUT_SIZE,
    )
    size = Path(DST).stat().st_size
    print(f"[OK] Rendered SVG → PNG (clean, no post-processing)")
    print(f"  Source: {SRC}")
    print(f"  Output: {DST}")
    print(f"  Size: {OUTPUT_SIZE}x{OUTPUT_SIZE} px, {size} bytes ({size/1024:.1f} KB)")

if __name__ == "__main__":
    main()
