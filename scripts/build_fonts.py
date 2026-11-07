"""Subset the variable TTFs in src/assets/fonts to the glyphs the site uses and write WOFF2.

Output goes to public/fonts/ under versioned names so index.html can preload them and
public/_headers can cache them as immutable. Bump VERSION when the subset or sources change.

Usage: python scripts/build_fonts.py
"""
import os

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'assets', 'fonts')
OUT = os.path.join(ROOT, 'public', 'fonts')
VERSION = 'v1'

FONTS = {
    'BricolageGrotesque-Variable.ttf': 'bricolage-grotesque',
    'SchibstedGrotesk-Variable.ttf': 'schibsted-grotesk',
    'SchibstedGrotesk-Italic-Variable.ttf': 'schibsted-grotesk-italic',
    'SplineSansMono-Variable.ttf': 'spline-sans-mono',
}

# Basic Latin + Latin-1, typographic punctuation, sub/superscripts (ET₀), arrows, math signs.
UNICODES = (
    'U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,'
    'U+2000-206F,U+2070-209F,U+20AC,U+2122,U+2190-2193,U+2212,U+2248,U+2260,U+2264-2265'
)


def main():
    os.makedirs(OUT, exist_ok=True)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    unicodes = subset.parse_unicodes(UNICODES)
    for src, name in FONTS.items():
        font = TTFont(os.path.join(SRC, src))
        sub = subset.Subsetter(options)
        sub.populate(unicodes=unicodes)
        sub.subset(font)
        path = os.path.join(OUT, f'{name}.{VERSION}.woff2')
        font.flavor = 'woff2'
        font.save(path)
        before = os.path.getsize(os.path.join(SRC, src)) // 1024
        print(f'{src}: {before} KB -> {os.path.basename(path)} {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main()
