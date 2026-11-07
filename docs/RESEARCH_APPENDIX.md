# CultiSync — Research Appendix

> **Status 2026-10-12.** Dated research, kept as a sourced reference. Under the free, observation-only
> direction in [ROADMAP.md](ROADMAP.md), Domain A (agronomy constants for irrigation, disease, phenology
> and frost models) and the billing, sales-tax and data-accumulation parts of Domain D back features the
> project no longer plans to build. Domains B and C remain current. References to
> `IMPLEMENTATION_PLAN.md` and its decision numbers point to an internal planning document that is not
> published.

> **Purpose.** This appendix backs the `[ILL]` (illustrative, pending calibration) constants and the
> deferred §10 open questions in `IMPLEMENTATION_PLAN.md` with real, cited evidence. It turns
> illustrative agronomic constants into sourced starting values, vague API/quota/compliance assumptions
> into specifics, and deferred decisions into answered ones — **within** the 17+2 locked decisions
> (stack, crop = CA wine grape, region = California are settled, not relitigated here).
>
> **How to read it.** 16 research tasks (T1–T16) are grouped into four domains: **A. Agronomy core**
> (RDI, FAO-56, disease, phenology/Brix/frost), **B. Geospatial & weather data** (Sentinel Hub, SCL,
> CIMIS, SoilGrids, Open-Meteo, NDVI calibration), **C. Platform & scheduling** (Supabase cron/pg_net,
> free-tier ceilings), and **D. Legal, tax & billing** (CA SaaS tax, CCPA, Stripe).
> Each finding gives: the **question**, the **concrete recommended value/spec (with units)**,
> **confidence**, **residual uncertainty** (what still needs an agronomist / counsel / empirical pilot
> calibration before un-tagging), and a **numbered source list** with URLs and the specific key fact per
> source.
>
> **Confidence legend.** `high` = grounded in primary/authoritative docs, safe to lock now;
> `medium` = directionally sound and sourced but the exact decimals still need pilot or expert sign-off
> before removing the `[ILL]` tag.
>
> **Caveat that applies to every agronomy value (A).** No CA source publishes per-stage, phenology-keyed
> TAW-depletion or per-varietal RDI decimals; growers schedule by plant water potential. The values below
> are the best-sourced *starting* constants and the *shape* is defensible, but final decimals require an
> agronomist plus one season of pilot data (paired SMI / stem-water-potential logs). Keep `[ILL]` until
> sign-off.

---

## Domain A — Agronomy core (RDI, FAO-56, disease, phenology/Brix/frost)

These back §2 Decision 11, §6.5 viticulture core, §6.7 water balance, §6.6 insights rules, and §10 Risk 1
/ Risk 8 / the open question on per-stage RDI by varietal.

### A1 (T2) — RDI per-stage ETc-deficit fractions and the crop-safety stem-water-potential floor

**Question.** Are the plan's `RDI_CONSTANTS` (kc_deficit 0.90 / 0.75 / 0.50 / 0.65 / 0.60) defensible for
CA wine grapes, and what is the never-exceed crop-safety floor that the hard SMI floor should be anchored to?

**Recommended value/spec.**
- **kc_deficit (fraction of full ETc applied — NOT a fraction of TAW):** budbreak–bloom **0.90** (keep);
  bloom–fruitset **0.75** (keep); fruitset–veraison **0.50** (keep, deepest stress); veraison–harvest
  **0.65** (keep; allow **0.75** for premium reds); post-harvest **revise 0.60 → ~0.85** (range 0.80–1.00)
  — return toward full ETc for root flush/reserves (high-confidence correction).
- **Style/variety keying.** Red premium fruitset–veraison **0.45–0.50** at Ψ_stem **−1.1 to −1.3 MPa**;
  red bulk **0.55–0.60** at **−0.9 to −1.1**; white **0.60–0.70** at **−0.8 to −1.0**. Variety
  sensitivity most→least: **Merlot, Cabernet Sauvignon, Syrah, Zinfandel**.
- **Water balance.** Depletion fraction **p = 0.45–0.50**, so RAW = p·TAW ≈ 0.45·TAW (plan's 0.45 is
  conservative).
- **Hard SMI floor.** Target `Dr ≤ 0.60·TAW` (i.e. **SMI ≥ 0.40**); calibrate this floor to
  **Ψ_stem = −1.4 MPa** via paired SMI/Ψ_stem pilot logs. Absolute clamp `Dr ≤ 0.90·TAW` (keep).
- **Ψ_stem bands (van Leeuwen):** none > −0.6; weak −0.6 to −0.9; weak–moderate −0.9 to −1.1;
  moderate–severe −1.1 to −1.4; severe < −1.4 MPa. **Sweet spot −1.2 to −1.3 MPa; never-exceed ≈ −1.4 MPa.**
- **Leaf→stem conversion:** Ψ_stem = Ψ_leaf + 0.2 MPa (r² 0.92, Williams-Araujo 2002). Williams/Prichard
  thresholds are *leaf*, so leaf −1.4/−1.5 ≈ stem −1.2/−1.3. UC ANR irrigation-start leaf WP: SJV −1.0,
  coastal −1.2; white −1.0 to −1.3; red −1.3 to −1.5 MPa.

**Confidence.** medium.

**Residual uncertainty.** No CA source gives per-stage TAW-depletion targets keyed to phenology, so
depletion targets must be derived from the Ψ_stem bands plus pilot calibration (pin the 0.60·TAW floor to
−1.4 MPa stem with one season of paired SMI/Ψ_stem logs). Exact kc_deficit decimals interpolate coarser
literature bands; per-style offsets are extrapolated from leaf-WP thresholds; the 0.2 MPa leaf-to-stem
offset is from a single strong study and can vary by cultivar/rootstock. Post-harvest fix (→~0.85) is
high-confidence. Agronomist sign-off required before un-tagging.

**Sources.**
1. Williams, L.E. — *Deficit irrigation of wine grape vineyards* (UC Davis / UC ANR Kearney REC).
   https://my.ucanr.edu/repository/a/?a=177652 — Yield maximized at 60–80% full ETc; ≤50% season-long
   reduces yield; irrigation starts at midday leaf WP −1.0 MPa (SJV) / −1.2 (coastal); Carneros Chardonnay
   no yield diff 25–125% ETc; 65–75% of berry size set fruit-set→veraison.
2. Prichard, Smith, Verdegaal (UCCE) — *Regulated Deficit Irrigation Management for Winegrapes*.
   https://www.vineyardteam.org/files/Regulated_Deficit_Irrigation_Mgmt.pdf — Deficits begin at ~50%
   depletion of available water (RAW ≈ 0.5·TAW); successful RDIs run 50–60% full water use, 35–40% too
   severe; post-harvest reset to 100%; white start −10 to −13 bars vs red −13 to −15 bars leaf WP; variety
   order Merlot, Cab Sauv, Syrah, Zinfandel.
3. Bogart, K. (UC Davis), reporting Williams & Araujo 2002 — *Pressure Chamber Methods*.
   https://agwaterstewards.org/wp-content/uploads/2016/08/Pressure_chamber_methods_bogart-2.pdf — Midday
   leaf and stem WP correlated r² 0.92; stem ≈ 0.2 MPa less negative than leaf; Ψ_stem = Ψ_leaf + 0.2 MPa.
4. IntechOpen review — *Effects of Vine Water Status on Yield and Wine Composition*.
   https://www.intechopen.com/chapters/67833 — Stem WP −1.2/−1.3 MPa required to maintain yield & must
   quality; at/below −1.4 MPa clearly detrimental; 60–80% ETc maximizes yield, 25–50% improves red
   composition.
5. van Leeuwen / Choné — stem-water-potential classification, *Ann. Bot.* 2001.
   https://academic.oup.com/aob/article/87/4/477/2588407 — Ψ_stem bands: none > −0.6; weak −0.6 to −0.9;
   weak–moderate −0.9 to −1.1; moderate–severe −1.1 to −1.4; severe < −1.4 MPa; most discriminating for
   moderate/severe deficits.
6. LODI RULES Sustainable Winegrowing — Water Management. https://www.lodirules.org/About —
   Certification mandates plant/soil-based scheduling, a water plan, and a distribution-uniformity test;
   no numeric per-stage ETc/TAW thresholds (supports methodology, not constants).

---

### A2 (T3) — FAO-56 Kc and Zr / p for CA wine grapes

**Question.** What are the citable FAO-56 crop coefficients (Kc), rooting depth (Zr), and depletion
fraction (p) for wine grapes, including the CA shaded-area refinement?

**Recommended value/spec.**
- **Kc (FAO-56 Table 12, Grapes-Wine):** ini **0.30**, mid **0.70**, end **0.45**. CA stage lengths
  (days): 20 / 50 / 75 / 60 = **205 total**, plant March.
- **CA shaded-area refinement:** `Kc = 0.017 × %shaded_area − 0.008` (UC ANR; 23.6% → 0.39; Sonoma
  ~`%shaded × 0.017`, 30% → 0.51).
- **Zr (Table 22):** default **1.0 m**, range 1.0–2.0 m.
- **p (Table 22):** default **0.45**; adjust `p_adj = 0.45 + 0.04 × (5 − ETc)`, clamp **0.1–0.8**.
- **Krdi:** 0.35–0.65 (young vines 1.00).

**Confidence.** high.

**Residual uncertainty.** Kc-vs-shaded-area is the CA-preferred method (better than leaf area per
Williams & Ayars) but per-parcel %shaded needs measurement; Zr default 1.0 m needs agronomist confirm
(0.6–1.2 m typical pilot range).

**Sources.**
1. FAO-56 Tables 11 & 12. https://www.fao.org/4/x0490e/x0490e0b.htm — Grapes-Wine Kc 0.30 / 0.70 / 0.45;
   Calif. stage lengths 20 / 50 / 75 / 60 = 205, plant March.
2. FAO-56 Table 22. https://www.fao.org/4/x0490e/x0490e0e.htm — Grapes-Wine Zr 1.0–2.0 m, p 0.45;
   `p = p_table + 0.04 × (5 − ETc)` bounded 0.1–0.8.
3. UC ANR SLO — Paso Panel crop coefficients.
   https://ucanr.edu/county-office/county-san-luis-obispo/crop-coefficients-paso-panel —
   `Kc = 0.017 × %shaded − 0.008`; 23.6% → 0.39; cites Williams & Ayars.
4. UCCE Sonoma — Determining Irrigation Requirements.
   https://ucanr.edu/county/ucce-sonoma-county/determining-irrigation-requirements —
   `Kc ≈ %shaded × 0.017`; 30% → 0.51; Krdi 0.35–0.65, young vines 1.00.
5. Williams & Ayars 2005. https://www.sciencedirect.com/science/article/abs/pii/S016819230500153X —
   Lysimeter (Thompson Seedless, SJV); shaded area predicts Kc better than leaf area.

---

### A3 (T4) — Gubler-Thomas powdery-mildew Risk Index + defensible CA downy model

**Question.** What is the exact canonical Gubler-Thomas (GT) algorithm (hot-temperature deduction,
combined rule, two-phase mechanism, index→action mapping, a worked reference series to unit-test
against), and what is the defensible CA downy-mildew model and severity cap?

**Recommended value/spec.**
- **Two-phase index (stateful, seasonal carry, clamp 0–100, max +20/day, max −10/day):**
  - *Pre-epidemic (index < 60):* qualifying day (≥6 continuous hours **70–85°F**) → **+20**; non-qualifying
    day → **RESET to 0** (not −10). Three consecutive qualifying days: 20 → 40 → 60 → epidemic under way.
  - *Spray phase (index reached 60):* qualifying → **+20**; non-qualifying → **−10**;
    reached **95°F for >15 min** (not a qualifying day) → **−10**; **BOTH** ≥6 h 70–85°F **AND** ≥95°F
    for ≥15 min → **+10** (the combined rule the plan currently omits).
- **Index→action (UC IPM table):** 0–30 LOW (DMI 21-day, sulfur 14–21 day); 40–50 MODERATE (DMI 21-day,
  sulfur tightened 10–17 day); 60+ HIGH (DMI **10-to-14-day** interval per the current UC IPM page; **7-day**
  per older UC PMG/APSnet wording — use the **7–14 day** band, sulfur not recommended at high temps).
- **Insight cut points (defensible inside that table):** index **≥60 → 'urgent'** (tighten DMI to 7–14
  day); **30–59 → 'watch'** (hold 21-day DMI, consider tightening sulfur to 10–17 day); <30 info/none.
- **Unit-test reference series (assert exact carry):**
  - Onset (published): 0 → 20 → 40 → 60.
  - Pre-epidemic reset: 0; Q, non-Q, Q → 20, **0**, 20 (NOT 30).
  - Post-epidemic from 60: Q→80; Q→100 (clamp); non-Q→90; hot-only→80; (Q & hot)→90 (+10); non-Q→80.
  - Floor: 20; non-Q→10; non-Q→0; non-Q→0 (can't go below 0).
- **Downy mildew (generic, capped 'watch' in CA):** primary-infection **"3-10 rule"** = shoots ≥10 cm
  **AND** air temp ≥10°C **AND** ≥10 mm rain over ~24–48 h (Australian "10-10-24" variant = ≥10°C + ≥10 mm
  continuous over 24 h). Secondary infection: only 1.5–2 h leaf wetness at 59–77°F. Sporulation: 95–100%
  RH + ≥4 h darkness + temp >13°C. Incubation ~4–5 d at 20–25°C, ≥14 d at ≤12°C.
  **CA cap = 'watch' (never 'urgent')** — UC IPM: "Limited rainfall in spring and summer generally limits
  the spread of the disease in California."
- **[ILL] calibration upgrade (default OFF):** 2013 Thomas/Gubler revised heat penalty replaces the single
  35°C/0.25 h rule with **34°C/4 h, 36°C/4 h, 38°C/2 h**.

**Confidence.** high.

**Residual uncertainty.** Lock the **canonical single-rule heat penalty** (95°F >15 min → −10) as the
unit-test baseline; flag the 2013 multi-threshold revision `[ILL]` (the primary *Plant Disease* 2013 paper
could not be fetched to confirm whether it replaces the −10 magnitude or only the trigger). The
post-epidemic worked series' hot/combined branches are reconstructed deterministically from the published
per-rule logic (only the 0→20→40→60 onset is directly published) — have an agronomist or the UC IPM tool
sanity-check the hot/combined rows before locking the golden assertion. The High (≥60) DMI interval
moved: the UC IPM page as fetched now states **10-to-14-day**, while older UC PMG/APSnet wording said
**7-day** → use the **7–14 day** urgent band (tighter is conservative, and the live 10–14 day sits inside
it). The downy Goidanich hour-by-temperature matrix is deferred. The CA 'watch' cap is well-justified and
low-risk.

**Sources.**
1. UC IPM — Powdery Mildew / Grape Pest Management Guidelines (Risk Index Model).
   https://ipm.ucanr.edu/agriculture/grape/powdery-mildew/ — Canonical two-phase GT: start 0, +20 per
   qualifying day (≥6 continuous h 70–85°F), reset to 0 until index 60, epidemic at 60; spray phase +20 /
   −10 / −10 (95°F >15 min) / +10 (both); clamp 0–100; spray table 0–30 Low / 40–50 Moderate / 60+ High.
2. UC IPM — Grape Powdery Mildew Risk Assessment Index (tool landing page).
   https://ipm.ucanr.edu/weather/grape-powdery-mildew-risk-assessment-index/ — UC hosts the official daily
   index tool; confirms the running seasonal total and points to the PMG for the algorithm.
3. bioRxiv — *Modeling Uncertainty in Grapevine Powdery Mildew Epidemiology Using Fuzzy Logic*.
   https://www.biorxiv.org/content/10.1101/264622.full.pdf — GT needs 3 consecutive days with ≥6 h at
   21–30°C, +20 each (20/40/60) to trigger; GT is the most widely adopted CA model.
4. American Vineyard Foundation — *Revising the Gubler-Thomas Model*.
   https://avf.org/research-summary/revising-the-gubler-thomas-model-for-powdery-mildew-adding-a-revised-high-temperature-threshold-varietal-susceptibility-and-expanding-public-access/ —
   Original 35°C/0.25 h high-temp threshold revised (Thomas/Gubler, *Plant Disease* 2013) to 34°C/4 h,
   36°C/4 h, 38°C/2 h.
5. UC IPM — Downy Mildew / Grape Pest Management Guidelines.
   https://ipm.ucanr.edu/agriculture/grape/downy-mildew/ — "Limited rainfall in spring and summer
   generally limits the spread of the disease in California"; optimal infection 68–77°F; CA risk only
   after wet winter + late-spring/early-fall rains.
6. International Wine Challenge / Canopy — *Downy mildew: is the 3-10 model still valid?*
   https://www.internationalwinechallenge.com/Canopy-Articles/downy-mildew-with-climate-change-is-the-3-10-model-still-valid.html —
   European 3-10 = shoots ≥10 cm + temp >10°C + 10 mm continuous rain over 24–48 h; Australian 10-10-24
   variant; Goidanich Index for secondary.
7. APSnet — grapevine downy mildew secondary-infection & sporulation thresholds.
   https://www.apsnet.org/edcenter/pdlessons/Pages/DownyMildewGrape.aspx — Secondary infection needs only
   1.5–2 h leaf wetness at 59–77°F; sporulation 95–100% RH + ≥4 h darkness + >13°C; incubation ~5 d at
   20–25°C, ≥14 d at ≤12°C.
8. UC IPM — Downy Mildew of Grape (Home & Landscape).
   https://ipm.ucanr.edu/home-and-landscape/downy-mildew-of-grape/ — Develops late winter/spring when warm
   & wet and after early-fall rain; favored by moisture — consistent with episodic, rain-driven CA risk.

---

### A4 (T5) — Phenology GDD anchors, post-veraison Brix slope, harvest Brix targets, frost ladder

**Question.** What cited values replace the illustrative phenology GDD anchors, the Brix-per-GDD slope
(plan's k ≈ 0.011), the per-style harvest Brix targets, and the flat frost critical temperatures — and is
there a unit error?

**Recommended value/spec.**
- **FIRST, fix the GDD unit frame.** Phenology anchors, Brix k, and RDI stage gates all depend on one
  consistent frame. The plan's veraison ~1100 / harvest ~1700 only make sense as **from-season-start
  F-days**, not from-budbreak. Keep one frame (recommended: base-10°C C-days from budbreak; divide Napa
  F-day figures by 1.8 and re-base).
- **Phenology (base-10°C GDD from budbreak):** budbreak = 0; bloom (EL-23) ~250–350; fruit-set (EL-27)
  ~400–500; veraison (EL-35) ~900–1100 (~600–800 from bloom); harvest ~1600–1900. Chardonnay earlier,
  Cabernet later.
- **Brix slope (CORRECTION — plan's k = 0.011 is ~2.5× too low / a unit mismatch):**
  `brix = brixAtVeraison + k × gddSinceVeraison`; **brixAtVeraison = 7.0** (6–8);
  **k = 0.028 Brix/C-day** (≈ 0.015 Brix/F-day). veraison–harvest span ~610–670 C-days; cap active accrual
  ~23 Brix. (k = 0.011 over 600 C-days adds only 6.6 Brix → 13.6, can't reach 24 → mutually inconsistent.)
- **Harvest Brix by style:** sparkling 18–20 (def 19); white 21–23 (def 22); red 23–26 (def 24–25);
  late-harvest >26. Fire harvest insight within ~14 days or within ~1.5 Brix of target.
- **Frost ladder (stage-gated kill table, T10/T90 °F — replaces flat −2/0/+2):** bud swell 21/10;
  bud burst 25/16; first leaf 27/21; second leaf 28/22; third leaf 28/26; fourth leaf 28/27.
  Alert Tmin (post-budburst): advisory ≤32–34°F, moderate ≤28–30°F, severe ≤25–28°F. Fire advisory
  **earlier** when dew point is low (sprinklers start at 37.3°F at dewpoint 23°F). Gate green-tissue
  frost insight to EL 4–27; Web Push danger-only.

**Confidence.** medium.

**Residual uncertainty.** The plan must fix the GDD unit frame before anything else (the current 1100/1700
anchors + k=0.011 are internally inconsistent, a C-day/F-day mixup). Cumulative GDD-from-budbreak varies
~2× by cultivar/convention; literature reports stage *spans*, not from-budbreak cumulatives, for
veraison/harvest. k ≈ 0.028 Brix/C-day is back-derived (veraison Brix ~7 + red target ~25 + Napa Cab span),
not a single published k. The frost kill table is Concord + generic wine grapes, not CA vinifera, and wet
tissue is damaged at warmer temps — keep the ladder conservative. Dew-point lead-time offset needs the
pilot microclimate feed. All anchors, k, brixAtVeraison, and per-style targets need pilot-block agronomist
sign-off before un-tagging.

**Sources.**
1. AJEV 68(1):60 — *Predicting Key Phenological Stages for 17 Grapevine Cultivars*.
   https://www.ajevonline.org/content/68/1/60 — From budbreak: bloom 240–372 DD; from bloom: veraison
   556–800 DD; budbreak 78–180 DD; cultivar-specific Tb.
2. eVineyard (UC/Winkler synthesis) — *Why calculate GDD in vineyard*.
   https://www.evineyardapp.com/blog/2017/03/01/why-the-need-to-calculate-growing-degree-days-in-vineyard/ —
   Base 10°C from Mar 1: Chardonnay ~75 GDD budburst / 345 flowering; Cabernet ~87 / 375.
3. Wikipedia — Winkler index (Amerine-Winkler, UC Davis). https://en.wikipedia.org/wiki/Winkler_index —
   GDD base 50°F = 10°C; Region I < 2500 (Chard/Pinot/Riesling), II 2500–3000 (Cab/Merlot).
4. MorningAgClips — California 2023 winegrape harvest / Napa Cab GDD.
   https://www.morningagclips.com/california-2023-winegrape-harvest-promises-high-quality-despite-the-late-start/ —
   Napa Cabernet veraison ~1100–1300 GDD, harvest ~2200–2500 GDD (base 50°F); veraison→harvest ~40–60 days.
5. Frontiers 2024 — *Phloem anatomy predicts berry sugar accumulation*.
   https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2024.1360381/full — Brix fitted
   as logistic of GDD (TBASE=10°C); "Maximum Delta Brix per GDD" is the defined rate metric.
6. AJEV 76(2) — *Active and Passive Changes in Sugar Concentration during Grape Ripening*.
   https://www.ajevonline.org/content/76/2/0760019 — Active sugar accumulation stops ~23 Brix then rises
   passively as berries lose 6–15% weight; veraison Brix ~6–8.
7. WineMaker Magazine — *Determining Ripeness*. https://winemakermag.com/technique/1083-determining-ripeness —
   Red 23–25 Brix (Pinot target 25, actual 24.8); white Chardonnay 23; Champagne under-ripe.
8. Wider River Winery — *Sugar Levels of Grapes*. https://wideriverwinery.com/sugar-levels-of-grapes/ —
   Desirable 18–24 Brix by variety/style; table wines 19–25; California 22–28.
9. MSU Extension — *How Cold Can Grapes Go?* (WSU Concord + Rutgers).
   https://www.canr.msu.edu/grapes/weather_climate/how-cold-can-grapes-go — Kill table °F: bud burst
   T10 25/T90 16; first leaf 27/21; second 28/22; third 28/26; fourth 28/27; full swell 21/10.
10. Penn State Extension — *Preventing Spring Frost Damage to Grapes*.
    https://extension.psu.edu/understanding-and-preventing-spring-frost-and-freeze-damage-to-grapes —
    −2 to −3°C permanently damages green tissue post-budbreak; Pinot LT50 ~26°F green swollen bud, 28°F
    budburst, 29°F 2-leaf, 30°F 4-leaf.
11. Sonoma RCD — *Vineyard Frost Protection: Northern Coastal California*.
    https://sonomarcd.org/wp-content/uploads/2017/06/Vineyard-Frost-Protection.pdf — Wind machines on when
    air 5 ft just above critical temp before inversion; sprinklers hold tissue 32°F but start earlier at
    low dew point (37.3°F at dewpoint 23°F); heaters+wind protect to ~26°F.
12. eVineyard — *How to prevent vineyard frost damage?*
    https://www.evineyardapp.com/blog/2019/07/03/how-to-prevent-vineyard-frost-damage/ — Wind machines
    commonly on at ~32–34°F for radiative frost; use tissue temp, RH, dew point not air temp alone.

---

## Domain B — Geospatial & weather data (Sentinel Hub, SCL, CIMIS, SoilGrids, Open-Meteo, NDVI)

These back §4.2 (valid-pixel semantics, soil θ, weather composition), §6.3 NDVI, §6.4 weather/soil/CIMIS,
§9 external costs & quotas, and §10 Risks 1/3/4.

### B1 (T1) — Sentinel Hub CDSE free-tier Processing-Unit quota and per-request cost

**Question.** What is the real CDSE Sentinel Hub free-tier quota and per-request PU cost at pilot scale,
and which meter binds first?

**Recommended value/spec.**
- **CDSE free tier is monthly-renewing, NOT a finite trial:** **10,000 PU/month + 10,000 requests/month**,
  reset on the 1st; **300 req/min, 300 PU/min**. (The finite trial is the *separate* commercial 30-day
  account on the sentinel-hub platform — use the **free CDSE account**.)
- **PU formula:** `(px/262144) × (bands/3) × format × samples × proc`; area factor min **0.01**;
  FLOAT32 = 2. Min charge Process/OGC **0.005 PU**, Statistical **0.01 PU**.
- **CultiSync sizing (1–10 ha):** NDVI Statistical observation = **0.01 PU + 1 request**; a tile is
  1.0 PU (512×512) up to 23.8 PU (2500×2500). ~950 parcels fit under 10,000 PU/mo, so the **binding cap is
  10,000 requests/month** (plus the 300 req/min ceiling).

**Confidence.** high.

**Residual uncertainty.** The 10,000 req/month cap (distinct from PU) is the likely binding constraint at
pilot scale — issue **one Statistical request per clear pass per parcel** to keep the 0.01 PU floor.
Re-verify figures at build time.

**Sources.**
1. CDSE — Quotas. https://documentation.dataspace.copernicus.eu/Quotas.html — Free CDSE: 10,000 PU/mo +
   10,000 req/mo, reset 1st of month; 300 req/min, 300 PU/min (the load-bearing binding-meter facts).
   (Note: this page carries the quota numbers; the PU **formula** and per-request **minimum charges** below
   are documented on the separate Processing Unit page — source 2.)
2. CDSE — Processing Unit (PU) definition.
   https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/ProcessingUnits.html — PU formula
   `px/262144 × bands/3 × format × samples × proc`; area factor min 0.01; FLOAT32 = 2; min charge
   Process/OGC 0.005 PU, Statistical 0.01 PU (so the 0.01-PU-per-Statistical-observation costing is
   traceable here, not on Quotas.html).

---

### B2 (T6) — SCL keep-set and clear-pass valid-fraction threshold

**Question.** What is the recommended Sentinel-2 Scene Classification (SCL) keep-set, and what
`CLEAR_PASS_MIN_VALID_FRACTION` threshold backs `is_clear`?

**Recommended value/spec.**
- **Strict keep-set: `{4, 5, 6}`** (vegetation, bare soil, water); mask `{0,1,2,3,7,8,9,10,11}`,
  explicitly excluding class **7 (unclassified)**. Permissive `{4,5,6,7}` is citable but admits more
  class-7 contamination.
- **Per-class:** drop 3 (cloud shadow — depresses NDVI, least reliable); drop 8/9/10 (cloud probability,
  not certainty); drop 11 (snow); drop 7 (unclassified — cloud edges/haze land here); class 6 (water) is
  harmless and legitimately yields negative NDVI.
- **No custom dilation** — SCL is already Sen2Cor-dilated (+80 m cloud / +40 m shadow / +20 m snow).
- **Threshold:** `CLEAR_PASS_MIN_VALID_FRACTION = 0.60` default (band 0.50–0.90); `is_clear` unchanged at
  ≥ 0.60. Lower 0.50 = more passes / more contamination; raise 0.75–0.90 = cleaner but more no-clear-pass
  gaps.
- **Tiny parcels** (~1 ha ≈ 25 native 20 m px): add an absolute valid-pixel floor near **10–20 px**.

**Confidence.** medium.

**Residual uncertainty.** Class-7 keep-vs-drop is a calibration decision; the 0.60 threshold needs CA pilot
calibration.

**Sources.**
1. Sentinel Hub forum — *L2A Scene Classification for Sentinel-2*.
   https://forum.sentinel-hub.com/t/l2a-scene-classification-for-sentinel-2/51 — Validity reference
   `validate()` masks SCL **{3,7,8,9,10}** (and keeps class 1, saturated/defective); class 7 (unclassified)
   masked out. (Immaterial to the keep-set {4,5,6} logic adopted here — class 1 is masked either way under a
   keep-only-{4,5,6} rule.)

---

### B3 (T7) — Statistical API evalscript dataMask and valid-pixel-fraction fields

**Question.** What is the correct Statistical API evalscript (dataMask) and the right denominator for
`valid_pixel_fraction` over a non-rectangular parcel?

**Recommended value/spec.**
- The Statistical API does **not** auto-exclude clouds/no-data; it averages over **every pixel in the
  request bounding box** unless the evalscript emits a `dataMask` output band of 0 to drop pixels. Per-band
  stats live at `data[i].outputs[id].bands.B0.stats` = `{min,max,mean,stDev,sampleCount,noDataCount}`.
- **`sampleCount` is the bbox total, not the parcel** — so the plan's formula over raw `sampleCount` is
  **wrong** for a non-rectangular parcel. Use a footprint-only second output: parcel pixels =
  `footprint.sampleCount − footprint.noDataCount` (= geometryPixelCount); valid pixels =
  `ndvi_mask.sampleCount − ndvi_mask.noDataCount`; `valid_pixel_fraction = valid / parcel` (else 0);
  `is_clear = fraction ≥ 0.60`.
- **Evalscript v3:** declare inputs `B04, B08, SCL, dataMask` and three outputs — `ndvi` (1 FLOAT band),
  `ndvi_mask` (1 byte), `footprint` (1 byte). Keep-set SCL `{4,5,6,7}` **as written here is the *permissive*
  set** (matches the plan's operational default); **B2/T6 recommends the *strict* `{4,5,6}` default**
  (drop class 7). The evalscript shape is identical either way — swap the single keep-set constant.
  `keep = dataMask × sclOk × validNdviFlag`; the `ndvi` output **must emit its own dataMask = keep** so its
  mean/min/max/stDev are over valid pixels only (the masked mean directly). Aggregation interval P1D, input
  type `sentinel-2-l2a`.

**Confidence.** high.

**Residual uncertainty.** The keep-set is a calibration call (plan keeps water 6 and unclassified 7, but
the official example masks water out — can lower mean NDVI and inflate valid fraction); validate against
the golden fixture. The denominator MUST use the footprint-only output, not raw `sampleCount`. Verify once
live that masked stats cover only the ndvi output's dataMask=1 pixels and that the extra-output cost is
negligible.

**Sources.**
1. Sentinel Hub — Statistical API. https://docs.sentinel-hub.com/api/latest/api/statistical/ — dataMask
   output 0 excludes a pixel; `sampleCount` is total bbox pixels, `noDataCount` the dataMask-excluded
   pixels; geometryPixelCount = sampleCount − noDataCount.
2. Copernicus — Statistical API Examples.
   https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical/Examples.html — Evalscript
   inputs B04 B08 SCL dataMask, outputs `data` + `dataMask`; response path
   `data[].outputs[id].bands[band].stats{min,max,mean,stDev,sampleCount,noDataCount}`; example masks water
   class 6.
3. SH Forum (staff) — Statistical API sampleCount & noDataCount.
   https://forum.sentinel-hub.com/t/statistical-api-samplecount-and-nodatacount/4453 — `sampleCount` is
   width × height of the bbox; valid pixels = sampleCount − noDataCount.

---

### B4 (T8) — Spatial CIMIS variable coverage and per-variable multi-source composition

**Question.** Which variables does coordinate-query CIMIS actually serve, and how should the daily record
be composed per-variable (and how should `ca_validated` be redefined)?

**Recommended value/spec.**
- **Coordinate (lat/lng) queries hit the Spatial CIMIS System (SCS) ONLY, which serves only two daily
  items:** `day-asce-eto` (ASCE **grass-reference ET0** = FAO-56 ET0, directly substitutable) and
  `day-sol-rad-avg` (Rs). It does **not** serve precip/temp/RH/wind/dewpoint/leaf-wetness — those come only
  from the Weather Station Network (WSN) via station/zip queries. (Do NOT confuse `day-asce-eto` with
  `day-asce-etr` = tall/alfalfa reference, NOT ET0.)
- **Rule reword:** "never blend two sources within the **same field/day**, but DO compose the daily record
  **per-variable** from the authoritative source for each field." Taking ET0 from one source and
  precip/temp from another is per-field assignment, not an intra-field blend — the plan's rule is correct;
  the composition does not violate it.
- **Default CA coordinate-parcel record:** Spatial-CIMIS ET0 + Spatial-CIMIS Rs + **Open-Meteo
  precip/tmax/tmin/RH** (ERA5-Land archive for past days, forecast model for future). A vetted CIMIS WSN
  station within **≤15–20 km** may override the Open-Meteo precip/temp/RH and upgrade those fields to
  `ca_validated`. **Leaf wetness is served by neither provider — always modeled, always generic.**
- **CIMIS call:** `GET https://et.water.ca.gov/api/data?appKey={KEY}&targets={lat,lng}&startDate=…&
  endDate=…&dataItems=day-asce-eto,day-sol-rad-avg&unitOfMeasure=M`; **max 1,750 records/request**
  (records = targets × days × dataItems).
- **QC-flag gating:** value `Qc` blank/space = passed → eligible for `ca_validated`; `M` missing, `R` far
  out of limits, `H` from flagged hourly → **degrade ET0 to Open-Meteo/Hargreaves and label generic**
  (treat `Y` moderately-out as degraded).
- **Redefine `ca_validated` per-derived-output:** ET0/water-budget-driven outputs (RDI) earn it only when
  Spatial-CIMIS ET0 has a blank QC flag, the parcel is inside the CA boundary polygon (`ST_Contains`, not
  bbox), and the crop is wine grape. Outputs driven by modeled precip/temp/RH (GDD/phenology/frost,
  disease) default **generic** unless a tight-radius station supplied that field. Store a per-field
  provenance map in `raw` jsonb and compute confidence from it.

**Confidence.** high.

**Residual uncertainty.** The exact blank-QC semantics (and whether S/Q/N flags also gate) need the CIMIS
QC PDF opened directly (JS-gated). No published per-appKey rate quota beyond 1,750 records/request — test
throttling empirically in the pilot (degrade-to-Open-Meteo is the right hedge). The **≤15–20 km tight-radius
threshold** for trusting a WSN station over Open-Meteo is a genuine pilot-calibration value for CA
microclimates (start 15 km coastal / 20 km inland and tune). Spatial-CIMIS ETo COG archive
(data.cnra.ca.gov, 2004–present) is a viable bulk fallback but adds raster-sampling complexity (not needed
for MVP).

**Sources.**
1. CIMIS REST API Reference. https://et.water.ca.gov/Rest/Index — SCS supports ONLY `day-asce-eto` and
   `day-sol-rad-avg`; coordinate queries are SCS-only (no WSN alternative); WSN supplies the full daily
   set; zip queries route via `prioritizeSCS`; appKey required; values carry Qc flag + Unit.
2. California Open Data — CIMIS Weather Station & Spatial CIMIS Data Web API.
   https://data.ca.gov/dataset/cimis-weather-station-spatial-cimis-data-web-api — Spatial CIMIS provides
   daily statewide ETo and Rs at a 2 km grid (GOES + ~150 stations), plus zip-averaged ETo; WSN stations
   measure Rs, air temp, soil temp, RH, precip, wind.
3. CNRA — Spatial CIMIS ETo maps. https://data.cnra.ca.gov/dataset/cimis-spatial-eto-maps — 2 km daily ETo
   computed with ASCE Penman-Monteith; Rs from NOAA GOES (Heliosat-II); air temp/RH/wind spline-interpolated
   as inputs but the gridded product distributes ETo and Rs, not standalone precip/temp/RH/wind.
4. ASCE-EWRI 2005 — Standardized Reference ET Equation.
   https://www.mesonet.org/images/site/ASCE_Evapotranspiration_Formula.pdf — Two reference surfaces:
   ETos (short, clipped 0.12 m grass = FAO-56 ET0) vs ETrs (tall, alfalfa); `day-asce-eto` = grass ref,
   `day-asce-etr` = alfalfa ref (NOT interchangeable with ET0).
5. CIMIS Data Quality Control Procedures.
   https://cimis.water.ca.gov/Content/PDF/CIMIS%20Data%20Quality%20Control%20Procedures.pdf — QC flags:
   M=missing, Y=moderately out of limits, R=far out, H=hourly-flagged; blank = passing → require blank Qc
   for `ca_validated`, degrade on M/R.
6. Open-Meteo — Forecast & Historical Weather API. https://open-meteo.com/en/features — Daily API supplies
   temperature_2m_max/min, precipitation_sum, relative_humidity_2m_*, et0_fao_evapotranspiration globally;
   Historical API serves ERA5/ERA5-Land hourly 1940–present with no gaps — the authoritative complement for
   precip/temp/RH on CA coordinate parcels where SCS gives only ET0+Rs.

---

### B5 (T9) — SoilGrids 2.0 wv0033/wv1500, unit conversions, Saxton-Rawls fallback

**Question.** Does SoilGrids 2.0 natively publish field-capacity/wilting-point, what are the unit
conversions, and what is the fallback when the layers are null or the API fails?

**Recommended value/spec.**
- SoilGrids 2.0 natively publishes **`wv0033`** (33 kPa field capacity) and **`wv1500`** (1500 kPa wilting
  point) at six depths with mean/Q0.05/Q0.5/Q0.95. **Primary:** `theta_fc = wv0033/1000`,
  `theta_wp = wv1500/1000` (raw units 10⁻³ cm³/cm³; 277 → 0.277). These are Turek-2023 random-forest mappings
  on real WoSIS lab retention — avoids a client-side pedotransfer guess (but stays *modeled* confidence).
  **Unit-conversion trap:** the ISRIC FAQ table lists the `wv0033`/`wv1500` "conversion factor" as **10**,
  which yields **vol%** (e.g. 277 → 27.7%); divide the raw value by **1000** to get the **0–1 fraction**
  stored here (277 → 0.277). Both are correct for their respective target units — do **not** "correct" the
  `/1000` to `/10`, which would store vol% and silently inflate TAW by 10×.
- **Fallback = Saxton-Rawls 2006** (texture-only) when `wv` is null (coastal/water mask) or the request
  fails. Inputs are **decimal fractions 0–1** (not percent): `S=sand/1000, C=clay/1000,
  OM=(soc_dg_kg/10/1000)×1.724`.
  `t1500 = −0.024S + 0.487C + 0.006OM + 0.005(S·OM) − 0.013(C·OM) + 0.068(S·C) + 0.031`;
  `theta_wp = t1500 + (0.14·t1500 − 0.002)`.
  `t33 = −0.251S + 0.195C + 0.011OM + 0.006(S·OM) − 0.027(C·OM) + 0.452(S·C) + 0.299`;
  `theta_fc = t33 + (1.283·t33² − 0.374·t33 − 0.015)`.
  **Validation vectors (wp, fc):** silt loam → (.114, .277); sandy loam → (.076, .145); loam → (.140, .253);
  clay → (.313, .427).
- **Conversion divisors:** clay/sand/silt 10, soc 10, bdod 100, phh2o 10, cec 10, cfvo 10, nitrogen 100,
  ocd 10. `TAW_mm = (fc − wp) × Zr × 1000`.
- **ISRIC REST is beta, no SLA, fair-use 5/min** (returned 503 this session; ISRIC has paused it before).
  Ingest must be **async/queued**, never block field creation; degrade to a regional default
  (CA sandy-loam fc ~0.18 / wp ~0.08, `source=regional_default`) and enqueue; worker stays <5/min,
  coalesces parcels at 3 decimals, backs off on 429/5xx.
- **Endpoint:** `rest.isric.org/soilgrids/v2.0/properties/query?lon&lat&property=wv0033/wv1500/clay/sand/
  silt/soc/bdod/phh2o&depths=0-5…60-100cm&value=mean`.

**Confidence.** high.

**Residual uncertainty.** CA-vineyard accuracy of wv0033/wv1500 not quantified (Turek paper paywalled);
pilot calibration vs CIMIS/UC-ANR soils warranted before un-tagging (not a blocker — native layers already
remove the client-side guess). Depth-weighting (interval-thickness vs root-decay) is an agronomic choice
(interval-thickness is the safe default). SOC→OM 1.724 (van Bemmelen) varies 1.7–2.0. ISRIC beta/no-SLA →
pin v2.0 and monitor. Regional-default θ (FC ~0.18 / WP ~0.08) is illustrative pending confirmation of the
CA pilot dominant soil series.

**Sources.**
1. ISRIC SoilGrids FAQ (conversion table).
   https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html — wv0010/wv0033/wv1500 in
   10⁻³ cm³/cm³ → /1000 for fraction; clay/sand/silt 10, soc 10, bdod 100, phh2o 10, cec 10, cfvo 10,
   nitrogen 100, ocd 10; six depths; Q0.05/Q0.5/mean/Q0.95.
2. SoilGrids250m 2.0 Volumetric Water Content (GEE catalog).
   https://developers.google.com/earth-engine/datasets/catalog/ISRIC_SoilGrids250m_v2_0 — wv0033 = field
   capacity (33 kPa), wv1500 = wilting point (1500 kPa); /1000 for cm³/cm³; six depths.
3. ISRIC geonetwork metadata — wv1500.
   https://data.isric.org/geonetwork/srv/api/records/f5a1188a-09f8-4ef6-b841-93f08e3903f4 — wv1500
   wilting-point in 10⁻³ cm³cm⁻³; /1000 → 150 = 0.150.
4. fetchSoilGrids (soilDB reference). https://ncss-tech.github.io/soilDB/reference/fetchSoilGrids.html —
   Queries `rest.isric.org/soilgrids/v2.0/properties/query`; defaults mean/Q0.05/Q0.5/Q0.95 over six
   depths; same conversion factors.
5. ISRIC REST entry page (fair-use / no-SLA). https://rest.isric.org/ — Fair use 5 calls/min; beta,
   occasional downtimes, no uptime/support guarantee; returned 503 during this session.
6. GEE Thornthwaite-Mather tutorial (SoilGrids → Saxton-Rawls).
   https://developers.google.com/earth-engine/tutorials/community/groundwater-recharge-estimation —
   sand/clay ×0.01 to fractions, OM = organic carbon ×1.724; confirms t1500/t33 coefficients & corrections;
   inputs dimensionless fractions.
7. Saxton & Rawls 2006, *SSSAJ* 70:1569–1578.
   https://acsess.onlinelibrary.wiley.com/doi/abs/10.2136/sssaj2005.0117 — Canonical PTF estimating field
   capacity (33 kPa) and wilting point (1500 kPa) from sand, clay, organic matter.
8. SoilGrids FAQ (Turek 2023 wv derivation).
   https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs.html — wv layers cite Turek et al. global
   mapping of volumetric water retention using WoSIS; random-forest mapped from lab retention, not a
   texture-only PTF; coastal nodata needs fallback.

---

### B6 (T10) — Open-Meteo soil-moisture layers, depth integration, ET0 precedence, pricing

**Question.** What are the Open-Meteo soil-moisture layers and their root-zone integration, the ET0
fallback precedence, and the commercial-use trigger/pricing?

**Recommended value/spec.**
- **Layers (θ m³/m³).** Forecast (ICON/GFS/IFS): `0_to_1` (1 cm), `1_to_3` (2), `3_to_9` (6), `9_to_27`
  (18), `27_to_81` (54). Historical (ERA5/ERA5-Land): `0_to_7` (7), `7_to_28` (21), `28_to_100` (72),
  `100_to_255` (155).
- **Root-zone rule (integrate-then-compare, never cross-reconcile raw layers):**
  `overlap_i = max(0, min(top_i+thk_i, Zr) − top_i)`; `theta_rz = Σ(overlap_i·θ_i) / Σ(overlap_i)`.
  At **Zr = 0.8 m** (denom 80): Forecast weights 1/80, 2/80, 6/80, 18/80, 53/80; Historical 7/80, 21/80,
  52/80 (100–255 excluded for Zr ≤ 1 m). Store `weather_cache.kind='modeled_soil'`,
  `soil_moisture_vwc = theta_rz`, `soil_depth_cm = round(Zr·100) = 80` (integrated, not a raw layer).
  **PAW% lives only in `soil_water_state`:** `clamp((theta_rz − theta_wp)/(theta_fc − theta_wp), 0, 1)×100`.
- **ET0 precedence (CA):** (1) CIMIS Spatial `day-asce-eto`; (2) Open-Meteo daily
  `et0_fao_evapotranspiration` (FAO-56 PM); (3) FAO-56 Hargreaves
  `0.0023·Ra·(Tmean+17.8)·√(Tmax−Tmin)` (Ra from lat+DOY) only if 1 and 2 null.
- **Pricing/§9.** Free is non-commercial only: <10,000/day, 5,000/hr, 600/min, 300,000/mo
  (api.open-meteo.com). **Any Stripe subscriber makes the app commercial** → paid (customer-api.open-meteo.com):
  Standard $29/mo = 1M (Forecast); **Professional $99/mo = 5M is REQUIRED for the Historical Weather API**
  (ERA5/ERA5-Land archive + ET0 backfill). Self-host AGPLv3/Docker = no-fee alternative; CC BY 4.0 link
  required.

**Confidence.** high.

**Residual uncertainty.** Zr-weights recompute per field from stored `root_depth_zr_m` (0.8 m default;
agronomist to confirm 0.6–1.2 m). Free caps 429 under bursts → use the paid endpoint in production, but the
binding constraint is the **commercial requirement** (the moment payments are on). Prices/Historical-behind-
Professional are current as of June 2026 — re-verify at contract. Paid-SaaS = commercial matches
Open-Meteo's own examples but is ultimately their call; self-host AGPLv3 removes the trigger.

**Sources.**
1. Open-Meteo Forecast API Docs. https://open-meteo.com/en/docs — Forecast layers 0_to_1 / 1_to_3 / 3_to_9
   / 9_to_27 / 27_to_81 cm m³/m³; `et0_fao_evapotranspiration` daily FAO-56 PM.
2. Open-Meteo Historical Weather API Docs. https://open-meteo.com/en/docs/historical-weather-api —
   Historical layers 0_to_7 / 7_to_28 / 28_to_100 / 100_to_255 cm m³/m³; ERA5 + ERA5-Land; et0 daily mm.
3. Open-Meteo Terms. https://open-meteo.com/en/terms — Free under 10,000/day, 5,000/hr, 600/min,
   300,000/mo; commercial = subscriptions or ads; CC-BY 4.0.
4. Open-Meteo Subscriptions for Commercial Use.
   https://openmeteo.substack.com/p/api-subscriptions-for-commercial — Standard $29/mo = 1M; Professional
   $99/mo = 5M adds Historical/Ensemble/Climate.
5. Open-Meteo Pricing. https://open-meteo.com/en/pricing — customer-api.open-meteo.com; Standard 1M,
   Professional 5M, Enterprise 50M+; paid unlimited rate; free 300,000/mo.
6. Open-Meteo GitHub. https://github.com/open-meteo/open-meteo — AGPLv3 source; Docker self-host; data
   CC BY 4.0 with visible Open-Meteo.com link.

---

### B7 (T16) — Vineyard NDVI at 10 m: inter-row dilution, vigor breakpoints, noise floor, CA revisit

**Question.** How should whole-parcel Sentinel-2 NDVI be interpreted for vineyards (Decision 4, Risk 3),
what vigor breakpoints and noise floor are real (Risk 3/4), and what is the CA revisit/staleness cadence?

**Recommended value/spec.**
- **Inter-row dilution (Decision 4, Risk 3):** whole-parcel S2 NDVI runs **~0.2–0.3 below true canopy**
  (measured S2 block 0.35 vs UAV pure-vine 0.68; satellite vineyard avg 0.27, max 0.47). Native 10 m cannot
  reliably extract pure-vine without UAV fraction-cover or super-resolution → keep **relative-delta + a
  mandatory dilution caveat**; row-aware NDVI is a documented future refinement.
- **Vigor breakpoints (§6.3/§6.5 `ndviToScaleStop`):** absolute breakpoints are **not meaningful** for
  whole-parcel vineyard NDVI — replace fixed 0.25/0.40/0.55/0.70 classing with **within-parcel quantiles
  per pass** (low < P20, medium P20–P80, high > P80; quintiles for the 5-band ramp). Keep the five color
  stops only as a qualitative tile legend; if a fixed tile scale is unavoidable, anchor **~0.10–0.50** not
  0.25–0.70. Add a within-parcel **min-spread guard** (class only when P80 − P20 > ~2× noise).
- **Noise floor (§6.3/§6.5 deltaTone & NDVI-drop scout):** single-pass S2 NDVI **1σ ≈ 0.02**
  (RMSE 0.02; ground RMSE 0.01; changes >0.1 NDVI/day are data errors). A between-pass delta carries
  **~0.03 noise**, so the plan's +0.01 / −0.02 tone thresholds sit **below 1σ and fire on noise** —
  widen to **~±0.03 to 0.05** or require two-consecutive-clear-pass persistence. Keep the **−0.08 scout**
  (~2.5–3σ) with both passes `is_clear` (valid fraction ≥ 0.60).
- **Revisit & staleness (§9, Risk 4):** 290 km swath; **5-day** equatorial twin revisit; **effective 2–3
  days at CA mid-latitudes** from adjacent-orbit overlap, so the 5-day acquisition calendar is conservative.
  Clear-pass cadence is Mediterranean-seasonal: **~3–6 days Jul–Oct**, **7–14+ days Nov–Mar** and during
  the May–Jun coastal marine layer (Napa ~260 sunny days/yr). Size the **staleness banner season-aware:
  green ≤5–6 d, amber 7–10 d, stale >10–14 d.** The PU-burn gate keying the conservative 5-day calendar
  stays correct.

**Confidence.** medium.

**Residual uncertainty.** Figures are direction-and-size, not universal CA constants — need CA-pilot UAV or
ground calibration and an empirical per-parcel clear-pass history before hard-coding. Vigor classing needs
a min within-parcel spread guard. The 0.02 noise floor is from forest/cropland, not vineyards, so the delta
band is a floor. Roy et al. BRDF corroboration is search-snippet only.

**Sources.**
1. Consolidated vineyard NDVI evidence — BIO Web Conf OIV 2022, PMC8036331, PMC5579479, SentiWiki/ESA,
   ESA eo4society WineEO, Napa climate. https://pmc.ncbi.nlm.nih.gov/articles/PMC8036331/ —
   S2 block NDVI ~0.35 vs UAV pure-vine ~0.68 (bioconf OIV 2022); vigor by within-field P20/P80, satellite
   vineyard NDVI avg 0.27 max 0.47 (PMC8036331); satellite-ground RMSE ~0.02, ground 0.01, >0.1/day is a
   data error (PMC5579479); 290 km swath, 5-day equatorial twin, effective 2–3 days in CA from overlap
   (SentiWiki/Wikipedia); S2 10 m not ideal for viticulture, remedy super-resolution and fCover
   (eo4society.esa.int); Napa ~260 sunny days/yr, marine layer May–Jul.

---

## Domain C — Platform & scheduling (Supabase cron/pg_net, free-tier ceilings)

These back §3 daily flow, §5 phases, §6.8 Sync budget, §9 sizing/quotas, and §10 free-tier-headroom.

### C1 (T11) — Supabase scheduling: pg_cron UTC-only + pg_net fire-and-forget ordering

**Question.** How do farm-local daily jobs get scheduled given pg_cron is UTC-only and pg_net is
fire-and-forget, and what bounds the orchestrator?

**Recommended value/spec.**
- **pg_cron is UTC-only on managed Supabase** (DB is UTC by default, recommended; `cron.timezone` not
  editable; pg_cron 1.6 did not change this). Model farm-local scheduling as a **30-minute UTC tick** whose
  Edge Function filters farms where `hour(now() AT TIME ZONE farm_tz) = target_hour` AND minute < 30 (to
  dedup against the tick). Sub-minute granularity is supported. Dedup via `notification_log` unique on
  `(profile_id, channel, kind, sent_on)` where `sent_on = (now() AT TIME ZONE farm_tz)::date`.
- **Invocation is pg_net `net.http_post`** (returns a bigint id immediately, fires after commit, response
  lands later in `net._http_response` with 6 h TTL) — **fire-and-forget, so cron cannot order the chain**.
  Enforce ordering inside the function:
  - **Option A (MVP default):** one orchestrator Edge Function **per farm** running the five steps with
    in-process sequential awaits (sentinel-fetch → ingest-weather → viticulture core → generate-insights →
    irrigation-daily); whole chain must finish in one wall-clock budget.
  - **Option B (scale):** a **pgmq queue chain** — a cron worker pops the queue, runs one stage, enqueues
    the next; fresh budget + retries per stage.
- **Edge Function limits (the bound on Option A):** wall-clock **400 s paid / 150 s Free**; CPU **2 s/request**
  (excl. async I/O wait); memory **256 MB**. **Invoke per farm, not all-farms-in-one.**

**Confidence.** high.

**Residual uncertainty.** The numeric limits (150 s Free / 400 s paid, 2 s CPU, 256 MB) are current as of
docs fetched June 2026 — Supabase has been raising them; re-verify at build time. On Free the orchestrator
must finish in 150 s (tight if many farms share a UTC tick → prefer per-farm invocation or pgmq). Option A
vs B per phase is an engineering calibration against measured per-step latency (Sentinel Hub + Open-Meteo
round-trips dominate, multi-second each) — instrument step durations in the golden-field pilot before
committing to Option A at scale.

**Sources.**
1. Supabase Docs — Cron. https://supabase.com/docs/guides/cron — Cron can run every second to once a year
   and make an HTTP request (e.g. invoke an Edge Function); confirms sub-minute granularity + HTTP invocation.
2. Supabase Docs — Database configuration.
   https://supabase.com/docs/guides/database/postgres/configuration — Every Supabase DB is UTC by default
   and Supabase strongly recommends keeping it.
3. supabase Discussion 7892 (Cron Job Timezone Issue).
   https://github.com/orgs/supabase/discussions/7892 — pg_cron is locked to UTC with no option to change;
   non-UTC scheduling must be handled by adjusting logic to UTC.
4. supabase Discussion 36383 (Cron Job Timezone).
   https://github.com/orgs/supabase/discussions/36383 — After the pg_cron 1.6 upgrade, per-job local-time
   scheduling is still not built in; baseline remains UTC.
5. Supabase Docs — Scheduling Edge Functions.
   https://supabase.com/docs/guides/functions/schedule-functions — Documented path is
   `cron.schedule(name, schedule, body)` whose body runs `select net.http_post` with the project URL +
   function path, a Bearer Authorization header, and a JSON body.
6. pg_net GitHub README. https://github.com/supabase/pg_net — `net.http_post` returns a bigint request id,
   requests start only after the transaction commits, responses stored later in `net._http_response`
   (6 h TTL); asynchronous, fire-and-forget, never awaits the response.
7. Supabase Blog — Processing large jobs with Edge Functions, Cron, and Queues.
   https://supabase.com/blog/processing-large-jobs-with-edge-functions — A cron job triggers an Edge
   Function that reads a pgmq queue and processes jobs one at a time to stay within timeout limits;
   endorses queue-chain orchestration bounded by the wall-clock limit.
8. Supabase Docs — Edge Function Limits. https://supabase.com/docs/guides/functions/limits — Max wall-clock
   400 s paid / 150 s Free; max CPU 2 s/request; max memory 256 MB.
9. Supabase Docs — Background Tasks.
   https://supabase.com/docs/guides/functions/background-tasks — `EdgeRuntime.waitUntil` responds
   immediately and keeps running until the promise completes, capped by the wall-clock/CPU/memory limits.

---

### C2 (T14) — Free-tier ceilings and binding meters for seven external services

**Question.** What are the real free-tier ceilings and binding meters for the seven external services, and
which two flagged §9 errors are confirmed?

**Recommended value/spec (§9 corrections).**
- **Supabase free:** 500 MB DB, 1 GB storage, **two separate 5 GB meters (5 GB egress + 5 GB cached
  egress** — correcting the plan's 2 GB), 500k Edge Function invocations/mo, 2 active projects, 1-week
  pause, 50k MAU. **DB Branching is Pro-only** at $0.01344/branch-hr → per-branch previews impossible on
  Free (use one shared preview DB or Pro). **Egress binds first**; invocations break ~2,700 farms.
- **MapTiler free:** 100k tile requests/mo, 5,000 sessions/mo, 100 MB. Decision 5 uses **MapLibre GL =
  request model**, so the **100k tile-request cap binds first** (session billing would need the MapTiler
  SDK JS).
- **Resend free:** 3,000/mo and **100/day** → **100/day binds first** (digest breaks above 100 daily
  recipients).
- **Anthropic (correcting wrong 5/25 in §6.8):** sonnet-4-6 = **3 in / 15 out** per MTok; haiku-4-5 =
  **1 in / 5 out**; cache read 0.1× input (0.30 / 0.10). 5/25 is **Opus 4.8**. Sync budget (Sonnet
  effective) = `uncached_in×3 + cached_in×0.30 + out×15` per MTok.
- **Cloudflare Pages free:** 500 builds/mo; static unlimited; Pages Functions count toward the **Workers
  100k req/day + 10 ms CPU** quota.
- **GitHub Actions free:** 2,000 min/mo private repos; public free. The proposed $0.002/min self-hosted
  charge was **postponed Dec 2025** (not in effect).
- **CIMIS free (appKey):** no documented rate limit; only cap is **1,750 data items/query** (ERR2112,
  HTTP 400); invalid appKey = ERR1006, HTTP 403. Degrade to Open-Meteo on timeout/5xx, **403 ERR1006**, and
  **400 ERR2112** (split the query) — **not** a 429. Error shape: HTTP wrapper with `Code` + `Message`.

**Confidence.** high.

**Residual uncertainty.** Supabase does not publish which operations count as cached vs uncached egress —
which 5 GB bucket fills first needs pilot metering. CIMIS publishes no rate limit and the error JSON
envelope is inferred — do a one-shot live probe in Phase 1 to capture the exact body. The MapTiler
binds-first conclusion assumes MapLibre GL (the MapTiler SDK JS would flip the binding meter to sessions).
The GitHub self-hosted charge is **postponed, not cancelled**. Confirm the Resend day-boundary for the
100/day reset.

**Sources.**
1. Anthropic API Pricing. https://platform.claude.com/docs/en/about-claude/pricing — Sonnet 4.6 = 3 in /
   15 out per MTok; Haiku 4.5 = 1 in / 5 out; cache read 0.1× input; Opus 4.8 = 5/25.
2. Supabase Pricing. https://supabase.com/pricing — Free: 500 MB DB, 1 GB storage, 5 GB egress + 5 GB
   cached egress, 500k invocations, 2 projects, 1-week pause; branching Pro-only at $0.01344/branch-hr.
3. MapTiler Cloud Pricing. https://www.maptiler.com/cloud/pricing/ — Free: 100k tile requests/mo, 5,000
   sessions/mo, 100 MB hosting; service pauses until next month when a quota is exhausted.
4. MapTiler — tile requests vs sessions.
   https://docs.maptiler.com/guides/maps-apis/maps-platform/tile-requests-and-map-sessions-compared/ —
   MapTiler SDK JS bills by session; raw MapLibre GL JS uses the request model (each tile fetch counts,
   exhausts faster).
5. Resend — New Free Tier. https://resend.com/blog/new-free-tier — Free: 3,000 emails/mo and 100/day;
   the daily limit binds first.
6. Cloudflare Pages Limits. https://developers.cloudflare.com/pages/platform/limits/ — Free: 500 builds/mo,
   1 concurrent; static unrestricted; Pages Functions count toward the Workers quota.
7. Cloudflare Workers Limits. https://developers.cloudflare.com/workers/platform/limits/ — Workers Free is
   100k requests/day and 10 ms CPU per invocation.
8. GitHub 2026 Actions pricing. https://github.com/resources/insights/2026-pricing-changes-for-github-actions —
   The self-hosted runner per-minute charge planned for March 2026 was postponed Dec 2025; public repos
   stay free.
9. GitHub Docs — Actions billing.
   https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions —
   Free plan: 2,000 Actions minutes/mo private repos; standard runners free on public repos.
10. CIMIS REST Services. https://et.water.ca.gov/Rest/Index — No documented rate limit; ERR1006 invalid
    app key = HTTP 403; ERR2112 data-volume violation = HTTP 400.
11. cimir CRAN package. https://cran.r-project.org/web/packages/cimir/cimir.pdf — CIMIS Web API enforces a
    maximum of 1,750 data items per query.

---

## Domain D — Legal, tax & billing (CA SaaS tax, CCPA, Stripe)

These back §2 Decision 19, §5 Phase 4/9 (billing legal gate, erasure precondition), §6.9 double-subscription
guard, §9 Stripe row, and the §10 open question on the sales-tax/VAT decision.

### D1 (T12) — US SaaS sales-tax map, economic-nexus thresholds, Stripe Tax behavior

**Question.** Does California actually tax SaaS (the §9 premise), which states do, and does Stripe Tax
correctly collect only after nexus is crossed?

**Recommended value/spec.**
- **§9 premise is WRONG — California does NOT tax electronically-delivered SaaS.** Under CDTFA Reg. 1502(f),
  a prewritten program transferred by remote telecommunications with no tangible-personal-property transfer
  is **not taxable**. **A CA-only pilot collects $0.00 sales tax in California** (only physical media /
  bundled tangible goods would change this — N/A for CultiSync). No CA tax registration needed.
- **~24 states DO tax SaaS** (late 2025/2026): AZ, CT, HI, KY, LA, MD, MA, NM, NY, PA, RI, SC, SD, TN, UT,
  VT, WA, DC, WV, plus **Texas** (data-processing, 80% taxable) and **Illinois** (Chicago only, 9% lease
  tax). Conditional/business-use: **Ohio** (business use only), **Connecticut** (1% business / full
  personal), **Iowa** (consumers taxable, commercial exempt). CA/FL/GA/VA/CO-state treat SaaS as
  non-taxable.
- **Economic-nexus thresholds (current/prior year, OR-logic unless noted):** Texas **$500,000** sales only;
  New York **$500,000 AND >100 transactions** (AND-logic, distinctive); Washington/Pennsylvania/
  Massachusetts **$100,000** sales only; Ohio **$100,000 OR 200 tx**; Connecticut **$100,000 AND 200 tx**.
  Common default where unlisted: **$100,000 OR 200 transactions**.
- **Stripe Tax posture (correct as planned):** `automatic_tax:{enabled:true}` + collect billing address;
  treat `unit_amount` as **tax-exclusive**. Tax calculation/collection is **gated on an active registration**
  in Stripe's Locations dashboard — without one, Stripe collects **$0** even with automatic_tax on.
  Threshold-monitoring tracks Stripe sales per customer location vs each state's nexus threshold and
  notifies **within 1–2 days** of crossing (surfaces obligations from ~$10k annual revenue). **Don't
  register CA** (SaaS non-taxable → $0 anyway).
- **PricingPage copy:** "**plus tax where applicable**" (NOT "California taxes SaaS", NOT "tax included").

**Confidence.** high.

**Residual uncertainty.** SaaS taxability and nexus thresholds change frequently with state-specific nuance
(Ohio/CT/Iowa business-vs-personal, Chicago local lease tax, Texas 80% split, marketplace-facilitator
carve-outs). The 24-state list is sourced to one vendor (TaxCloud) cross-checked against Avalara for
thresholds — for any state CultiSync actually approaches nexus, confirm the live taxability + threshold
against that state's DOR and counsel before registering (a compliance call, not just config). The
CA-non-taxable conclusion is high-confidence and grounded in the primary CDTFA regulation. Stripe's exact
post-threshold registration grace window (~30–60 days per snippets) is not authoritatively pinned — treat
as indicative, not contractual.

**Sources.**
1. CDTFA Regulation 1502 — Computers, Programs, and Data Processing.
   https://cdtfa.ca.gov/lawguides/vol1/sutr/1502.html — 1502(f)(1)(D): a prewritten program "is not a
   taxable transaction if the program is transferred by remote telecommunications… and the purchaser does
   not obtain possession of any tangible personal property"; 1502(f)(2)(A): tax does not apply to custom
   programs regardless of form.
2. TaxCloud — California SaaS Sales Tax. https://taxcloud.com/blog/california-saas-sales-tax/ — SaaS is not
   taxable in California because it is a service, not tangible personal property; a CA-only electronic-
   delivery seller collects zero sales tax.
3. TaxCloud — SaaS Sales Tax by State 2026. https://taxcloud.com/blog/saas-sales-tax-by-state/ — 24 states
   tax SaaS (Oct 2025); lists the taxable set; Texas 80% taxable/20% exempt; California non-taxable unless
   downloaded/on media; Ohio/Iowa/Connecticut conditional.
4. Avalara — State-by-state economic nexus laws.
   https://www.avalara.com/us/en/learn/guides/state-by-state-guide-economic-nexus-laws.html — Texas
   $500,000 only; New York $500,000 AND 100 tx; Washington/Massachusetts/Pennsylvania $100,000 only; Ohio
   $100,000 OR 200 tx; California $500,000 only (TPP).
5. Stripe Docs — How Stripe Tax works. https://docs.stripe.com/tax/how-tax-works — Stripe Tax tracks your
   registrations and uses them to calculate and collect taxes; adding a registration in Locations turns on
   calculation/collection; without a registration, tax = $0 regardless of automatic_tax.
6. Stripe Docs — Monitor your obligations. https://docs.stripe.com/tax/monitoring — Tracks Stripe sales by
   customer location vs registration thresholds; "Not collecting tax" when no registration and threshold not
   exceeded; notification within 1–2 days after crossing; alerts begin ~$10,000 yearly revenue.
7. Stripe Docs — Collect tax in the United States.
   https://docs.stripe.com/tax/supported-countries/united-states — Must individually register in each region
   meeting requirements; Stripe only monitors thresholds outside your home region; registrations in
   Locations gate collection.
8. New York economic nexus threshold. https://handsoffsalestax.com/new-york-sales-tax-nexus-threshold/ —
   NY requires BOTH $500,000 gross receipts AND >100 transactions (AND-logic), preceding four sales-tax
   quarters; gross-receipts count includes exempt sales.

---

### D2 (T13) — CCPA deidentification, precise-geolocation SPI, 2026 ADMT applicability

**Question.** Does the de-link-retain `ca_data_log` moat meet CCPA deidentification (Decision 19), is a
Limit-the-Use-of-My-SPI homepage link required, and do the 2026 ADMT regulations apply?

**Recommended value/spec (three determinations).**
- **(a) Deidentification FAILS → erasure default = hard-delete; retain only under a separate accumulation
  opt-in.** Civil Code 1798.140(m) requires all of: reasonable measures, a public no-reidentify commitment,
  recipient contracts, AND data that cannot reasonably be linked to a consumer. Fixed-location daily
  NDVI/weather/phenology timeseries with variety + planting year are highly re-identifiable → de-linking
  `owner_id` is **pseudonymization** (consistent with EDPB Guidelines 01/2025 and the Recital 26
  means-reasonably-likely test). Set `ca_data_log` erasure default to **hard-delete** via
  `CA_LOG_ERASURE_MODE`; run the anonymize UPDATE (null `owner_id`, drop geometry keys) only for opt-in
  rows and only on **counsel approval**.
- **(b) Limit-the-Use-of-My-SPI homepage link NOT required.** Parcel geolocation is precise-geolocation SPI
  (within 1,850 feet) but is used **only to deliver the requested service** and not to infer characteristics
  — Civil Code 1798.121(d) and Reg. 7027(m) exempt that use. A **1798.100 notice-at-collection** covering
  the accumulation/retention **IS required**, and commercial accumulation stays behind the default-off
  opt-in.
- **(c) 2026 ADMT regulations OUT OF SCOPE.** Advisory crop recommendations to a business are not a
  "significant decision" in the five covered categories (finance, housing, education, employment,
  healthcare) and are grower-in-the-loop, never auto-executed. Training agronomic models is out of scope,
  but **processing precise-geolocation SPI is independently a covered risk-assessment activity.** **Flip
  trigger:** any use of the output to drive a lender/insurer/landlord decision about the grower.
- **Engineering branch:** set `ca_data_log` erasure default = hard-delete; anonymize UPDATE (null
  `owner_id`, drop geometry payload keys) only on opt-in + counsel approval; **no homepage limit-link**;
  disclose accumulation in Phase-1 onboarding + Phase-4 Privacy Policy; keep service-consent **separate**
  from the default-off accumulation opt-in; document the ADMT out-of-scope finding; plan an SPI risk
  assessment if CCPA thresholds apply.
- **Dates:** regs effective **2026-01-01**; ADMT compliance **2027-01-01**; risk-assessment completion
  **2027-12-31**; first CPPA submission **2028-04-01**. The B2B exemption sunset **2023-01-01**, so a
  sole-proprietor grower is a consumer.

**Confidence.** medium.

**Residual uncertainty.** Not a substitute for the counsel sign-off Decision 19 requires. The
deidentification fail is solid on the plan facts, but a coarsened/aggregated derivative could meet the
standard on a documented risk assessment → default hard-delete and gate retention on counsel. The
no-limit-link result holds only if geolocation stays service-only; any location-based profiling flips it.
ADMT out-of-scope holds unless a financing/insurance/leasing integration drives a covered decision. CCPA
applicability thresholds at pilot scale are unconfirmed; GDPR applies to any EU users regardless. One
secondary source implied 2027-04-01 for ADMT, but the official CPPA announcement and Greenberg Traurig
state 2027-01-01.

**Sources** (fetched; primary statute + regulatory guidance):
1. Cal. Civ. Code §1798.140 (leginfo.legislature.ca.gov) — deidentified three prongs; precise geolocation
   within 1,850 feet is SPI.
2. Cal. Civ. Code §1798.121(d) — non-inferential SPI used only to perform the service is exempt from the
   right to limit.
3. Cal. Civ. Code §1798.100 — notice-at-collection; incompatible-secondary-use bar.
4. CPPA announcement (cppa.ca.gov/announcements/2025/20250923.html) — regs effective 2026-01-01, ADMT
   2027-01-01, attestation 2028-04-01.
5. Skadden, *CCPA Regulations* (skadden.com, 2025/10) — significant-decision five categories; model-training
   trigger.
6. Greenberg Traurig, *CCPA 2026* (gtlaw.com) — ADMT 2027-01-01; risk-assessment completion 2027-12-31;
   CPPA submission 2028-04-01.
7. CCPA Reg. 7027(m) — permitted purposes for SPI; clym.io right-to-limit guidance — no limit-link when SPI
   is used only for permitted purposes.
8. EDPB Guidelines 01/2025 (edpb.europa.eu) — pseudonymised data stays personal data.
9. Freshfields *Technology Quotient* (freshfields) — CCPA B2B exemption sunset 2023-01-01.

---

### D3 (T15) — Stripe Customer Portal cancellation config + native limit-to-one-subscription

**Question.** How is portal cancellation configured (Phase-4 gotcha), and does Stripe's native
limit-to-one-subscription feature let §6.9 drop its manual double-billing guard?

**Recommended value/spec.**
- **(A) Cancellation.** Configure at Dashboard → Settings → Billing → Customer portal; the **Cancel
  subscription** toggle (Cancellation management section) **defaults On**. **Phase-4 gotcha:** Stripe keeps
  **separate portal configurations per mode** (one live, one per test sandbox) — you must **save settings in
  each mode** to create that mode's default config. `create-portal-session` with `configuration` omitted
  falls back to the default, but **if no default is saved in that mode the call fails** (telling you to save
  portal settings). **Make "config saved in test AND live" an explicit checklist item + E2E precondition —
  the cancel E2E fails in test and prod if skipped** even though Cancel defaults On.
- **(B) Native limit-to-one.** Stripe Checkout/pricing-table/Payment Links can redirect customers who
  already have an active subscription to the Customer Portal (detect via the Customer object or email).
  **But it is hosted no-code surfaces ONLY, requires the public login link kept On, and omits `trialing`** —
  so it **cannot** provide the §6.9 webhook-level `owner_id`-unique double-bill protection. **Keep all three
  §6.9 guards:** (1) the server plan-status check in `create-checkout-session`, (2) the webhook
  `ON CONFLICT (owner_id)` upsert + Stripe-cancel of the displaced sub, (3) PricingPage routing of
  already-subscribed users to the Portal. The native feature is optional defense-in-depth (and since
  CultiSync uses trials, the `trialing` omission is itself a reason not to rely on it).

**Confidence.** high.

**Residual uncertainty.** The exact error string for the no-default-config case is paraphrased (the rendered
API page did not surface the literal text), but the requirement to save a default config per mode is
directly confirmed. Whether `trialing` is caught by the native feature is undocumented (only Active/PastDue/
Unpaid/Paused listed) — itself a reason not to rely on it.

**Sources.**
1. Stripe — Configure the customer portal. https://docs.stripe.com/customer-management/configure-portal —
   Cancellation setting under Cancellation management is "Cancel subscription", default On; portal can also
   capture reasons and offer a retention coupon.
2. Stripe — Integrate the customer portal with the API.
   https://docs.stripe.com/customer-management/integrate-customer-portal — Stripe maintains distinct portal
   configurations (one live, one per sandbox); you must save settings in the Dashboard to create the default
   config, and repeat in live mode.
3. Stripe API — Create a portal session.
   https://docs.stripe.com/api/customer_portal/sessions/create — The `configuration` parameter is optional:
   if not specified the session uses the default configuration, so a default must exist in that mode.
4. Stripe API — Customer Portal Session. https://docs.stripe.com/api/customer_portal/sessions — Creating a
   portal session before saving portal settings errors, directing you to save settings at the mode-specific
   URL; configured separately for Live and Test.
5. Stripe — Limit customers to one subscription.
   https://docs.stripe.com/payments/checkout/limit-subscriptions — Redirects customers with an active sub to
   the portal or your site; detects via Customer object or email; requires the no-code portal active and
   login link enabled; active statuses Active/PastDue/Unpaid/Paused (trialing not listed).

---

## Quick crosswalk — finding → plan sections it resolves

| Task | Domain | Resolves (plan §) | [ILL]/deferred item made concrete |
|------|--------|-------------------|-----------------------------------|
| T1 | B | §9 Sentinel Hub, §6.3, §10 headroom | CDSE free-tier PU quota; req/mo is the binding cap |
| T2 | A | §6.5 RDI_CONSTANTS, §6.7, §2 Dec 11, §10 RDI Q | Per-stage kc_deficit + Ψ_stem −1.4 MPa floor |
| T3 | A | §6.5, §6.7, §4.2, §10 | FAO-56 Kc/Zr/p + CA shaded-area Kc |
| T4 | A | §6.5, §6.6, §8 QA, §10 | Canonical Gubler-Thomas + downy 'watch' cap |
| T5 | A | §6.5, §6.6, §6.7, §10 Risk 1 | Phenology GDD frame fix, Brix k=0.028, frost ladder |
| T6 | B | §6.3, §4.2, Dec 4, §10 | SCL keep-set {4,5,6}; CLEAR_PASS 0.60 |
| T7 | B | §6.3, §5 P1, §4.2, §8, §10 | Statistical API evalscript + footprint denominator |
| T8 | B | §6.4, §3, §2 Dec 16, §6.6, §9, §10 | CIMIS ET0-only coverage; per-variable composition; ca_validated redefine |
| T9 | B | §6.4, §4.2, §9, §10 Risk 1 | SoilGrids wv0033/wv1500 + Saxton-Rawls fallback |
| T10 | B | §6.4, §4.2, §9, §3, §10 | Soil-moisture layers + Zr integration + ET0 precedence + commercial trigger |
| T11 | C | §3, §4.2, §5 P1/2/3/7, §9, §10 | pg_cron UTC tick + orchestrator ordering + Edge limits |
| T12 | D | §9 Stripe, §5 P4/P9, §10 | CA SaaS non-taxable; nexus thresholds; Stripe Tax posture |
| T13 | D | Dec 19, §4.2, §5 P4/P1, §6.9, §10 | Hard-delete erasure default; no SPI limit-link; ADMT out of scope |
| T14 | C | §9, §6.8, §6.13, §6.4 | Free-tier ceilings; Supabase 5+5 GB; Anthropic 3/15 not 5/25 |
| T15 | D | §5 P4, §6.9, §8, §9 | Portal config per-mode gotcha; keep 3-way double-bill guard |
| T16 | B | Dec 4, §6.3, §6.5, §9, §10 Risk 3/4 | NDVI dilution caveat; within-parcel quantiles; ±0.03–0.05 noise band; season-aware staleness |

---

*Research appendix compiled to back the `[ILL]`/deferred items in `IMPLEMENTATION_PLAN.md`. Two material
plan corrections surfaced and should be applied: §9's "California taxes SaaS" premise is wrong (CA SaaS is
non-taxable → $0; see D1), and the Anthropic Sync-budget rate of 5/25 is Opus-4.8 pricing — Sonnet 4.6 is
3/15, Haiku 4.5 is 1/5 (see C2). Two unit-frame fixes are load-bearing for the agronomy core: the GDD
C-day/F-day frame and the Brix slope k=0.028 (not 0.011) in A4, and the Statistical-API valid-fraction
denominator must use a footprint-only output, not raw sampleCount, in B3.*
