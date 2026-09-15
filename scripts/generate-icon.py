from PIL import Image, ImageDraw, ImageFont
import os, math

os.makedirs("public/m-icons", exist_ok=True)

def create_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded rectangle - emerald green
    margin = int(size * 0.06)
    corner_r = int(size * 0.2)

    # Draw green background
    for y in range(margin, size - margin):
        for x in range(margin, size - margin):
            # Check if inside rounded rectangle
            in_rect = True
            corners = [
                (margin + corner_r, margin + corner_r),
                (size - margin - corner_r, margin + corner_r),
                (margin + corner_r, size - margin - corner_r),
                (size - margin - corner_r, size - margin - corner_r),
            ]
            # Simple approach: just check bounds
            img.putpixel((x, y), (5, 150, 105, 255))

    # Actually let me use the built-in rounded_rectangle which works fine
    img2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img2)
    d.rounded_rectangle([margin, margin, size-margin-1, size-margin-1], radius=corner_r, fill=(5, 150, 105, 255))

    # Draw gradient overlay (subtle)
    for y in range(margin, size - margin):
        t = (y - margin) / (size - 2*margin)
        alpha = int(20 * t)  # subtle darkening at bottom
        d.line([(margin+1, y), (size-margin-2, y)], fill=(0, 0, 0, alpha))

    # Now draw the house on top
    cx = size / 2
    s = size / 100  # 1% of size

    # Roof (white triangle)
    roof = [
        (cx, cx - 20*s),           # peak
        (cx + 26*s, cx + 2*s),     # right
        (cx - 26*s, cx + 2*s),     # left
    ]
    d.polygon(roof, fill=(255, 255, 255, 255))

    # House body (white rounded rect)
    body_l = cx - 20*s
    body_t = cx + 2*s
    body_r = cx + 20*s
    body_b = cx + 26*s
    d.rounded_rectangle([body_l, body_t, body_r, body_b], radius=int(2*s), fill=(255, 255, 255, 235))

    # Door
    door_w = 8 * s
    door_l = cx - door_w/2
    door_t = cx + 12*s
    door_b = cx + 26*s
    d.rounded_rectangle([door_l, door_t, door_l + door_w, door_b], radius=int(1.5*s), fill=(4, 90, 65, 230))

    # Door knob
    kr = int(1.2 * s)
    kx = cx + 2 * s
    ky = cx + 19 * s
    d.ellipse([kx-kr, ky-kr, kx+kr, ky+kr], fill=(255, 255, 255, 200))

    # Left window
    ww = 8 * s
    wh = 7 * s
    gap = 3 * s
    wl = body_l + gap
    wt = cx + 5 * s
    d.rounded_rectangle([wl, wt, wl + ww, wt + wh], radius=int(1.2*s), fill=(4, 90, 65, 70))
    # Cross
    d.line([(wl + ww/2, wt), (wl + ww/2, wt + wh)], fill=(5, 150, 105, 40), width=max(1, int(s)))
    d.line([(wl, wt + wh/2), (wl + ww, wt + wh/2)], fill=(5, 150, 105, 40), width=max(1, int(s)))

    # Right window
    wr = body_r - gap
    d.rounded_rectangle([wr - ww, wt, wr, wt + wh], radius=int(1.2*s), fill=(4, 90, 65, 70))
    d.line([(wr - ww/2, wt), (wr - ww/2, wt + wh)], fill=(5, 150, 105, 40), width=max(1, int(s)))
    d.line([(wr - ww, wt + wh/2), (wr, wt + wh/2)], fill=(5, 150, 105, 40), width=max(1, int(s)))

    # "GH" text above the roof
    try:
        fsz = int(size * 0.08)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fsz)
    except:
        font = ImageFont.load_default()
    txt = "GH"
    bb = d.textbbox((0, 0), txt, font=font)
    tw = bb[2] - bb[0]
    th = bb[3] - bb[1]
    d.text((cx - tw/2, cx - 32*s - th/2), txt, fill=(255, 255, 255, 255), font=font)

    # Small bed icons below windows (representing guesthouse)
    bed_w = 6*s
    bed_h = 3*s
    # Left bed
    d.rounded_rectangle([body_l + gap, cx + 16*s, body_l + gap + bed_w, cx + 16*s + bed_h], radius=int(s), fill=(255,255,255,100))
    # Right bed  
    d.rounded_rectangle([body_r - gap - bed_w, cx + 16*s, body_r - gap, cx + 16*s + bed_h], radius=int(s), fill=(255,255,255,100))

    return img2

# Generate all sizes
for sz in [192, 512]:
    img = create_icon(sz)
    path = f"public/m-icons/icon-{sz}x{sz}.png"
    img.save(path, "PNG")
    # Verify
    pixels = list(img.getdata())
    opaque = sum(1 for p in pixels if p[3] > 0)
    colors = set(p[:3] for p in pixels if p[3] > 0)
    print(f"{path}: {sz}x{sz}, {opaque} opaque px, {len(colors)} colors")

# Favicons
img192 = Image.open("public/m-icons/icon-192x192.png")
for sz in [32, 16]:
    r = img192.resize((sz, sz), Image.LANCZOS)
    r.save(f"public/m-icons/favicon-{sz}.png", "PNG")
    print(f"public/m-icons/favicon-{sz}.png: {sz}x{sz}")

print("Done!")
