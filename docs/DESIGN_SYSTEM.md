# CultiSync — Design System reference

Brand and design-system rules for CultiSync, **reconstructed from the implemented code** in
`src/styles/tokens/`, `src/assets/`, and `src/components/`.

> **Provenance — read this before treating anything here as authoritative.**
> The original authority was `project/README.md` inside the Claude Design handoff bundle
> (`https://api.anthropic.com/v1/design/h/ZKtIJzauotvrdziDb46jgg`). That bundle was extracted only to a
> Windows temp directory, which has since been cleared — the directory tree survives but every file is
> gone — and an unauthenticated GET of the handoff URL now returns **HTTP 404**. The bundle's
> `guidelines/`, `templates/`, `ui_kits/`, `uploads/`, and chat transcript were never committed and are
> **not recoverable from this repository**.
>
> This document therefore records what the *code* demonstrably does. Where the original README carried
> rationale, voice rules, or usage prose that left no trace in the tokens or components, that material is
> **lost**, not reproduced here. If the bundle is ever recovered (via an authenticated fetch, or a copy on
> another machine), reconcile it against this file and prefer the original.

> **Status 2026-10.** CultiSync is now a free, observation-only tool ([ROADMAP.md](ROADMAP.md)). The Sync
> assistant, plan gating, billing components, simulator and `/demo` frame were removed in October 2026,
> and this document describes the code after that removal. References to `IMPLEMENTATION_PLAN.md` point
> to an internal planning document that is not published.

---

## 1. Brand identity

CultiSync is a geospatial-data-informed platform helping small farmers grow, cultivate, and irrigate their
land. Positioning: **satellite-informed, soil-grounded**. The visual language pairs a cool, technical
satellite palette with warm, earthy paper surfaces — the "sky over soil" tension is the core idea.

The mark is a **contour-C**: a letter C built from topographic contour lines
(`src/assets/logo-mark.svg`, `logo-mark-inverse.svg`). The homepage hero draws the same motif as rings
behind the headline. `src/assets/contours.svg`, the motif as a background texture, is kept as a brand
asset, but no page uses it since the October 2026 removals.

## 2. Color

Defined in [`src/styles/tokens/colors.css`](../src/styles/tokens/colors.css). Light-first, tuned for
**outdoor/sunlight readability**: warm paper surfaces, high-contrast ink.

### Semantic color meanings — these are load-bearing

Hue carries meaning in this product. Do not reassign these:

| Ramp | Hex anchor | Means |
|---|---|---|
| **Sky Cyan** (`--sky-*`) | `--sky-600: #357F9E` | Primary brand hue — satellite, sky, actions |
| **Horizon Blue** (`--blue-*`) | `--blue-600: #3D5BA8` | Water, moisture, informational status |
| **Irrigation Mint** (`--mint-*`) | `--mint-600: #74B488` | Irrigation, healthy states |
| **Harvest Amber** (`--amber-*`) | `--amber-600: #A06E12` | Caution, forecast, ripening |
| **Clay Red** (`--red-*`) | `--red-600: #B43A2E` | Urgency, stress, alerts |
| **Loam** (paper/stone/ink) | `--paper: #F7F5ED` | Warm neutrals — surfaces, borders, text |

### Vegetation-health data ramp

A five-stop red→cyan ramp, **stress → peak**. It remains in the tokens, but no live surface uses it
since the Fields legend capsule was removed in October 2026; Sentinel-2 views use the NDVI imagery ramp
below:

`--scale-stress: #B43A2E` · `--scale-low: #D98A52` · `--scale-fair: #B0BFC6` ·
`--scale-good: #5499B6` · `--scale-peak: #1F5D77`

### NDVI imagery ramp (what the app paints on Sentinel-2)

`--ndvi-water` · `--ndvi-soil` · `--ndvi-sparse` · `--ndvi-low` · `--ndvi-mid` · `--ndvi-high` · `--ndvi-dense`
mirror the `colorBlend` stops −1, 0, 0.2, 0.4, 0.6, 0.8, 1 in
`supabase/functions/field-data/imagery.js`. Any legend drawn next to NDVI *imagery* (app or website)
uses these, so the legend always matches the pixels, and covers the full rendered range (the website
legend pairs a "below 0 / water" segment with a 0–1 bar whose stops sit at their true positions). The `--scale-*` ramp above remains the qualitative
health legend. `--ndvi-change-decrease/neutral/increase` match the server-rendered NDVI-change image.
If the evalscript colours ever change, change these tokens in the same commit.

### Chart tokens

App SVG charts use `--chart-primary` (sky-600, the measured series), `--chart-secondary` (ink-3, prior
year), `--chart-rain` (blue-600) and `--chart-threshold` (amber-600). Set them through the `style`
prop (`style={{stroke:'var(--chart-primary)'}}`): browsers do not resolve `var()` inside SVG
presentation attributes such as `stroke="…"`. MapLibre paint properties cannot read CSS variables at
all, so map layer colours in `FieldMap.jsx` remain literals.

### Rule: consume semantic aliases, not raw ramps

Components reference `--accent`, `--surface-card`, `--text-body`, `--danger`, etc. The raw `--sky-600`-style
ramp values exist so the aliases and the dark theme can be defined in one place. Introducing a new raw hex
or px literal into a frozen component fails the token-usage lint (AC-20).

## 3. Dark theme — "night pass"

Defined in [`src/styles/tokens/dark.css`](../src/styles/tokens/dark.css). **Opt-in per subtree**: set
`data-theme="dark"` on `<html>`, `<body>`, or any subtree root.

Dark overrides the semantic aliases **and** the loam neutrals, so components that reference
`--paper`/`--stone-*`/`--ink-*` directly stay coherent. The saturated ramps (sky, blue, mint, amber, red,
and the health scale) are **shared across both themes** — only neutrals and aliases re-grade. On dark the
accent brightens to `--sky-400` with dark text on top (`--text-on-accent: #0C181D`), and shadows deepen.

Every surface must pass axe contrast checks in **both** themes. Text on a status tint therefore uses the
paired alias, never a raw ramp step: `--success-text` on `--success-soft`, `--info-text` on `--info-soft`,
`--warning-text` on `--warning-soft`, `--danger-text` on `--danger-soft` (each ≥ 5.3:1 light, ≥ 5.7:1
dark). The `.beta-shell` badges and notices follow this. Tinted panels use
`--accent-soft`, not a fixed light step such as `--sky-50`, so body text stays readable at night.

## 4. Typography

Defined in [`src/styles/tokens/typography.css`](../src/styles/tokens/typography.css). Three variable
webfonts, all **OFL-licensed**, self-hosted from `src/assets/fonts/`
([`fonts.css`](../src/styles/tokens/fonts.css)):

- **Display — Bricolage Grotesque** (characterful, warm): headings, hero.
- **UI/body — Schibsted Grotesk** (sturdy, legible): default body and interface text.
- **Data — Spline Sans Mono**: readouts, coordinates, units. *Numbers that came from the pipeline are set
  in mono* — this is how the product signals measured data as distinct from prose. Apply it to the
  number, not to surrounding words: units and labels stay in the body face.

Bricolage Grotesque is variable in `opsz` (12–96), `wght` and `wdth` (75–100). Large display type uses
the optical-size and width axes: the website hero is `'opsz' 96, 'wdth' 80` at weight 700, section
heads `'opsz' 72`, app `h1` `'opsz' 96, 'wdth' 88`.

**Loading.** The browser loads Latin-subset WOFF2 files from `public/fonts/` (built from the TTFs in
`src/assets/fonts/` by `scripts/build_fonts.py`, about 290 KB for all four instead of 860 KB). The
display and body faces are preloaded in `index.html`; `public/_headers` caches `/fonts/*` as immutable,
so the file names carry a version (`.v1`) — bump it whenever the subset or a source font changes.

**Labels are sentence case** in the website and the connected app: no all-caps eyebrows or badges
("Field view", not "FIELD VIEW"); the `.eyebrow` class is a small accent-coloured label, not a
tracked-out caps line.

Size scale runs `--text-xs: 12px` through `--text-hero: 64px`, with a separate mono readout scale
(`--text-data-sm/md/lg`: 14/20/32px). Line heights: `--leading-tight: 1.1` (display),
`--leading-snug: 1.3` (headings), `--leading-body: 1.55` (copy). `--tracking-caps: 0.08em` remains in the tokens,
but no live surface uses uppercase labels.

## 5. Spacing and layout

Defined in [`src/styles/tokens/spacing.css`](../src/styles/tokens/spacing.css). **4px base grid**
(`--space-1` = 4px through `--space-20` = 80px).

- `--container-web: 1120px` — marketing site max width, `--gutter-web: 24px`
- `--container-app: 390px`, `--gutter-app: 16px` — left from the removed 390 px mobile frame; no live
  surface uses them
- `--hit-target: 48px` — **minimum touch target, sized for field use with gloves on.** This is an
  accessibility and context-of-use requirement, not a default; do not shrink it.

## 6. Shape and motion

Defined in [`src/styles/tokens/effects.css`](../src/styles/tokens/effects.css).

Radii ladder by element weight: `--radius-sm: 8px` (chips in cards) · `md: 12px` (inputs, secondary
buttons) · `lg: 16px` (cards) · `xl: 24px` (sheets, hero panels) · `--radius-pill: 999px` (primary
buttons, tags, segmented controls).

**Shadows are quiet — borders do most of the separation work.** Three levels only: `--shadow-card`,
`--shadow-raised`, `--shadow-overlay`.

Motion is **calm and grounded — no bounces**: a single `--ease-out: cubic-bezier(0.2, 0.6, 0.2, 1)` with
`--duration-fast: 120ms` / `base: 200ms` / `slow: 320ms`. All animation must respect
`prefers-reduced-motion`.

## 7. The one-loud-element rule

**Each surface has one loud element**: its single conversion or primary form action. On the website it
takes the filled `Button variant="solid"` (accent on paper) or `variant="solid-inverse"` (sky-300 on the
dark hero); inside `.beta-shell` it is `.primary`. `variant="primary"` stays the quiet tinted button. Do
not add a second element with that weight beside it.

Until October 2026 this role belonged to the Sync assistant's `AIButton`; the assistant was removed with
the move to a free, observation-only tool.

## 7a. Website imagery

The homepage hero, the "four ways of looking" section, the sign-in page and `public/og.jpg` use **real
imagery only**, exported by `scripts/build_site_imagery.py` (and `scripts/build_og_image.py`) into
`src/assets/imagery/` with an `imagery.json` that the page reads for every caption:

- Aerial: USDA NAIP via the USGS National Map (public domain).
- Satellite: Copernicus Sentinel-2 L2A via Element84 Earth Search — the newest fully clear scene in the
  search window (`--end`, `--days`). Every place that shows Sentinel-2 pixels carries the attribution
  "Contains modified Copernicus Sentinel data <year>" next to them: the hero caption, the footnote of the
  "four ways of looking" section, the sign-in caption, and `og.jpg` itself.
- Vineyard block: a DWR / Land IQ public crop-map polygon, chosen for within-block NDVI variation.

Captions always state place, source, acquisition date and resolution. The NDVI colours, cloud mask and
nearest-neighbour upsampling mirror the app, so the website never shows detail the product cannot
deliver: 10 m pixels are left visibly square. Copy next to imagery stays observational ("a band through
the middle reads thinner"), never a diagnosis or an instruction.

Motion on the website is a single load sequence — the hero divider sweeps in once and the contour rings
draw once — and both are skipped under `prefers-reduced-motion`.

## 8. No plan gating

The tool is free and has no tiers or gates. The paid tiers and their components were removed in
October 2026.

## 9. Icons

All icons go through the explicit registry in [`src/lib/Icon.jsx`](../src/lib/Icon.jsx) — named Lucide
imports, re-exported by key, so the bundle stays tree-shakeable. **Add a new icon to that registry rather
than importing from `lucide-react` at the call site.**

## 10. Component inventory

Two primitives remain under `src/components/`: `core/Button` and `navigation/TopNav`, both used by the
website. The connected app (`/app`) is styled by the classes in `src/app/beta.css` rather than by
primitives. The other seventeen components in the original inventory (Badge, Card, Chip, IconButton,
MetricStat, HealthBar, InsightCard, Input, Select, Switch, TabBar, SegmentedControl, the three `ai/`
components and the two `billing/` components) were removed in October 2026 because nothing used them.

Surfaces: `src/website/` (`/`, legal pages) and `src/app/` (`/app` — Today, Explore, Fields, Water,
Feedback).

## 11. Voice

Recoverable voice constraints, stated as rules (they are not enforced by tests yet):

- **Wine grapes, not maize.** The pilot is California wine grapes; copy speaks vineyards, blocks and
  rows, never maize or soybean copy carried over from earlier drafts.
- **Gloss the jargon.** Grape and remote-sensing terms (NDVI, ET₀, budbreak, veraison) are
  glossed on first use in a surface.
- **Observational, never prescriptive.** Copy describes what the data shows and carries the
  "informational only — not professional agronomic advice" framing. It never tells a grower how much to
  irrigate, when to spray or when to pick. This is a liability boundary, not a tone choice.

> The original bundle README's fuller voice guidance (tone examples, do/don't phrasing) is among the
> material lost with the bundle.

---

## Related

- [`../README.md`](../README.md) — how to run the app; surface/route table
- `IMPLEMENTATION_PLAN.md` §7 and §11.H (internal, not published) — the designed-element traceability
  matrix and the CI gates proposed to keep the design honest
