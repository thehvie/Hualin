# SEO Growth Plan — Sept–Oct 2026

**Created:** 2026-08-31
**Data basis:** GSC Performance exports 2026-08-07 → 2026-08-31 (weekly), [`SEO-SITE-AUDIT-2026-08-28.md`](SEO-SITE-AUDIT-2026-08-28.md)
**Supersedes the "next up" sections of:** [`seo-action-plan.md`](seo-action-plan.md)
**Goal:** Move the 8 money queries from page 5–8 to page 2–3, and get GSC clicks from ~5/mo to 25+/mo by 2026-10-31.

---

## Diagnosis (why we're not on track)

The technical SEO is **done** — titles, meta, canonicals, schema, redirects, sitemap, index pruning all shipped between April and August. It worked for what it does: indexed pages went 22 → 62.

But the rankings are **drifting the wrong way**:

| Export (last 28d) | Avg position | Clicks | Impressions |
|---|---|---|---|
| 2026-08-07 | 47.5 | 1 | 400 |
| 2026-08-15 | 48.4 | 4 | 386 |
| 2026-08-20 | 49.6 | 4 | 428 |
| 2026-08-25 | 51.6 | 6 | 520 |
| 2026-08-31 | 54.6 | 5 | 592 |

3-month monthly trend: June 554 impr / pos 50.9 → Aug 603 impr / pos 53.6. Impressions flat, **position getting worse every week**, clicks stuck at ~1/week.

**Root cause:** every page except the homepage is *technically correct and not competitive*. The homepage earns 11 clicks / 391 impr at position 17.6. Every service and location page sits at position 42–82 — page 5 to page 8 — for its target term. New thin pages keep getting indexed at page 5+ and drag the average down further.

The three things Google uses to rank local-intent queries that we have **not** done:
1. **The map pack** — Google Business Profile. For "junk removal orlando" the local pack is ~60% of clicks. Still unchecked in the action plan.
2. **Page authority** — internal links (audit H1) and citations. Location/blog pages have 1–3 inbound links; footer has no service-areas column; social links are dead `href="#"`.
3. **Page depth + local proof** — `junk-removal-orlando.php` is 919 words, `residential.php` is 692. Top-3 competitors run 1,500–2,500 with pricing, item lists, photos, named neighborhoods, real reviews.

---

## What we STOP doing

- No more technical audits. The site is clean. [`WEEKLY-SEO-AUDIT.md`](WEEKLY-SEO-AUDIT.md) stays as a regression guard only.
- No more title/meta/canonical/schema passes. They're in place.
- **Stop watching site-wide average position as a health metric.** It will stay flat or dip for 6+ weeks as more pages index. Track the scorecard below instead.

---

## The scorecard (check weekly, every Monday, from the latest GSC export)

| Money query | Target page | Pos 2026-08-31 | Target by 10-31 |
|---|---|---|---|
| junk removal orlando | junk-removal-orlando.php | 75.9 | < 20 |
| junk removal orlando fl | junk-removal-orlando.php | 81.3 | < 20 |
| orlando junk removal | junk-removal-orlando.php | 80.0 | < 20 |
| junk removal orlando prices | junk-removal-cost-orlando.php | 79.3 | < 25 |
| estate clean-out orlando | estate-cleanout.php | 51.5 | < 15 |
| commercial junk hauling | commercial.php | 51.0 | < 20 |
| hot tub removal | hot-tub-removal.php | 30.6 | < 12 |
| junk removal near me | index.php | 13.4 | hold < 15 |

Also track, from GSC + GBP:
- **Total clicks / 28 days** (baseline 5) → target 25+
- **GBP: calls, direction requests, website clicks / week** (baseline 0 — not set up)
- **Pages with > 0 clicks in the period** (baseline 2: homepage + one fluke)

---

## The plan — 4 parallel workstreams

Workstreams run in parallel, not sequence. A and D need the client; B and C are code work.

### Workstream A — Local pack + citations  ·  owner: CLIENT  ·  weeks 1–2 setup, then ongoing

**Highest ROI item in this whole plan and it's entirely off-site.**

- [ ] Claim / verify Google Business Profile for Haulin Junkies, 1375 Lake Shadow Cir, Maitland, FL 32751, (407) 815-4926
- [ ] Primary category: "Junk removal service". Add secondary: "Dumpster rental service", "Debris removal service", "Garbage collection service"
- [ ] Fill the services list with every service page we have (junk removal, estate cleanout, foreclosure cleanout, hot tub removal, appliance removal, carpet removal, concrete removal, commercial, dumpster rental)
- [ ] Service area: list the 25 kept location cities
- [ ] Upload 20+ real photos: before/after loads, truck, crew, dump runs. Geotag where possible.
- [ ] Turn on messaging; set business hours
- [ ] **Review engine:** text every customer this template within 1 hour of job completion:
  > "Thanks for choosing Haulin Junkies! If we did right by you, a quick Google review really helps a small local business: [short GBP review link]"
  Target: 2+ new reviews/week. Reply to every review.
- [ ] Post to GBP 2×/week (a job photo + one line). Trivial, and it's a ranking signal.
- [ ] Citations with **exact** NAP (`Haulin Junkies / 1375 Lake Shadow Cir, Maitland, FL 32751 / (407) 815-4926`): Angi, BBB, HomeAdvisor, Nextdoor Business, Apple Maps, Bing Places, Yellow Pages, Chamber of Commerce. Verify the existing Yelp + Thumbtack match exactly.

### Workstream B — Internal link equity  ·  owner: CLAUDE  ·  weeks 1–3

- [x] **Footer** ([`includes/footer.php`](includes/footer.php)): added a "Service Areas" column (Orlando→`downtown-orlando.php`, Winter Park, Kissimmee, Windermere, Maitland, Oviedo, Clermont, Winter Garden, St. Cloud, Dr. Phillips + "View all service areas →" to `service-areas.php`); rebalanced the Bootstrap grid to 5 columns; added Privacy Policy + Terms links to the copyright bar — done 2026-08-31
- [x] **Footer + topbar:** replaced the dead `href="#"` social icons with real Facebook + Instagram links (`target="_blank" rel="noopener"`, aria-labels); removed the unused LinkedIn/Twitter icons; updated `sameAs` in `index.php` LocalBusiness schema to the two real profiles (dropped the pointless self-link) — done 2026-08-31
  - Profiles wired (footer + topbar + `sameAs`): Facebook `https://www.facebook.com/Haulinjunkies`, Instagram `https://www.instagram.com/haulinjunkies/`, Yelp `https://www.yelp.com/biz/haulin-junkies-maitland` (added 2026-08-31, query string stripped).
  - **Note:** `orlando.php` deliberately NOT linked in the footer — it's a PM/Realtor page and `nginx-redirects.conf` still 301s it to `/`. Used `downtown-orlando.php` for the Orlando slot. Audit C1 (resolve the orlando.php contradiction) is still open.
- [ ] `dumpster-rentals.php` link still to add to footer (Services column)
- [x] **Homepage body** ([`index.php`](index.php)): added an "Areas We Serve" section before the CTA linking **22 location pages** + `service-areas.php`; turned the About-section copy into contextual links (`estate-cleanout.php`, `residential.php`, `commercial.php`, `junk-removal-orlando.php`); fixed 2 `apartment_cleanouts.php` → `apartment-cleanouts.php` underscore links in the service cards — done 2026-08-31
- [x] **Location → location + location → service** (26 pages): two new `content-section` blocks near the end of every kept location page — "Junk Removal Services in {City}" (11 service links) + "Nearby Cities We Serve" (2–6 adjacent city links per [`NEIGHBORHOOD-LINKS-STANDARD.md`](NEIGHBORHOOD-LINKS-STANDARD.md) + "All service areas →"). Done 2026-08-31 via script; all 26 lint-clean, link targets verified 200, list renders 2-col, no horizontal overflow.
- [x] **Service → location** (13 pages): "…Across the Orlando Metro" section with 13–19 city links + `service-areas.php` added to `residential`, `commercial`, `appliance-removal`, `concrete-removal`, `foreclosure-cleanout`, `hot-tub-removal`, `apartment-cleanouts`, `moving-services`, `senior-move-management`, `material-logistics`, `cardboard-removal` (script) + `junk-removal-cost-orlando`, `dumpster-rentals` (custom templates, done individually). `estate-cleanout`, `carpet-removal`, `junk-removal-orlando` already had one — left as-is. Done 2026-08-31.
- [x] **Blog → money pages** (10 posts): "Related Services" block with 3 contextual service-page links + `service-areas.php` added to all 10 thin/unlinked posts. Done 2026-08-31. (Renders just outside `.blog_details_text`, inside `.blog_details_area` — cosmetically fine, links live/crawlable.)
- [ ] After deploy: bump `sitemap.xml` `lastmod` on touched pages, resubmit sitemap, request indexing on the money pages

### Workstream C — Money-page depth + local proof  ·  owner: CLAUDE (structure) + CLIENT (photos, quotes, pricing)  ·  weeks 2–6

Rebuild in this order, ~one page every 3 days. Each page gets: 1,500+ words, a pricing/load-size table, "what we take / don't take" list, numbered process steps, an embedded service-area list with internal links, 6–8 FAQ (+ FAQPage schema), 3+ real job photos, at least one genuine customer quote tied to an Orlando-area location, and license/insurance details.

- [x] **`junk-removal-orlando.php`** (919 → **~1,530 words**) — done 2026-09-01. Added: cost section with interactive load-size slider + range table + "what's included" + "what moves the price"; take/don't-take list; numbered process; 2 visible reviews (Marti, Sarah) + `AggregateRating` 5.0/3 + `Review` markup in Service schema; expanded FAQ 5→8 (+ matching FAQPage schema); Service `offers` minPrice/maxPrice 100/650 → 150/900; sidebar rating 4.9→5.0.
- [x] **`residential.php`** (692 → **~1,410 words**) — done 2026-09-01. Same slider + range table + callout; "what's included" / "what moves the price"; take/don't-take; numbered process; "common residential jobs" list; why-us; FAQ 5→8 (+ synced schema); **deleted the dead hidden tab with 3 fabricated reviews** (Sarah Johnson / Michael Chen / Lisa Rodriguez) and the non-functional "Write Your Review" form, replaced with the 3 real reviews inline; Service schema price 100/650 → 150/900 + `AggregateRating` 5.0/3 + `Review` markup; sidebar 4.9→5.0 / "Eric &amp; Glenda".
- [x] **`junk-removal-cost-orlando.php`** — done 2026-09-01. Added the same slider; rebuilt the truck-load table with the new ranges; updated item-type table, vs-dumpster table, minimum-charge FAQ, meta description / OG / Twitter / Article-schema description (100–650 → 150–900); bumped `dateModified` to 2026-09-01.
- [x] **`estate-cleanout.php`** — partial (2026-09-01): added Sarah Cioppa review as a body blockquote + `AggregateRating` 5.0/3 + `Review` in Service schema; sidebar rating 4.9→5.0. Still needs: photos, neighborhood list, length.
- [~] `commercial.php` (1,588 words — length is fine) — **PARKED**: got the sidebar rating fix + service→location links in workstream B. Still wants commercial client examples + real photos, both client-owed.
- [~] `dumpster-rentals.php` (1,774 words — length is fine) — **PARKED**: got the location-link paragraph in workstream B + sidebar rating fix. Pricing here is dumpster flat-rate (12/14/16/20 yd) not the junk-removal load fractions — separate exercise, revisit if dumpster becomes a focus.

**Client owes to unpark the rest of C:** 3+ before/after job photos per page (every page still uses stock `service_details_img.jpg` / `service_details_img_res.jpg`), plus for `commercial.php` one or two real commercial client stories (business type + neighborhood + one sentence).

### Workstream C — status 2026-09-01: CLOSED for this pass
The two highest-value money pages (`junk-removal-orlando`, `residential`) + the cost guide are fully rebuilt with the slider, real pricing, real reviews, and clean schema. `estate-cleanout` got the review + schema. `commercial` and `dumpster-rentals` are parked on client photos/stories. Fake `4.9/87` is gone sitewide. Resume C when photos arrive.

**Published price ranges (client-approved 2026-09-01, positioned toward 1‑800‑GOT‑JUNK, not full premium):**
min load $150–225 · ⅛ $225–325 · ¼ $325–450 · ½ $450–600 · ¾ $600–775 · full truck $725–900. Multi-load / estate / hoarder cleanouts: $1,500–4,000+, quoted on-site.

- [x] **Fake `4.9 / 87` rating removed sitewide (2026-09-01):** `index.php` + `service-areas.php` schema → `AggregateRating` 5.0/3; `index.php` also got a `review` array with all 3 real reviews and a new visible **static Reviews section** (replaced the commented-out fake "Alex Michel" carousel — no slick dependency). 14 service-page sidebars: "Service Rating (4.9/5)" → "Google Rating (5.0/5)". Verified: zero `4.9` and zero `"87"` remain in any `.php`.
- [x] **Cost estimator slider** — vanilla JS, no new dependencies, native `<input type=range>`, `accent-color` styling, works as progressive enhancement (the range table is the no-JS fallback). Reused on both money pages.

**Reviews received 2026-09-01** (all 5★, from GBP):
- **Sarah Cioppa** (28 wks ago) — estate cleanout, detailed, names "Eric and Glenda"; "not a paper clip left behind… IMMACULATE… donate or recycle or trash… your search is over." → feature on `estate-cleanout.php` + homepage
- **Marti Neuville** (4 wks ago) — "quick to get the job done… very responsive to my text messages… would definitely use their services again." → `junk-removal-orlando.php` + homepage
- **Robert Hicks** (16 wks ago) — "Fast and easy" → aggregate only, too short to feature

**Decision (2026-09-01): publish a load-fraction price RANGE table** (min load / ⅛ / ¼ / ½ / ¾ / full truck, each a $ range) + a short "what moves the price" paragraph — not a numbers-free explainer. Rationale: `junk removal orlando prices/cost` is buyer-intent + low competition; the site already commits to "$100–$650"; a table wins the snippet and pre-qualifies calls. Draft ranges pending client sign-off: min $100–150, ⅛ $150–225, ¼ $225–350, ½ $350–475, ¾ $475–575, full $575–675.

**Schema plan:** display all 3 reviews on-page with `Review` markup; set `aggregateRating` to **5.0 / 3**; remove the fabricated **4.9 / 87** from all 17 files (`index.php`, `service-areas.php`, + 15 service-page sidebars' "Service Rating (4.9/5)" line).

- [x] **Sidebar bios fixed (2026-09-01):** replaced fabricated staff names — "Eric Robert" (×4), "Carlos Mendez" (carpet-removal), "Mike Thompson" (×3: material-logistics, moving-services, senior-move-management) — with **"Eric &amp; Glenda / Owners, Haulin Junkies"** across all 8 service-page `sidebar_provider` blocks. The adjacent fake "Service Rating (4.9/5)" line left for the schema pass. Fake "Alex Michel" homepage testimonials are inside a commented-out block — will be replaced with the 3 real reviews in the money-page pass.

### Workstream D — Location page differentiation  ·  owner: CLAUDE + CLIENT (local detail)  ·  weeks 4–8, ongoing

The 25 kept location pages are generic templates (~770 words, city name swapped). Not duplicate, just not distinctive. Differentiate the highest-impression ones first.

- [ ] Priority tier (already showing impressions or ranking well at low volume): `windermere.php`, `geneva`→`oviedo.php`, `orlando.php`, `maitland.php`, `st-cloud.php`, `clermont.php`, `winter-garden.php`, `kissimmee.php`
- [ ] Per page add: named neighborhoods/subdivisions, 2–3 local landmarks, the county landfill / permit note that applies there, a local pricing example, one real testimonial from that area, a "we also serve" block linking neighbors
- [ ] **Client owes:** for each city, any real job we've done there (street/neighborhood + one sentence) and ideally a photo

---

## 8-week schedule

| Week of | Client (A + local detail) | Claude (code) |
|---|---|---|
| Sep 1 | Claim GBP, categories, first 20 photos, review text flow live | Footer service-areas column + social links + sameAs |
| Sep 8 | 10 citations submitted, GBP posts 2×/wk, reviews rolling | Homepage body links + service↔location links |
| Sep 15 | Photos/quotes/pricing for junk-removal-orlando + residential | Location→location cross-links (25 pages); rebuild `junk-removal-orlando.php` |
| Sep 22 | Photos/quotes for cost + estate pages | Rebuild `residential.php` + `junk-removal-cost-orlando.php` |
| Sep 29 | Local detail for Windermere, Oviedo, Orlando, Maitland | Rebuild `estate-cleanout.php`; blog→money-page links |
| Oct 6 | Photos/quotes for commercial + dumpster | Rebuild `commercial.php` + `dumpster-rentals.php` |
| Oct 13 | Local detail for St. Cloud, Clermont, Winter Garden, Kissimmee | Differentiate priority-tier location pages |
| Oct 20 | Keep reviews + GBP posts going | Differentiate remaining location pages; re-request indexing sweep |
| Oct 27 | — | Pull GSC export, score against targets, decide next quarter |

---

## Honest expectations

- **GBP** can show in the local pack within 2–4 weeks of verification + photos + first reviews. This is the fastest lever.
- **Internal links** take 3–6 weeks to fully recrawl and pass equity.
- **Content depth** takes 4–8 weeks to move position, longer on the hardest terms.
- The **site-wide average position will not improve for 6+ weeks** and may dip first as more location pages get indexed at page 5. That is expected — do not panic, watch the scorecard.
- Leading indicators that it's working (weeks 2–4): money-query positions climbing 5–15 spots, first GBP calls, pages other than the homepage getting clicks.

## Kill criteria (re-evaluate 2026-10-31)

If by Oct 31, after all four workstreams have shipped:
- the H2 money queries are **still** on page 5+ (position > 40), **and**
- GBP is verified with 10+ reviews but producing **no** calls or direction requests,

then the ceiling is **domain authority / competitive difficulty**, not on-page. The plan then shifts to: active link acquisition (local sponsorships, real-estate/property-manager referral partnerships, HARO), a possible service-niche focus (e.g. lead hard on estate/foreclosure cleanout where competition is thinner), and a paid Local Services Ads test to buy the map-pack position while organic catches up.
