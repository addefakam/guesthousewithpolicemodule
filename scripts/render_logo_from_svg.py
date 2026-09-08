"""
Render the organization logo SVG to a transparent PNG with:
  - White fills (instead of black) so the logo reads cleanly on a navy
    certificate background
  - Solid shapes (no distressed look — the SVG paths naturally have
    slight texture from the path geometry, but we apply a slight
    morphological dilation to fill any tiny gaps and make edges solid)
  - Smaller output dimensions (500×500 px instead of 800×800) to
    reduce the embedded image file size

Run:  python3 scripts/render_logo_from_svg.py
"""

import cairosvg
from PIL import Image, ImageFilter
import numpy as np
import re
from pathlib import Path

SRC = "/home/z/my-project/upload/orpimag.svg"
DST = "/home/z/my-project/guesthousewithpolicemodule/public/fonts/orompolice.png"

# Render at moderate resolution — 500px is plenty for a corner badge
# that renders at ~60pt (1pt = 1.33px @96dpi, so 60pt = ~80px displayed,
# 500px source = ~6x headroom for crisp rendering).
# Render at very high resolution then downscale to OUTPUT_SIZE.
# The SVG was auto-traced from a raster image, so paths have naturally
# jagged edges. Rendering at 4× then downscaling with Lanczos averages
# out the jaggedness, producing clean smooth edges.
RENDER_SIZE = 2000   # render at 2000×2000 first
OUTPUT_SIZE = 500    # then downscale to 500×500

def main():
    # 1. Read the SVG as-is (black fills preserved per user request to
    #    undo the previous white-color change)
    with open(SRC, "r") as f:
        svg_content = f.read()
    print(f"[1] Using original SVG (black fills preserved)")

    # 2. Render the SVG at high resolution (2000×2000)
    Path(DST).parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        bytestring=svg_content.encode("utf-8"),
        write_to=DST,
        output_width=RENDER_SIZE,
        output_height=RENDER_SIZE,
    )
    print(f"[2] Rendered to {RENDER_SIZE}x{RENDER_SIZE} px (high-res)")

    # 3. Downscale to OUTPUT_SIZE using Lanczos resampling.
    #    This averages out the jagged path edges → clean smooth shapes.
    img = Image.open(DST).convert("RGBA")
    img = img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    print(f"[3] Downscaled to {OUTPUT_SIZE}x{OUTPUT_SIZE} px (Lanczos)")

    # 4. Dilate the alpha channel slightly to fill any remaining micro-gaps
    arr = np.array(img)
    alpha = arr[:, :, 3]
    binary = (alpha > 64).astype(np.uint8) * 255
    alpha_img = Image.fromarray(binary, "L")
    alpha_final = alpha_img.filter(ImageFilter.MaxFilter(size=3))
    arr[:, :, 3] = np.array(alpha_final)
    final = Image.fromarray(arr, "RGBA")
    print(f"[4] Applied dilation (MaxFilter 3x3) to fill micro-gaps")

    # 4. Save the final PNG
    final.save(DST, "PNG", optimize=True, compress_level=9)
    size = Path(DST).stat().st_size
    print(f"[4] Saved: {DST}")
    print(f"    Size: {final.size[0]}x{final.size[1]} px, {size} bytes ({size/1024:.1f} KB)")

if __name__ == "__main__":
    main()
