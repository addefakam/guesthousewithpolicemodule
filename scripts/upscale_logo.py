"""
Upscale the organization logo to higher resolution for cleaner PDF embedding.

The source image (orompolice.jfif) is only 158×148 pixels — too low-res
to look crisp when scaled up to fill the corner badge in the certificate.

This script:
  1. Loads the original transparent PNG (output of process_logo_transparency.py)
  2. Upscales 4× using Lanczos resampling (best quality for photographs/
     detailed artwork; preserves edges better than bilinear/bicubic)
  3. Applies slight unsharp masking to recover detail lost in upscaling
  4. Saves as the same orompolice.png (overwrites the low-res version)

Result: ~628×592 px PNG, much crisper when embedded into the PDF.

Run:  python3 /home/z/my-project/scripts/upscale_logo.py
"""

from PIL import Image, ImageFilter
import numpy as np
from pathlib import Path

SRC = "/home/z/my-project/guesthousewithpolicemodule/public/fonts/orompolice.png"
SCALE = 4  # 4× upscale

def main():
    img = Image.open(SRC).convert("RGBA")
    print(f"[1] Loaded: {img.size}, mode={img.mode}")

    # Step 1: Lanczos upscale
    new_size = (img.size[0] * SCALE, img.size[1] * SCALE)
    upscaled = img.resize(new_size, Image.LANCZOS)
    print(f"[2] Upscaled to: {upscaled.size} (Lanczos)")

    # Step 2: Unsharp mask to recover detail
    # Split into RGB + alpha, sharpen only RGB
    r, g, b, a = upscaled.split()
    rgb = Image.merge("RGB", (r, g, b))
    # Unsharp mask: radius=1, percent=120, threshold=2
    rgb_sharp = rgb.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=2))
    r2, g2, b2 = rgb_sharp.split()
    final = Image.merge("RGBA", (r2, g2, b2, a))
    print(f"[3] Applied unsharp mask (radius=1, percent=120, threshold=2)")

    # Step 3: Save (overwrite)
    final.save(SRC, "PNG", optimize=True)
    final_size = Path(SRC).stat().st_size
    print(f"[4] Saved: {SRC}")
    print(f"    Size: {final.size[0]}x{final.size[1]} px, {final_size} bytes")

if __name__ == "__main__":
    main()
