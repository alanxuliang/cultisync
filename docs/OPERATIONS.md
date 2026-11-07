# CultiSync — Operations runbook

How the running service is put together, deployed and kept alive. Written 2026-10-12; replaces the
provisioning half of the earlier execution runbook. Items marked **planned** are scheduled in
[ROADMAP.md](ROADMAP.md) and not built yet.

## 1. What runs where

| Platform | What it runs | Configuration |
|---|---|---|
| Cloudflare Workers Static Assets | The built SPA at https://cultisync.com, with SPA fallback and security headers, plus a keepalive cron three times a week (`worker/`) | `wrangler.jsonc`, `public/_headers`, `public/_redirects` |
| Supabase | Email one-time-code sign-in, Postgres with PostGIS and row-level security, the `field-data` edge function | `supabase/migrations/`, `supabase/functions/field-data/` |
| Resend | Sign-in email, through Supabase Auth's custom SMTP | Supabase dashboard (Auth → SMTP) |
| Hugging Face (**planned**, January 2027) | Public dataset, static demo Space, batch jobs | Pushed by Forgejo Actions (`.forgejo/workflows/huggingface.yml`) |

Source of truth: the maintainer's private Forgejo repository (`main`). The public GitHub repository is a
published copy refreshed with `scripts/export_public.mjs`; nothing deploys from it.

## 2. Secrets and settings (names only)

| Name | Where it lives | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Build environment (`.env.local` locally) | Public by design; inlined into the bundle |
| `VITE_PUBLIC_BETA_READY` | Build environment | Keep `false` until public sign-up is intended |
| `SENTINELHUB_CLIENT_ID`, `SENTINELHUB_CLIENT_SECRET` | Supabase edge-function secrets | CDSE OAuth client; expires 2026-12-16. Before then, create a new client in the CDSE dashboard and replace both secrets |
| `CIMIS_APP_KEY` | Supabase edge-function secrets | DWR Spatial CIMIS |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Provided to edge functions by Supabase | Never in a `VITE_` variable or the repository |
| SMTP credentials | Supabase dashboard | Resend |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Forgejo Actions secrets (repository settings) | For `.forgejo/workflows/deploy.yml` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `ALERT_FROM`, `ALERT_TO` | Worker secrets (`npx wrangler secret put <NAME>`) | Keepalive call to `public.ping()` and warning email; `RESEND_API_KEY` is send-only, `ALERT_FROM` is on the verified sender domain |
| `HF_TOKEN` | Forgejo Actions secret (**planned**, January 2027) | Write access to the dataset and Space only |

No real value is ever committed. `.env.example` lists the build variables with placeholders.

## 3. Deploying

**Frontend and keepalive Worker.** Every push to `main` on Forgejo runs `.forgejo/workflows/deploy.yml`: test, build
with the Supabase secrets, refuse a bundle without the Supabase client, then `wrangler deploy` (static
assets and the cron Worker together). A manual run is available from the repository's Actions tab on Forgejo. Every push also runs
`.forgejo/workflows/checks.yml`, including the database tests in `supabase/tests/run_db_tests.sh`.

The Cloudflare account comes from `CLOUDFLARE_ACCOUNT_ID`; `wrangler.jsonc` holds no account identifier,
and both the workers.dev route and version preview URLs are disabled, since they would sit on the
account's workers.dev subdomain. The site is served only from the custom domain.

**Publishing the public copy.** From a clean checkout of `main`, run
`node scripts/export_public.mjs <public checkout>`; it refuses a dirty source, any target that overlaps
the source or contains internal plans, and any checkout whose origin is not the public repository, and it
removes files that are no longer public. Review the diff and the printed `docs/` list, run gitleaks and
the identifier scan, then `npm ci && npm test && npm run build` in the public checkout; if anything
fails, discard the export there with `git reset --hard` and `git clean -fd`, fix the private repository
and export again. With approval, commit as `Publish <source sha>` with the checks in the body and push.

**Manual fallback** (for example while the Forgejo runner is unavailable). Needs an interactive
`wrangler login` and the two Supabase build variables; without them the Supabase client is dropped from
the bundle and `/app` cannot sign in.

```sh
npm ci
npm test
npm run build
npx wrangler deploy --dry-run
npx wrangler deploy
```

The live bundle hash never matches a local build made without the Supabase variables, so compare bundle
strings rather than hashes when checking what is live.

**Edge function (manual).** After `npx supabase login` and `npx supabase link --project-ref <ref>` in an
interactive terminal:

```sh
npx supabase functions deploy field-data
npx supabase secrets set NAME=value
```

**Database migrations.** Files in `supabase/migrations/` are applied with `npx supabase db push` after
linking, or through the Supabase MCP's `apply_migration`. Each file name must start with the version
recorded in production (`list_migrations`); a migration applied any other way gets a new timestamp, so
rename the local file to match, or `db push` will try to run it again.

## 4. Built-in protections

- One refresh per field per hour (`claim_field_refresh`); a second request inside the hour returns the
  cached snapshot.
- Cache lifetimes: satellite statistics and image views 24 hours, rainfall 1 day, soil 30 days. A
  completed before/after comparison is reused until the date pair changes; a failed one retries at most
  daily.
- When a source fails, the previous value is kept with its original timestamp and the error is shown.
  Missing observations are never shown as zero.
- The two-year history backfill is limited to the evaluation fields listed in
  `supabase/functions/field-data/history.js`.
- Limits per account: 3 fields, each 0.1–100 ha, California only, one polygon without holes.
- At most 100 accounts can complete consent (`private.enforce_account_cap` trigger); the 101st sees a
  capacity message.

## 5. Data sources and what happens when one fails

| Source | Used for | When it fails |
|---|---|---|
| NOAA / NWS | Forecast and active alerts | Forecast error shown; alerts failing alone do not block the forecast |
| DWR Spatial CIMIS | Reference ET₀ (California, 2 km) | Error shown; previous values kept |
| Copernicus Sentinel-2 via CDSE | NDVI statistics, image views, comparisons | Error shown; previous values kept. Free quota is 10,000 processing units a month |
| NASA POWER | Modelled daily rainfall | Error shown; previous values kept |
| USDA NRCS SSURGO | Soil water storage and restriction depth | Error shown; previous values kept |
| OpenFreeMap | Default basemap | Map error shown; GeoJSON import still works |
| USGS NAIP | Optional aerial basemap | Message suggests switching back to the simple map |
| Mapterhorn | Terrain and low/high-ground tint | Tiles fail silently (MapLibre falls back to parent tiles). **Planned:** hide the toggle |
| DWR / Land IQ crop map | Picking a public field boundary | "Public boundaries are unavailable"; drawing still works |

## 6. Routine checks

- **Monthly, 30 minutes:** the keepalive Worker's Cron Events in the Cloudflare dashboard (a failed run
  means the ping failed or a warning email was not delivered), CDSE processing-unit usage, Supabase
  database size and project status, Resend volume, CI status, Hugging Face billing and job runs (from January 2027), feedback inbox.
- **Quarterly:** run `npm outdated` and `npm audit` and update dependencies on a branch (Forgejo has no
  Dependabot); check expiry dates of the CDSE client (next: 2026-12-16), CIMIS key and any
  deploy tokens.
- **Each February:** run an evaluation field end to end against every source before the growing season.

## 7. Warning signals

Warnings, not automatic shutdowns:

- database above 80% of 500 MB, or 90 of the 100 accounts used: the keepalive Worker emails `ALERT_TO`
  (Mondays, Wednesdays and Fridays, 16:17 UTC), and also emails when its own database read fails;
- CDSE usage above 80% of the monthly quota;
- any provider starting to charge, or total cost heading past US$30/month;
- routine operations above 4 hours a month for 3 months running.

If hosting is ever wound down: close sign-ups, tell users to export, hard-delete their data as the
privacy notice promises, keep the code public, and redirect the domain to the static demo.

## 8. Known gotchas

- The Vite dev server does not pick up edits to the `@import`-ed token CSS in `src/styles/tokens/`;
  restart it.
- The dev server ignores `public/_headers`, so Content-Security-Policy breakage only shows in production.
  `tests/basemap.test.js` checks that the terrain tile origin is allowed by the CSP.
- Without `.env.local`, `/app` cannot reach Supabase locally, so the field map never renders. Verify map
  changes with a temporary harness page that mounts `FieldMap` directly, and delete it afterwards.
- MapLibre does not fire `error` events for missing tiles, so tile 404s need no filtering.
