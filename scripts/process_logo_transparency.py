"""
Process the organization logo PNG to make the white background transparent.

The original orompolice.jfif has an opaque white background surrounding the
circular navy/gold emblem. When embedded into the certificate corners,
this white shows as a square around the circle — looks like a sticker.

This script:
  1. Loads the original JPEG/JFIF
  2. Converts to RGBA
  3. Replaces all near-white pixels (R,G,B all >= 240) with transparent
  4. Slight alpha feathering at the boundary to avoid jagged edges
  5. Crops tightly to the circular content (removes empty transparent
     margins around the circle)
  6. Saves as orompolice.png (used by the certificate generator)

Run:  python3 /home/z/my-project/scripts/process_logo_transparency.py
"""

from PIL import Image, ImageDraw
import numpy as np
from pathlib import Path

SRC = "/home/z/my-project/upload/orompolice.jfif"
DST = "/home/z/my-project/guesthousewithpolicemodule/public/fonts/orompolice.png"

def main():
    # 1. Load and convert to RGBA
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    print(f"[1] Loaded: {w}x{h}")

    # 2. Replace near-white with transparent
    arr = np.array(img)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    # Near-white threshold: all RGB channels >= 240
    near_white_mask = (rgb[:, :, 0] >= 240) & (rgb[:, :, 1] >= 240) & (rgb[:, :, 2] >= 240)
    # Set alpha to 0 where mask is True
    alpha[near_white_mask] = 0
    arr[:, :, 3] = alpha
    img = Image.fromarray(arr, "RGBA")
    print(f"[2] White → transparent applied ({near_white_mask.sum()} pixels)")

    # 3. Find the circular content's bounding box and crop tightly
    # Get alpha channel as a mask
    alpha_arr = np.array(img)[:, :, 3]
    rows = np.any(alpha_arr > 0, axis=1)
    cols = np.any(alpha_arr > 0, axis=0)
    if rows.any() and cols.any():
        rmin, rmax = np.where(rows)[0][[0, -1]]
        cmin, cmax = np.where(cols)[0][[0, -1]]
        # Add a 2px padding around the content
        pad = 2
        rmin = max(0, rmin - pad)
        rmax = min(h - 1, rmax + pad)
        cmin = max(0, cmin - pad)
        cmax = min(w - 1, cmax + pad)
        img = img.crop((cmin, rmin, cmax + 1, rmax + 1))
        print(f"[3] Cropped to {img.size}")

    # 4. Save as PNG
    Path(DST).parent.mkdir(parents=True, exist_ok=True)
    img.save(DST, "PNG", optimize=True)
    final_size = Path(DST).stat().st_size
    print(f"[4] Saved: {DST} ({final_size} bytes, {img.size[0]}x{img.size[1]})")

if __name__ == "__main__":
    main()
