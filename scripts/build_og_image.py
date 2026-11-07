"""Compose public/og.jpg (1200x630), the link-preview image, from the homepage hero imagery.

Run scripts/build_site_imagery.py first. Usage: python scripts/build_og_image.py
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'src', 'assets', 'imagery')
FONTS = os.path.join(ROOT, 'src', 'assets', 'fonts')
W, H, SPLIT_X = 1200, 630, 560

SKY_900, SKY_700, SKY_300 = (17, 51, 63), (38, 99, 121), (143, 196, 215)
PAPER, INVERSE = (247, 245, 237), (235, 244, 247)


def font(name, size, axes):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    f.set_variation_by_axes(axes)
    return f


def main():
    canvas = Image.new('RGB', (W, H), SKY_900)
    d = ImageDraw.Draw(canvas)

    # Contour-C rings behind the headline, as on the site.
    cx, cy = -40, 360
    for i, r in enumerate(range(90, 520, 60)):
        tone = tuple(int(SKY_900[c] + (SKY_700[c] - SKY_900[c]) * (1 - i * 0.11)) for c in range(3))
        d.arc((cx - r, cy - r, cx + r, cy + r), start=38, end=322, fill=tone, width=2)

    # Satellite window: aerial left, NDVI right, divider in the middle.
    aerial = Image.open(os.path.join(IMG, 'hero-aerial.webp')).convert('RGB')
    ndvi = Image.open(os.path.join(IMG, 'hero-ndvi.webp')).convert('RGBA')
    win_w = W - SPLIT_X
    scale = H / aerial.height
    size = (round(aerial.width * scale), H)
    left = (size[0] - win_w) // 2
    aerial = aerial.resize(size, Image.LANCZOS).crop((left, 0, left + win_w, H))
    ndvi = ndvi.resize(size, Image.NEAREST).crop((left, 0, left + win_w, H))
    half = win_w // 2
    window = aerial.copy()
    right = ndvi.crop((half, 0, win_w, H))
    window.paste(right, (half, 0), right)  # masked pixels show the aerial underneath
    mask = Image.new('L', (win_w, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, win_w + 40, H), radius=28, fill=255)
    canvas.paste(window, (SPLIT_X, 0), mask)
    x = SPLIT_X + half
    d.line((x, 0, x, H), fill=PAPER, width=3)
    d.ellipse((x - 26, H // 2 - 26, x + 26, H // 2 + 26), fill=PAPER)
    for sign in (-1, 1):
        tip = x + sign * 12
        d.polygon([(tip, H // 2), (tip - sign * 8, H // 2 - 7), (tip - sign * 8, H // 2 + 7)], fill=SKY_900)

    # Headline and supporting line.
    title = font('BricolageGrotesque-Variable.ttf', 76, [96, 700, 80])
    y = 132
    for line in ['Know your land', 'like a satellite', 'does.']:
        d.text((64, y), line, font=title, fill=INVERSE)
        y += 76
    body = font('SchibstedGrotesk-Variable.ttf', 26, [400])
    d.text((64, y + 28), 'Satellite imagery and weather for', font=body, fill=(200, 216, 222))
    d.text((64, y + 62), 'California vineyards. Free beta.', font=body, fill=(200, 216, 222))
    brand = font('BricolageGrotesque-Variable.ttf', 30, [30, 600, 100])
    d.text((64, 56), 'Culti', font=brand, fill=INVERSE)
    d.text((64 + d.textlength('Culti', font=brand), 56), 'Sync', font=brand, fill=SKY_300)
    mono = font('SplineSansMono-Variable.ttf', 18, [400])
    d.text((64, H - 64), 'cultisync.com', font=mono, fill=(160, 186, 196))

    # Data credits on the image itself: previews are often shown without the page.
    meta = json.load(open(os.path.join(IMG, 'imagery.json'), encoding='utf-8'))
    credit = f"{meta['sentinel']['attribution']}. Aerial: USDA NAIP."
    small = font('SchibstedGrotesk-Variable.ttf', 13, [500])
    tw = d.textlength(credit, font=small)
    d.rounded_rectangle((W - tw - 32, H - 34, W - 12, H - 10), radius=10, fill=SKY_900)
    d.text((W - tw - 22, H - 31), credit, font=small, fill=(215, 228, 233))

    out = os.path.join(ROOT, 'public', 'og.jpg')
    canvas.save(out, 'JPEG', quality=86, optimize=True, progressive=True)
    print(f'wrote public/og.jpg {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    main()
