# SEO Site Audit — haulinjunkies.com

**Date:** 2026-08-28
**Scope:** Full technical + on-page + content review of the live PHP site, cross-referenced with GSC Performance (2026-08-28), Coverage (2026-08-28), and Coverage Drilldown exports.
**Companion docs:** [`seo-action-plan.md`](seo-action-plan.md) (running task list), [`WEEKLY-SEO-AUDIT.md`](WEEKLY-SEO-AUDIT.md).

---

## Executive Summary

**Overall health: fair, and structurally cleaner than it was.** Indexing is up (22 → 62 pages since June), the redirect strategy is now live on nginx, titles/meta/canonicals/schema are in place site-wide, and NAP is consistent. The pruning work from August is working.

**But the site is not earning clicks.** Only the homepage gets meaningful traffic (11 clicks / 394 impressions). Every service and location page sits at **average position 45–80** for its target term — page 5 to page 8. That is the whole problem: the pages are *technically fine* and *not competitive*.

### Top 5 priorities

| # | Issue | Impact | Effort |
|---|---|---|---|
| 1 | `orlando.php` is 301'd to `/` on live nginx, yet still in the nav, sitemap, and self-canonical — and was just rebuilt as a Property Manager/Realtor page | High | Low |
| 2 | Money-term pages rank page 5–8 (`junk removal orlando` #76, `dumpster rental orlando` #121, `estate cleanout orlando` #51) — thin content + almost no internal links + no local proof | High | High |
| 3 | Internal linking is skeletal — location/blog pages have 1–3 inbound links, none from the footer, 2 clicks deep. This is why ~15 pages are "Crawled – currently not indexed" | High | Medium |
| 4 | Homepage loads **15 CSS files + 17 JS files** from the purchased theme, most unused (range slider, progress bar, countup, marquee, select2, venobox, `Font-Awesome.js`) — kills mobile LCP | Medium | Medium |
| 5 | Self-serving `aggregateRating` (4.9 / 87) hardcoded on `index.php` + `service-areas.php` with no visible per-review markup — structured-data manual-action risk | Medium | Low |

---

## What's already good — do not undo

- **Titles**: unique, keyword-first, brand-suffixed, mostly ≤60 chars. Solid.
- **Canonicals**: present and self-referencing on all 59 real pages.
- **Meta descriptions**: present on every content page (slightly long — see Quick Wins).
- **Schema**: LocalBusiness, Service, FAQPage, Organization all deployed. FAQ on 25 pages.
- **NAP consistency**: `Haulin Junkies / 1375 Lake Shadow Cir, Maitland, FL 32751 / (407) 815-4926` — identical in header, footer, and schema.
- **robots.txt**: clean, no bad blocks, sitemap referenced.
- **Redirects**: `.html→.php`, underscore→hyphen, and all the pruned sub-pages return 301 on live nginx (verified with `curl -I`).
- **llms.txt**: present (helps AI search).

---

## Critical Fixes

### C1. Resolve the `orlando.php` contradiction

Live behavior: `curl -I https://haulinjunkies.com/orlando.php` → **301 → `/`**.

But `orlando.php` also:
- exists as a 42 KB file, rebuilt 2026-08-24, with H1 "Property Manager &amp; Realtor Junk Removal in Orlando"
- is linked in the nav dropdown ([`includes/header.php:120`](includes/header.php)) as "Property Managers & Realtors"
- is listed in [`sitemap.xml`](sitemap.xml)
- has `<link rel="canonical" href="https://haulinjunkies.com/orlando.php">` pointing at itself

So Google is told "this page exists, index it" by four signals and "it's gone" by the server. Pick one:

- **If the PM/Realtor page is wanted** (it targets a different audience than "junk removal orlando", so cannibalization is no longer the risk it was): remove the `location = /orlando.php { return 301 /; }` block from the live nginx snippet, keep everything else. Give it a distinct title like "Junk Removal for Property Managers & Realtors | Orlando".
- **If it's dead**: remove it from the nav, remove it from `sitemap.xml`, delete the file.

Right now it's the worst of both — wasting crawl budget and sending mixed signals.

### C2. Sitemap advertises a redirecting URL

`sitemap.xml` contains `https://haulinjunkies.com/orlando.php`, which 301s. A sitemap should only list 200-status canonical URLs. Fix as part of C1. Also: all `<lastmod>` values are 2026-08-12/16 even though `index.php` (Aug 16–18) and `orlando.php` (Aug 24) changed since — update `lastmod` when you touch a page, or the sitemap stops being a useful crawl signal.

### C3. `aggregateRating` without review markup

`index.php` and `service-areas.php` both hardcode:
```json
"aggregateRating": { "ratingValue": "4.9", "reviewCount": "87", "bestRating": "5" }
```
Google's guidelines: aggregate ratings must reflect **ratings collected and shown on that page**, with individual `Review` items marked up, and must not be self-serving for the business's own reviews. As written this is a rich-results manual-action risk and Google is likely already suppressing it.

Fix: either (a) remove `aggregateRating` from the schema and rely on Google Business Profile stars in the map pack, or (b) pull real reviews onto the page (e.g. from GBP), display them visibly, and mark each one up as a nested `Review` with `author` and `reviewRating`. Do not keep the bare aggregate number.

### C4. `contact_images.php` is crawlable

`curl -I` returns 302 with a title of "New Contact Form Submission". It's a form handler, not a page. GSC has picked it up. Add `header('X-Robots-Tag: noindex');` at the top, or `Disallow: /contact_images.php` in robots.txt. (The action plan also flags it writing debug logs on every request — worth cleaning up at the same time.)

---

## High-Impact Improvements

### H1. Fix internal linking (biggest ranking lever available)

Current state (inbound internal links, excluding the global nav/footer):

| Page | Inbound links |
|---|---|
| `clermont.php`, `winter-haven.php`, `lake-nona.php` | 1 |
| `oviedo.php`, `ocoee.php` | 2 |
| `estate-cleanout.php`, `dumpster-rentals.php` | 1 (just the nav) |
| `why-is-recycling-metals-important.php`, `benefits-of-junk-removal.php` | 1 (blog index only) |

Location and blog pages are effectively orphans hanging off `service-areas.php`. Google finds them, sees one link and thin differentiation, and parks them in "Crawled – currently not indexed."

Actions:
- **Footer**: add a "Service Areas" column linking the 8–10 top location pages, and link `service-areas.php`, `dumpster-rentals.php`, and the privacy/terms pages (currently commented out).
- **Cross-link neighboring cities**: each location page should link to 3–5 nearby location pages in the body ("We also serve [Winter Park], [Maitland], [Oviedo]…"). [`NEIGHBORHOOD-LINKS-STANDARD.md`](NEIGHBORHOOD-LINKS-STANDARD.md) already defines a convention — apply it consistently.
- **Service ↔ location**: service pages should link to the top location pages and vice versa.
- **Blog → money pages**: every blog post should link to 2–3 relevant service pages with descriptive anchor text. Right now posts only link back to the blog index.
- **Homepage**: link the top 6–8 location pages from the body, not just services.

### H2. Make the money-term pages competitive

These are the queries with real volume where you're nowhere:

| Query | Impressions | Position | Target page |
|---|---|---|---|
| junk removal orlando fl | 46 | ~82 | `junk-removal-orlando.php` |
| junk removal orlando | 46 | ~76 | `junk-removal-orlando.php` |
| orlando junk removal | 35 | ~80 | `junk-removal-orlando.php` |
| dumpster rental orlando | — | 121 | `dumpster-rentals.php` |
| estate clean-out orlando | 91 | ~52 | `estate-cleanout.php` |
| junk removal orlando prices | 29 | ~79 | `junk-removal-cost-orlando.php` |

Titles/meta/schema are already done on these. What's missing is **the stuff Google uses to rank local pages**:
- **Depth**: `junk-removal-orlando.php` is ~930 words. Competitors ranking top-3 run 1,500–2,500 with pricing tables, item lists, service-area maps, process steps, FAQs, and photos. `residential.php` (704 words) and `dumpster-rentals.php` need the same treatment.
- **Local proof**: real job photos (before/after), named neighborhoods served, truck/crew photos, licensing details, genuine customer quotes tied to Orlando locations.
- **Internal links** pointing *to* these pages with anchor text like "junk removal in Orlando" (see H1).
- **Google Business Profile**: still unchecked in the action plan. For "junk removal orlando" the map pack is 60% of the clicks. GBP with categories, service list, photos, weekly posts, and a steady review flow will move the needle more than any on-page change. This is the single highest-ROI item and it's off-site.

### H3. Trim theme bloat / Core Web Vitals

`index.php` `<head>` loads 15 stylesheets and 17 scripts from the purchased Bootstrap theme. Almost none of these features exist on the site:
- Unused: `range_slider`, `jQuery-plugin-progressbar`, `jquery.countup`, `jquery.marquee`, `select2`, `nice-select`, `venobox` (lightbox), `sticky_sidebar`, `pointer`.
- `Font-Awesome.js` is the JS icon loader — you already load Font Awesome CSS via `all.min.css`, so it's redundant *and* render-blocking.
- jQuery 3.7.1 + Bootstrap bundle are large; most of the interactivity is a booking modal that's ~20 lines of vanilla JS.

Actions:
- Audit which CSS/JS are actually referenced by rendered markup; delete the rest.
- Combine + minify the remaining CSS into one file; defer non-critical JS.
- Drop `Font-Awesome.js`.
- Add `<link rel="preconnect">` for the Tidio and any font origins.
- Run PageSpeed Insights on the homepage + one service page + one location page and record the LCP/INP/CLS baseline in `WEEKLY-SEO-AUDIT.md`.

### H4. Legacy duplicate: `estate_cleanout.php`

The old underscore URL still holds **277 impressions at position 49** in GSC vs. only 60 for the correct `estate-cleanout.php`. The 301 is live and correct — this is just Google's index lagging. Speed it up: in GSC, use "Removals → Outdated content" for `estate_cleanout.php`, and request indexing on `estate-cleanout.php`. Should consolidate within a few weeks; re-check on the next GSC pull.

### H5. Extensionless legacy URLs still 404

`/service-areas`, `/winter-park-lake-osceola`, and ~20 similar extensionless URLs from the old site return hard 404 (the nginx `location =` exact-match rules only cover the `.php` versions). Low traffic, but easy to sweep with one regex block in the nginx snippet:
```nginx
location ~ ^/(baldwin-park|winter-park|windermere|maitland)-[a-z-]+$ { return 301 /$1.php; }
location = /service-areas { return 301 /service-areas.php; }
```

---

## Quick Wins

- **Meta descriptions**: several run 180–200 chars (`index.php` is 201) and get truncated at ~160 in the SERP. Tighten the top 10 pages so the CTA (`Call (407) 815-4926!`) survives the cut.
- **`service-areas.php` has 2 `<h1>` tags** — demote the second to `<h2>`.
- **Dead links**: header + footer social icons are all `href="#"` (`includes/header.php:47-53`, `includes/footer.php:69-76`). Wire them to the real Facebook/Yelp/Thumbtack profiles or remove them. Then populate `sameAs` in the Organization schema with those same URLs (currently `sameAs` only contains the site's own homepage — pointless).
- **Header cruft**: the non-functional search box (`includes/header.php:173`), the English-only language `<select>`, and the `$USD`-only currency `<select>` are leftovers from the theme. Remove — they look broken and add nothing.
- **Nav "Home" has a `<i class="fa-chevron-down">`** implying a dropdown that doesn't exist. Remove the chevron.
- **`privacy_policy.php` / `terms_and_conditions.php`**: no canonical, no meta description. Add both, and link them from the footer (trust signal, currently commented out).
- **Homepage `LocalBusiness` schema** still lists pruned areas (`Audubon Park`, `Colonialtown`) in `areaServed`. Harmless but tidy it to match the live page set.
- **`<meta name="robots" content="index, follow">`** on every page is redundant (that's the default) — not worth a sweep, but drop it from the template next time it's touched.
- **`googleed08832d9b08e5b6.html`** and stray root debug files (`bt_test.txt`, `dollar_test.txt`, `swaks`, `telnet`, `nul`, `ehlo`, `quick`, etc.) — clean out of the web root. Hygiene, not ranking, but they're publicly fetchable.

---

## Content / E-E-A-T

- **No About page.** It's commented out in the nav. A local service business with no About/team/story page is an E-E-A-T gap. The Aug homepage rewrite added a business story section — promote that to a real `about.php` and put it back in the nav.
- **Location pages are thin** (~770 words for tier-2 cities, near-identical structure). They're not *duplicate* (8–12% shingle overlap — acceptable), just *generic*. Add per-city specifics: named neighborhoods, local landmarks, county landfill/permit notes, a real testimonial from that area, local pricing examples. Prioritize the ones with existing impressions.
- **Blog is minimal** (~9 posts) and disconnected from the money pages. Either commit to a real cadence with internal links to services, or leave it — but don't let it sit half-built.
- **No visible review content strategy.** GBP reviews feeding onto the site (properly marked up) would support both rankings and the schema in C3.

---

## Prioritized Action Plan

### Week 1 — unblock and align
1. Decide `orlando.php`: un-redirect + retitle, **or** remove from nav/sitemap/delete (C1, C2)
2. Remove or properly mark up `aggregateRating` (C3)
3. `noindex` + robots block on `contact_images.php` (C4)
4. GSC: "Remove outdated content" for `estate_cleanout.php`; request indexing on `estate-cleanout.php` (H4)
5. Fix `sitemap.xml` lastmod dates; drop `orlando.php` if killed (C2)

### Week 2 — internal linking
6. Footer: add Service Areas column + privacy/terms links (H1)
7. Cross-link location pages to 3–5 neighbors each, per `NEIGHBORHOOD-LINKS-STANDARD.md` (H1)
8. Blog posts → link 2–3 service pages each with descriptive anchors (H1)
9. Homepage body → link top 8 location pages (H1)

### Week 3–4 — competitiveness
10. **Google Business Profile**: full setup, categories, services, photos, review request flow (H2) — start this now, it compounds
11. Expand `junk-removal-orlando.php`, `residential.php`, `dumpster-rentals.php` to 1,500+ words with pricing, item lists, process, photos, FAQ (H2)
12. Theme bloat audit: delete unused CSS/JS, drop `Font-Awesome.js`, record CWV baseline (H3)

### Ongoing
13. Differentiate the 25 kept location pages with real local detail, highest-impression first
14. Local citations (Angi, BBB, HomeAdvisor) with exact-match NAP — from `seo-action-plan.md`
15. Keep watching Coverage: "Crawled – not indexed" should keep falling from 15 as internal links land
16. Stop watching site-wide average position as a health metric — track clicks and the position of the specific money queries in H2

---

*Generated from live site inspection + GSC exports, 2026-08-28.*
