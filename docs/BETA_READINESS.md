# Free Beta readiness — 2026-09-17

> **Status 2026-10-12.** This is the dated acceptance log of the September 2026 beta. The project has
> since adopted the free, observation-only direction in [ROADMAP.md](ROADMAP.md): the hypothetical
> irrigation scenarios and simulated teaching projects described below were removed in October 2026, and
> current operations are documented in [OPERATIONS.md](OPERATIONS.md).

## Scope and current status

California wine grapes; login, up to three fields, satellite image views and observations, weather / reference ET₀, feedback and export. Water remains informational, without real-field prescriptions, schedules, sensor claims or equipment control. Two clearly simulated teaching projects demonstrate calculated amounts and deficit histories. Billing and AI advice remain unavailable.

### Public-data scenario update — 2026-09-17

Water's fictional comparison was replaced by three hypothetical initial-moisture
states driven by public data for the selected field. The owner explicitly
authorized representative-point queries to USDA NRCS and NASA POWER, solely
for the service. `field-data` v7 uses the existing token/owner checks and private
snapshot, with 30-day soil caching and one-day rainfall caching. No schema or
permissions changed. Deleting a field still cascades through the complete snapshot.

Authenticated refresh on the original synthetic boundary returned Bale clay
loam, dominant component 85%, layer AWC 0.15 at 0–61 cm and 0.10 at 61–152 cm.
At the assumed 1 m root depth, capacity is 130.5 mm. NASA POWER GEOSIT rainfall
has 27 valid daily values through September 14; missing later dates are null.
The latest matched week is September 8–14. Default Kc 0.70, efficiency 90%,
infiltration fraction 80%, trigger 45% and refill target 20% produce rounded
gross scenario amounts of 93 / 49 / 0 mm for initial depletion 65 / 35 / 10%.
These are historical sensitivity examples, not today's verified field condition.

Uniform cards include a root-zone water illustration, retained-water percentage,
amount and volume, source cards, shared assumption controls and same-scale
trajectory charts. A separate NASA rainfall-history plot retains missing gaps.
The initial state and all controls are explicitly hypothetical and temporary.
Browser verification switched trajectories and confirmed that choosing 2 m
root depth with only 1.52 m of reported layers disables calculation. Seventeen
tests passed, including source missing values, layer integration/restrictions,
matched-date gaps, drainage and volume units.

Frontend deployment: `57366e03-7244-40b7-9a5f-f6f42cfcd29e` at
`https://cultisync.com`. Build and diff checks passed; the existing lazy map
bundle-size warning remains. Mobile inspection showed no horizontal document
overflow. Privacy and budget notes now include the two additional public sources.

### Earlier visualization acceptance — 2026-09-17

- `field-data` v6 retrieves three clipped Sentinel-2 views (NDVI/RGB/false color),
  with cloud/nodata masking, bounded dimensions and daily caching. A real
  authenticated refresh on the authorized synthetic field returned all three
  September 15 images; browser screenshots verified all three spatial overlays.
- Explore shows source dates, resolution, transparency controls, NWS forecast
  geometry and CIMIS query-point context. No within-field weather raster is
  fabricated from a scalar. A 30-day request returned eight qualified NDVI
  observations and 29 ET₀ days. Charts distinguish these histories from future
  temperature/rain-probability forecasts; missing data is not zero and no
  seasonal anomaly baseline is claimed.
- Water examples default to 40.4 mm gross replenishment for dry project A and
  0 mm for wetter project B, using entirely hypothetical inputs. Seven-day
  deficit charts and the equations are visible. Browser slider verification
  changed A to zero initial deficit and the result correctly fell to 0 mm;
  defaults were restored. Real-field amounts require verified agronomic inputs.
- `npm test`: 11 passing; `npm run build` and `git diff --check`: passed.
  Map bundle-size warning remains. New views had no browser error logs and no
  horizontal overflow at a 375 px viewport override (360 px content area).
- Recording is paused at the user's request. No recording was produced.
- Visualization frontend deployed to `https://cultisync.com` as Workers Static
  Assets version `bdd55f2e-7208-4ac2-9f01-160874552d3f`.

Implemented locally: authenticated workspace, polygon drawing/import, server-calculated area, per-owner RLS, field deletion with cascading cache deletion, timestamped partial data states, feedback/export, policy routes, working homepage links and responsive layout. Existing illustration-only UI is isolated at `/demo` and labeled.

Applied to `cultisync-dev`: `beta_core` schema and `field-data` Edge Function. The function validates the access token through Supabase Auth before querying a field scoped to that user's ID. Gateway legacy JWT verification is off because authentication is performed in the function. Anonymous requests were verified to return 401. No service-role key is exposed to the browser.

User authorized precise boundaries solely for service delivery and specifically authorized Copernicus Data Space, NWS and DWR/CIMIS processing on 2026-09-17. No training, advertising or data resale use.

## Remaining release gates

- Operator details supplied: Chenuix LLC; location (not mailing address): Placentia, CA; support@cultisync.com. Display the operator only in Terms and Privacy; keep CultiSync branding elsewhere. Do not claim the notices are counsel-reviewed final instruments.
- Resend Free selected. Dashboard verified SMTP enabled, host `smtp.resend.com`, port 465, sender name CultiSync, and username `resend`. Retried Save successfully (button became disabled); after refresh, the visible page confirmed sender email `support@cultisync.com`, CultiSync, host and port persisted. Browser DOM reads of email/username returned empty values despite visible populated fields, so those reads were not reliable. Owner confirmed invitation arrived in spam and opened the onboarding screen. Resend DKIM and sending-subdomain SPF exist. Added `_dmarc.cultisync.com` TXT `v=DMARC1; p=none;` and verified the authoritative DNS response; Resend Insights now marks DMARC valid. Insights flags the Supabase login URL as mismatched with the sending domain. Owner selected OTP login: the Magic Link/OTP template now contains only the code, frontend uses verifyOtp, and dashboard settings were verified as 8 digits / 3600 seconds. Owner completed the resent OTP login; browser verification confirmed the authenticated workspace and saved field, and a page reload restored the session without another code. Owner confirmed the resent OTP arrived in the inbox; no claim that DMARC alone fixes spam placement. Full message authentication headers have not been independently inspected; DNS presence alone does not prove authentication passed.
- Local Auth Site URL and exact redirect allowlist saved as `http://127.0.0.1:5173/app`. Production Site URL is now https://cultisync.com/app; the exact production redirect https://cultisync.com/app was saved and verified alongside the existing localhost redirect. Server-side public signup disabled for private preview; email confirmation remains enabled. An invitation was submitted successfully for the owner's acceptance account; database now confirms email verification and first sign-in. Owner screenshot confirms callback reached authenticated onboarding; owner completed terms/location acceptance and entered the workspace. The frontend `VITE_PUBLIC_BETA_READY=false` is only a UI switch.
- Authenticated acceptance: owner completed consent; a user-authorized synthetic polygon imported and saved as 3.88 ha. Real authenticated refresh returned NWS forecasts and CDSE NDVI 0.41 observed 2026-09-15. NWS timestamp bug corrected (`updateTime`) and verified in deployed function v4. CIMIS migrated in deployed function v5 to the current SpatialWeb/GetDataBySpatialCoordinates endpoint, coordinates parameter and Ocp-Apim-Subscription-Key header. The old API transition ended July 31, 2026. Authenticated browser refresh verified September 16 reference ET₀ of 3.7 mm on the synthetic field, retrieved September 17 at 4:50 PM PDT, without a CIMIS error. MapLibre v6 worker now explicitly bundled through Vite; visible basemap, saved polygon and hand-drawn polygon closure verified. Some optional basemap POI sprite warnings remain. Browser feedback submission was confirmed in the database. Chrome downloaded cultisync-data.json with one profile, one field, one snapshot and one feedback row, all scoped to the owner; the in-app browser download event timed out. A separate disposable polygon was created through the UI and refreshed with real data; after explicit owner confirmation, UI deletion removed its field, snapshot and private refresh record (all counts zero), while retaining the original field. Production Chrome login and Water data display were confirmed, and a screenshot verified the live basemap with the stored field polygon. Recording remains pending.
- Confirm source freshness and coverage against a publicly sourced vineyard boundary. A synthetic test polygon is not a validated agronomic fixture.
- Workers Static Assets deployed at the workers.dev preview URL and https://cultisync.com. Version c824dad9-6463-4936-a88e-c39bfd8dbae2. Homepage, /app and policy routes returned HTTPS 200 with security headers; JS/CSS/map worker returned correct MIME types. Browser /app rendered the OTP form and sent a code. Public signup remains disabled. Owner completed production Chrome OTP login; authenticated Water displayed real CIMIS/NWS data with a 7:49 PM refresh timestamp, and the Fields basemap and polygon rendered correctly.
- Record the actual complete browser flow after the above checks. No final acceptance recording exists yet: QuickTime native automation timed out on two attempts; browser capabilities have no recording interface. A subsequent system screenshot-app launch also failed; awaiting explicit approval to use macOS command-line recording as an alternative. Do not substitute screenshots or a slideshow for recording.

## Data and security checks

`npm test`: 7 tests passing for authentication/ownership, malformed IDs, missing CIMIS values, parcel-normalized NDVI coverage, cloud masks, expired forecasts. `npm run build`: passed, with a large lazy-loaded map chunk warning. `npm audit`: zero vulnerabilities after targeted upgrades. Remote transaction/rollback checks in `supabase/tests/beta_security.sql` passed: ownership, restrictive column grants, server area units, self-intersection rejection, 3-field cap, refresh cooldown and cascading deletion. The initial project default table grants were explicitly revoked in `restrict_beta_grants`. Supabase security advisor: only informational notice for the intentionally service-role-only refresh table with no user policy. Browser check at 375 px: homepage/sign-in have no horizontal overflow; homepage CTA opens `/app`.

Limits: 3 fields/account; 0.1–100 ha/field; at most 199 polygon corners; hourly refresh attempt guard; satellite fetched at most daily for unchanged fields. Provider outages retain original data timestamps, with explicit error text. Limits bound routine demand, but do not replace monitoring service dashboards as public signups grow.

## Acceptance recording script

1. Homepage → Open Beta → 8-digit email code → authenticated session.
2. Show terms and service-only location consent, complete onboarding.
3. Draw/import a California vineyard field; save; verify server area and reload persistence.
4. Refresh data; show each actual source, observation date and unavailable/late states.
5. Water: show weather forecast / rain probability and reference ET₀; demonstrate visible disclaimer and absence of scheduling.
6. Submit test feedback; export account data.
7. Test deletion on a clearly disposable acceptance field; verify its cache is removed.
8. Sign out; direct `/app` access must return to sign-in.

Exclude inbox contents, authentication links/tokens, secret configuration screens and unrelated desktop content from the final recording. Record app interaction, not a slideshow; label any skipped or blocked steps.

### Vegetation comparison acceptance — 2026-09-17

- Replaced the fixed “Scout to verify” state with observations, a recent NDVI
  sparkline, paired-date change and a joint-valid-coverage meter.
- Explore switches earlier/latest NDVI, RGB and false color, plus an NDVI
  difference raster. Brown/teal represents decrease/increase, never stress.
- CDSE data fusion uses both dates on the same bounded grid, clear masks on
  both dates, and requires ≥60% joint coverage and ≥15 paired pixels.
- Synthetic acceptance field: September 12 → 15, 414/414 pixels jointly valid;
  paired means 0.4189568 → 0.4193507, delta +0.0003939. Difference PNG and
  earlier RGB were visibly checked in the browser. This is a synthetic boundary,
  not a verified vineyard or an agronomic conclusion.
- Twenty-one unit tests pass, including paired masks, zero NDVI, insufficient
  coverage and stale pair rejection. Production build passes with the existing
  MapLibre chunk-size warning. TIFF parsing uses the pinned geotiff 3.0.5 browser
  bundle because its npm Node worker dependency fails at edge-runtime startup.

### Two-year acceptance history — 2026-09-17

- Backfilled 2024-09-18 through 2026-09-17 for the explicitly authorized synthetic
  field. All 25 calendar-month requests completed; valid results contain 124 NDVI
  observations (range 0.3524–0.7800), 727 ET₀ days and 728 rainfall days. Available
  ET₀ ends September 16 and NASA rainfall September 15; missing days are not zero.
- Added year labels, smaller points on dense charts, source-specific counts,
  two-year / one-year / 90-day / 30-day filters and historical rainfall. Forecasts
  remain separate. Historical image downloads and long-term anomaly claims are
  outside this change; latest-date imagery and irrigation scenarios stay current.
- Monthly archive rows use owner-only SELECT RLS and a field-delete cascade;
  browser writes and anonymous reads are revoked. A different authenticated test
  subject saw zero archive rows. Export includes the archive. Server backfill is
  limited to this one test field and the fixed requested two-year window.
- 24 tests pass, including month boundaries, deduplication, missing values and
  range filtering. Security advisor found no new table issue; existing private
  service-only table and password-auth advisories are unchanged.

### Water layout simplification

Removed standalone ET₀ and rainfall history charts from Water. Source-history
buttons open Explore with the correct variable selected and focus the history
section. Water now compares all three hypothetical deficit paths on one shared
scale, with a trigger line and accessible daily values. A matched-week summary
shows reference ET₀, potential crop demand, retained rain and gross replenishment.
Weather follows the scenarios. Model assumptions and calculations are unchanged.
All 24 existing tests and the production build pass; local UI verified the three
curves and the ET₀ navigation using the acceptance field.

### Aerial basemap trial

Fields and Explore now offer Simple map / Aerial NAIP, label visibility, metric
scale, fullscreen and return-to-field. Boundaries use white/teal double outlines.
Analysis overlays remain above the basemap, which is softened in aerial mode.
Local acceptance verified real visible vineyard rows/roads and the catalog label
(2023, 0.6 m at the synthetic field center). Image years may vary across the view.
25 tests and build pass. CSP allows only the specific USGS imagery domain needed
for requests; attribution and privacy notices identify USGS. No backend, account
or payment changes were made.

## Public vineyard boundary selection — 2026-09-17

- Added opt-in viewport queries to the official DWR / Land IQ 2023 final crop map through its published ArcGIS proxy. Only vineyard-class candidates are requested, at zoom 14+, capped at 100; limited results ask the user to zoom further.
- Candidate outlines, county, identifier, source/year and reported area are previewed before adopting. Existing 0.1–100 ha / single polygon / no holes / 199-corner restrictions remain; unsupported geometry is never silently truncated.
- Adopted boundaries can be adjusted with Terra Draw. Source provenance is retained as a GeoJSON foreign member in existing `fields.boundary`; adjusted shapes are labeled. No schema, grants or RLS changes.
- Queries disclose viewed map area to DWR’s ArcGIS service (Esri); notice shown before lookup and added to privacy policy. No paid service or subscription.
- Saved a separate public Napa vineyard from the DWR crop map (about 4.99 ha) for evaluation through the existing authenticated insert flow. Original synthetic boundary and its historical cache retained. Public classification does not verify wine-grape subtype, ownership or current crop.
- Irregular-field acceptance exposed a pre-existing comparison coverage bug: the constant Process API output band counted the bounding rectangle. Comparison now uses polygon pixel centers on the exact raster grid (including cloudy/nodata pixels inside the field in the denominator); older comparison caches are recomputed on the next allowed refresh. Added a triangular-field regression test.
- Verified new field refresh: 513 in-field paired pixels, 100% joint coverage, NDVI change +0.0132, no provider errors. New field has its own current snapshot; the original two-year archive is not copied to different geometry.
- Verification: 28 tests pass, production build passes (existing large map bundle warning), production candidate query and map-click selection pass. Frontend deployment 71fbc52f-a536-4242-a4ae-270dbdedc4cf; field-data version 12.

## Public vineyard history backfill — 2026-09-17

- User explicitly requested the new public vineyard's history. Added only field `9fc961da-710d-4e0c-96e8-a13503fc43e8` to the existing acceptance backfill allowlist; field ownership authentication, monthly caching and fixed two-year window remain unchanged.
- Backfilled 2024-09-18 through 2026-09-17 independently for its boundary. All 25 monthly records complete: 124 qualified NDVI observations, 727 ET₀ days, 730 rainfall records (provider missing values retained).
- One March 2025 satellite request failed transiently; one targeted cache-cooldown reset allowed a manual retry, which succeeded. Completed sources reused from cache.
- 28 tests and production build pass (existing large bundle warning). Frontend deployment df7c13d5-6497-4e87-8b7f-dc7aa4170a66; field-data version 13.

## Today overview — 2026-09-18

- Replaced the NDVI-only Today summary with one dominant 7-day reference ET₀ total and adjacent previous-week comparison. A complete seven-day window is required; partial weeks never become a total and values more than three days behind are unavailable. Dates, source resolution and non-prescription meaning are visible.
- Three local-calendar NWS forecast groups use actual remaining periods, temperature ranges and highest period rain probability. Unknown rain remains unknown; expired periods/alerts excluded and forecasts older than 12 hours labeled.
- Compact paired NDVI change map (latest NDVI fallback), date/coverage and a shared-axis calendar overlay of this year versus last year. Current teal solid versus prior gray dashed/open marks; >7-day gaps disconnect, no normal-band/health-score claims. Main app's existing native SVG chart surface and palette retained.
- New overview helper tests cover missing/stale weeks, adjacent windows, leap-year alignment and forecast grouping. 31 tests pass; production build passes with the existing map bundle-size warning. 390px mobile layout visually checked and viewport reset.
- No backend, provider, account or subscription changes.
