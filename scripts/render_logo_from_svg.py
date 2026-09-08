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
OUTPUT_SIZE = 500

def main():
    # 1. Read the SVG and replace all fill="#000000" with fill="#ffffff"
    #    (so the logo is white instead of black)
    with open(SRC, "r") as f:
        svg_content = f.read()
    svg_white = re.sub(
        r'fill="#000000"',
        'fill="#ffffff"',
        svg_content,
    )
    print(f"[1] Replaced fill='#000000' with fill='#ffffff'")

    # 2. Render the modified SVG to a high-res RGBA PNG via cairosvg
    Path(DST).parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        bytestring=svg_white.encode("utf-8"),
        write_to=DST,
        output_width=OUTPUT_SIZE,
        output_height=OUTPUT_SIZE,
    )
    print(f"[2] Rendered to {OUTPUT_SIZE}x{OUTPUT_SIZE} px")

    # 3. Post-process: dilate the alpha channel slightly to fill any
    #    tiny gaps between paths (removes the "distressed" look)
    img = Image.open(DST).convert("RGBA")
    arr = np.array(img)
    alpha = arr[:, :, 3]

    # Threshold: treat any pixel with alpha > 64 as "filled"
    binary = (alpha > 64).astype(np.uint8) * 255

    # Dilate the binary mask by 1 pixel using PIL's MaxFilter
    alpha_img = Image.fromarray(binary, "L")
    alpha_dilated = alpha_img.filter(ImageFilter.MaxFilter(size=3))

    # Re-apply the dilated alpha to the original RGBA image
    arr[:, :, 3] = np.array(alpha_dilated)
    final = Image.fromarray(arr, "RGBA")
    print(f"[3] Applied dilation (MaxFilter 3x3) to fill micro-gaps")

    # 4. Save the final PNG
    final.save(DST, "PNG", optimize=True, compress_level=9)
    size = Path(DST).stat().st_size
    print(f"[4] Saved: {DST}")
    print(f"    Size: {final.size[0]}x{final.size[1]} px, {size} bytes ({size/1024:.1f} KB)")

if __name__ == "__main__":
    main()
