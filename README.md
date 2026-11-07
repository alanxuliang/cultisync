# CultiSync

A free tool that shows what is happening on a California wine-grape block, built from public satellite,
weather and soil data. Every value carries its source and timestamp, and missing data is never shown as
zero. It is observation only: it does not tell growers how much to irrigate, when to spray or when to
pick. See the [roadmap](docs/ROADMAP.md).

This app implements the **CultiSync Design System** handoff bundle from Claude Design as a Vite + React
single-page app. The bundle's own README was the original authority on brand rules, but it was never
committed and the handoff URL no longer resolves — see [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md),
reconstructed from the implemented tokens and components, for brand rules (voice, color semantics, type,
spacing, motion).

## Documentation

See [docs/README.md](docs/README.md) for the full index:

- [docs/ROADMAP.md](docs/ROADMAP.md) — what CultiSync is and is not, and the milestones through 2027
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — what runs where, secrets by name, deploying, failure behavior, routine checks
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — brand and design-system rules reconstructed from the code
- [docs/MAP_WEATHER_BUDGET.md](docs/MAP_WEATHER_BUDGET.md) — service selection, free-tier limits and the cost ceiling
- [docs/RESEARCH_APPENDIX.md](docs/RESEARCH_APPENDIX.md) — dated, sourced research on agronomy, data, platform and legal questions
- [docs/BETA_READINESS.md](docs/BETA_READINESS.md) — dated acceptance log of the September 2026 beta

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm test         # auth/data interpretation checks
```

Copy `.env.example` to `.env.local` and supply the Supabase URL and **publishable**
key. Never put a service-role key, CIMIS key or CDSE credentials in a `VITE_` variable.
Runtime secrets belong in Supabase Edge Functions. Keep public registration off
until the [release gates](docs/BETA_READINESS.md) pass.

## Surfaces

| Route        | Surface                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `/`          | Website — hero, how-it-works, free-beta band, footer                      |
| `/app`       | Connected Beta: email login, fields, observations, Water and feedback   |
| `/demo`      | Removed in October 2026; redirects to `/`                                |
| `/terms`, `/privacy`, `/cookies` | Beta policy notices and operator details |
| `/pricing`   | Redirects to `/`                                                        |
| `/simulator` | Redirects to `/`                                                        |

External services stay under a ceiling of **US$30/month**; current spend is US$9/month (Hugging Face
PRO, for the planned public dataset and demo). SMTP, authenticated workflows and Workers deployment have
been verified. See [current readiness](docs/BETA_READINESS.md), [operations](docs/OPERATIONS.md) and
[service budget](docs/MAP_WEATHER_BUDGET.md).

The connected Water tab uses the field-data interface for NWS forecasts and CIMIS
reference ET₀, with original timestamps and missing/stale-data notices. It does not calculate irrigation prescriptions, schedule runs or control equipment. Beside the forecast it
shows the latest matched week of CIMIS ET₀ and NASA POWER rainfall, and the water storage capacity of the
mapped USDA soil down to a root depth the user assumes.

Sync AI, the Grow Simulator, paid plans and the illustrative `/demo` frame were removed in October 2026.

## What it does not do

It does not recommend irrigation amounts, spray timing or harvest dates, and it has no frost, disease,
ripening or deficit-irrigation models. Field boundaries come from the user or the public DWR crop map
and are not surveys. Soil figures describe the mapped soil, not current moisture.

## Data sources and attribution

Terms as understood in October 2026; check each link before reusing the data elsewhere.

| Source | Used for | Terms | Attribution in the app |
|---|---|---|---|
| [Copernicus Sentinel-2 L2A](https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice) via the Copernicus Data Space Ecosystem | NDVI, true-color and false-color views, comparisons | Free, full and open | "Contains modified Copernicus Sentinel data" with the year |
| [USGS / USDA NAIP](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip) | Aerial basemap | Public domain | "USGS / USDA NAIP" |
| [NOAA / NWS API](https://www.weather.gov/documentation/services-web-api) | Forecast and alerts | Public domain | Source label "NOAA / NWS" |
| [DWR Spatial CIMIS](https://et.water.ca.gov/) | Reference ET₀ | Free with a registered app key | Source label "California DWR / Spatial CIMIS" |
| [NASA POWER](https://power.larc.nasa.gov/) | Modeled daily rainfall | Free; NASA asks for acknowledgement | Source label "NASA POWER" |
| [USDA NRCS SSURGO](https://www.nrcs.usda.gov/resources/data-and-reports/soil-survey-geographic-database-ssurgo) via [Soil Data Access](https://sdmdataaccess.nrcs.usda.gov/) | Soil water capacity, restrictive layers | Public domain | Source label "USDA NRCS · representative point" |
| [OpenFreeMap](https://openfreemap.org/tos/) / OpenStreetMap | Default basemap | OpenStreetMap data under ODbL | Map attribution control |
| [Mapterhorn](https://mapterhorn.com/attribution) | Terrain and low/high-ground tint | See the attribution page | "© Mapterhorn" |
| [DWR / Land IQ 2023 crop map](https://www.arcgis.com/home/item.html?id=d94e891e00364e49a2ed9e9e2e27837d) | Public vineyard boundaries | Published by California DWR | "DWR / Land IQ" with year and ID |

## Self-hosting

You need a Supabase project, a Copernicus Data Space Ecosystem account, a DWR Spatial CIMIS app key and
a static host with single-page-app fallback.

1. Create a Supabase project, then `npx supabase link --project-ref <ref>` and `npx supabase db push`.
   The schema accepts California-region fields only (`supabase/migrations/20260917204607_beta_core.sql`).
2. In the Copernicus Data Space dashboard, create an OAuth client for the Sentinel Hub APIs. Register for
   a Spatial CIMIS app key at https://et.water.ca.gov/.
3. Set the edge-function secrets and deploy the function:

   ```sh
   npx supabase secrets set SENTINELHUB_CLIENT_ID=... SENTINELHUB_CLIENT_SECRET=... CIMIS_APP_KEY=...
   npx supabase functions deploy field-data
   ```

4. In Supabase Auth, enable email sign-in with one-time codes, configure custom SMTP, and set the Site
   URL and redirect URL to `https://<your-domain>/app`.
5. Build with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set (see `.env.example`) and deploy
   `dist/`. For Cloudflare, set `CLOUDFLARE_ACCOUNT_ID` when deploying and replace the custom-domain
   route in `wrangler.jsonc` with your own.

## Source and contributions

This repository is a published copy of CultiSync's code. Development, continuous integration and the
deployment of cultisync.com happen in the maintainer's private repository, and this copy is refreshed
from it from time to time. Issues are welcome here. Pull requests are read and, when accepted, applied
by hand in the private repository, so the change reaches this copy with the next refresh.

## License

The code is licensed under [Apache-2.0](LICENSE). The bundled fonts are under the SIL Open Font License
1.1 (`public/fonts/OFL-*.txt`). The CultiSync name and logo are not licensed for reuse. Third-party data
keeps its own terms (see above).

## Structure

- `src/styles/` — design tokens (colors, dark theme, type, spacing, effects) imported
  verbatim from the design system; `data-theme="dark"` on any subtree opts into the
  night pass
- `src/assets/` — logo marks (contour-C), contour motif, variable webfonts
  (Bricolage Grotesque, Schibsted Grotesk, Spline Sans Mono — all OFL)
- `src/components/` — the remaining design-system primitives (`core/Button`, `navigation/TopNav`)
- `src/lib/Icon.jsx` — Lucide icon registry (explicit imports, tree-shakeable)
- `src/website/`, `src/app/` — the website and the connected app
- `supabase/` — database migrations and the `field-data` edge function

## Deployment

The invited-account preview is deployed at https://cultisync.com via Cloudflare
Workers Static Assets. `wrangler.jsonc` configures the domain and SPA routing;
`public/_headers` supplies response security headers.

```sh
npm run build
npx wrangler deploy --dry-run
npx wrangler deploy
```

Build with the project Supabase publishable settings; keep
`VITE_PUBLIC_BETA_READY=false` and server-side public signup disabled until the
release gates pass. Deploy uploads only `dist/`; backend secrets stay in Supabase.
Edge-function deploys, migrations and routine checks are in [docs/OPERATIONS.md](docs/OPERATIONS.md).
