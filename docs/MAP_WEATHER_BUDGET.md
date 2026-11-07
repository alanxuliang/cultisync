# Map and weather selection — checked 2026-09-17

## Current state — 2026-10-12

The ceiling stays **US$30/month** for external services. Current spend is **US$9/month**: Hugging Face
PRO, to be used from January 2027 for a public dataset, a static demo and batch jobs
([ROADMAP.md](ROADMAP.md)). Everything on the critical path stays on free tiers:

| Service | Use | Free-tier limit that matters | Source |
|---|---|---|---|
| Cloudflare Workers Static Assets | cultisync.com | Static assets free; 5 cron triggers per account on the free plan (planned keepalive) | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) |
| Supabase Free | Auth, Postgres, `field-data` edge function | 500 MB database; projects pause after 7 days without database activity (third-party summaries) | [jetadmin summary](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/) |
| Copernicus Data Space (Sentinel Hub APIs) | NDVI statistics and image views | 10,000 processing units per month | [CDSE FAQ](https://documentation.dataspace.copernicus.eu/FAQ.html) |
| Resend Free | Sign-in email | 3,000 emails/month, 100/day | [Resend pricing](https://resend.com/pricing) |
| Mapterhorn | Terrain and low/high-ground tint (adopted 2026-09-30) | No published SLA or usage policy; replacing it with self-hosted PMTiles is under evaluation | [mapterhorn.com](https://mapterhorn.com/) |

Not selected, unchanged: MapTiler (US$30/month Flex would consume the whole budget) and Open-Meteo
(commercial license). A free service is still not automatically "non-commercial" under a provider's
terms, so each provider's terms are checked before use.

The sections below are the original dated selection record.

Budget: **US$30/month combined external services**, excluding an already-owned domain. Do not activate paid tiers or automatic overages without approval. A free end-user Beta is not automatically “non-commercial” under a provider's terms.

Water scenarios also use the public USDA NRCS Soil Data Access and NASA POWER
APIs without purchasing a service. Successful soil queries are cached for 30
days per field and rainfall for one day, within the existing hourly attempt
guard. No additional subscription or automatic overage is enabled. Soil is the
dominant mapped component at the representative point, not an area-weighted
field survey; NASA precipitation is a regional modeled estimate with latency.

| Service | Fit | Cost / limits | Decision |
|---|---|---|---|
| OpenFreeMap + MapLibre | OSM vector basemap, pan/zoom and polygon drawing. Not aerial imagery or parcel cadastral boundaries. | Public instance is free, no API key; no availability warranty. Preserve attribution. | Implemented as Beta basemap. |
| NWS API | US forecast, rain probability, wind. Approximately 2.5 km grids; not a vineyard sensor. | Free for any purpose; reasonable undisclosed rate limits. Identify app, cache requests. | Implemented weather adapter; live verification pending authenticated test. |
| DWR Spatial CIMIS | California daily reference ET₀, about 2 km resolution. Historical / lagged estimate, not a rain forecast or crop water prescription. | Free API with AppKey. | Implemented ET₀ adapter using stored server secret; live verification pending. |
| MapTiler | Polished basemaps, imagery options depending on plan. | Free is testing/personal/non-commercial; Flex currently $30/month, extra traffic billed separately, tax excluded. | Do not activate: consumes the whole budget before other services. Existing key can remain unused. |
| Open-Meteo hosted API | Convenient global forecasts and multiple models. | Free endpoint is non-commercial only; commercial license needs subscription. | Not selected for this California commercial-product Beta. Revisit when expanding internationally. |
| Protomaps on R2 | Self-hosted vector basemap, more operational control. | Storage and GET costs; no R2 egress fee. Regional extract and hosting setup needed. | Possible later fallback if public map reliability becomes inadequate. |

Recommended **map + weather + ET₀ API subscription total: $0/month**, within free-service terms and quotas. This does not imply guaranteed uptime or unlimited total app capacity. OpenFreeMap can discontinue public service; show map failures clearly and retain GeoJSON import.

Other services remain relevant to the same budget: Supabase Free and Cloudflare static hosting; CDSE satellite quota requires usage monitoring; Resend Free is selected for SMTP (currently 3,000 emails/month, 100/day). Do not enable paid email overages. Account verification, sender-domain DNS and production login delivery remain required.

Hosting recommendation updated: Cloudflare now recommends **Workers Static Assets** over Pages for new projects. Both serve static assets free; Workers adds an expansion path to server code without moving the current Supabase backend. This Vite app can deploy `dist/` with SPA fallback and no Worker script. Dynamic Worker invocations have separate quotas/pricing; no paid plan is needed for the proposed static deployment. Sources: [new-project recommendation](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

Keep the $30 as headroom. If a free quota is reached, pause affected refresh/registration or explicitly approve a new plan; do not silently substitute fabricated readings or activate spending. Review monthly actual usage before opening to a wider audience. At 50 active accounts × 3 fields × 30 days, a daily satellite request pattern is about 4,500 requests/month before retries and test traffic; actual processing units depend on geometry and request structure, not a fixed blanket cost per observation.

## Primary sources

### Spatial visualization update — 2026-09-17

Authenticated refresh now retrieves NDVI, RGB and false-color PNG views through
the CDSE Process API, clipped to the stored field boundary. Each view is at most
256 × 256 pixels; all three views share a qualified observation day. Successes
and per-view failures are cached for 24 hours. This adds up to three Process API
requests per field per day, in addition to the statistical request. At 50 daily
active accounts × 3 fields × 30 days this is up to 13,500 image requests plus
4,500 statistical requests/month, before exceptional retries. Processing-unit
use must be monitored in CDSE; no paid tier or overage has been enabled.
The UI renders NWS-provided forecast geometry and a CIMIS query-point marker;
it does not purchase weather tiles or invent a raster from a scalar response.
Live synthetic-field verification returned all three image views, eight NDVI
observations and 29 ET₀ days in the requested 30-day window.

- [CDSE Sentinel-2 Process API examples](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process/Examples/S2L2A.html)

- [OpenFreeMap service and attribution](https://openfreemap.org/), [integration](https://openfreemap.org/quick_start/), [current terms](https://openfreemap.org/tos/)
- [NWS API service, pricing and identification](https://www.weather.gov/documentation/services-web-api)
- [DWR CIMIS API overview](https://et.water.ca.gov/Home/Index/), [REST parameters and units](https://et.water.ca.gov/rest/index)
- [MapTiler current pricing](https://www.maptiler.com/cloud/pricing/), [Free plan terms](https://www.maptiler.com/terms/cloud/)
- [Open-Meteo pricing and commercial license](https://open-meteo.com/en/pricing)
- [Protomaps storage](https://docs.protomaps.com/pmtiles/cloud-storage)
- [Resend pricing](https://resend.com/pricing), [Supabase SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp)
- [CDSE authentication](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html), [Statistical API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html)

### Paired vegetation comparison

A new observation pair can add three earlier-date image requests, one five-band
FLOAT32 raster request and one difference PNG request. Completed comparisons
are reused until the pair changes; partial failures retry no more than daily.
The numeric raster is decoded transiently; only summary statistics and PNGs
remain in the field snapshot and are deleted with the field. Data fusion reads
two acquisitions, so request counts alone underestimate processing-unit usage.
The earlier 13,500-image estimate excludes this addition; a conservative daily
new-pair envelope is 36,000 Process requests/month at 50 accounts × 3 fields,
plus statistical requests. This is a quota planning envelope, not an approved
paid plan or a guarantee of free-tier capacity. Monitor CDSE processing units
before expanding the private beta.

### Two-year acceptance archive

The named synthetic acceptance field can backfill 2024-09-18 through 2026-09-17
in 25 calendar-month chunks. Initial loading makes at most 25 statistical CDSE,
25 Spatial CIMIS and 25 NASA POWER requests; no historical PNG batch is added.
Completed monthly sources are cached and reused. Failed sources are limited to
a daily retry; only the existing authorized field is eligible on the server.
This is an explicit one-time acceptance archive, not a scheduled two-year refresh
for every beta account. No paid service or overage was enabled.

### NAIP aerial basemap trial

Added an opt-in USGS National Map NAIP natural-color basemap using the public
ImageServer exportImage service. No account, paid plan or API key is added.
Requests are limited to map-view tiles and an on-selection field-center catalog
query; there is no bulk download or periodic polling. Availability/performance
of the public service is not guaranteed. Simple OpenFreeMap Positron remains the
default and can be selected if imagery fails. USGS receives viewport requests,
IP address and the catalog point only when the aerial mode is selected.
The acceptance location catalog reports 2023 imagery at 0.6 m. This is historical
context, separate from Sentinel analysis dates and resolution; no precision or
current-condition claim is made from the basemap.

Service: https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer
