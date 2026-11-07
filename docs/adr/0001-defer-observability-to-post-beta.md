# Defer dedicated runtime observability to post-beta

**Status:** accepted (2026-06-13)

A daily-insight product would normally ship with error tracking, uptime monitoring, and alerting
from day one. For the free open beta we deliberately **defer** that stack (Sentry/GlitchTip, uptime
monitor, status page, incident runbook, on-call) to keep solo build effort on the product itself,
**accepting the risk** that failures may go unseen. We retain only a near-zero-cost **daily-orchestrator
heartbeat** (alert if the 6am job fails to complete) and lean on the §13.2 product-analytics and §13.3
accuracy dashboards as a coarse, lagging health signal.

## Considered options

- **Lean ops stack now** (error tracking + uptime + heartbeat + runbook) — the recommended-best-practice
  option; rejected for beta on solo time/cost grounds, with the explicit intent to add it at the revisit
  trigger below.
- **Full SRE** (PagerDuty rotation, OTel tracing, SLO error budgets) — rejected as far more than an open
  beta needs.
- **Nothing at all** — rejected; the heartbeat is cheap enough to keep even while deferring.

## Consequences (the non-obvious part)

The heartbeat catches **total** failure but not **partial/degraded** failure — the job completes but N
farms silently got no/stale/wrong insight, a client-side error, or a data-quality regression. Two real
costs follow, both specific to *being in beta*:

1. **It breaks the "every morning" promise silently** — the worst moment for trust is exactly the beta,
   and growers who quietly churn don't file a complaint.
2. **It poisons the data the beta exists to collect** — a pipeline outage looks like a retention dip or a
   bad-accuracy signal in §13.2/§13.3, so you can't tell "growers didn't act" from "we never sent
   anything." Decisions made on corrupted beta metrics are the real hazard.

## Revisit trigger

Promote to the lean ops stack at the **first** of: the first paying grower (monetization gate, §11.G
Tier B), the first observed silent outage, or ~10 active farms depending on the daily job. This ADR is
then superseded by one recording that adoption.
