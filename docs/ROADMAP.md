# CultiSync — Roadmap

Updated 2026-10-12.

## What CultiSync is

A free tool that shows what is happening on a California wine-grape block, using public data only:
Sentinel-2 imagery and NDVI with cloud screening, before/after comparisons, NWS forecasts and alerts,
CIMIS reference ET₀, NASA POWER rainfall, USDA soil and lidar terrain. Every value carries its source
and timestamp, and missing data is never shown as zero. The code will be published under Apache-2.0.

## What it does not do

It does not say how much to irrigate, when to spray or when to pick. There are no frost, disease,
ripening or deficit-irrigation models, no AI assistant, no notifications and no paid plans. Field
boundaries are supplied by the user or taken from the public DWR crop map; they are not surveys.

## Milestones

| When | Work |
|---|---|
| October 2026 | Remove the illustrative demo, plan gating, AI chat, simulator and pricing page; the Water tab shows observations only (ET₀, rainfall, soil water storage) Done. |
| November 2026 | Automated deploys; a keepalive three times a week with capacity warnings; a cap of 100 accounts to stay within free quotas. Done. |
| December 2026 – January 2027 | A printable field evidence report with a SHA-256 hash of the underlying data; a per-field data download; KML boundary import. Done (October 2026). |
| End of January 2027 | Source code published in a new public repository. Done (November 7, 2026): github.com/alanxuliang/cultisync. |
| January – February 2027 | A methodology page and a validation note on how often usable clear-sky observations occur through the year; an open dataset and a demo that works without an account, both on Hugging Face |
| February – March 2027 | Self-hosted California terrain tiles, if a feasibility check passes |
| From April 2027 | Maintenance: bug fixes and keeping data sources working |

Limits stay as they are: California only, 3 fields per account, 0.1–100 ha per field.
