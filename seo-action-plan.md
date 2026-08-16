# SEO Action Plan: Haulin' — Position 30 → Top 10

**Data Period:** Jan 2026 – Apr 2026  
**Current Avg Position:** ~30  
**Goal:** Below 10  
**Last Updated:** 2026-04-25

---

## Key Stats from Search Console

| Metric | Value |
|---|---|
| Total Pages (at start) | 168 |
| Indexed (at start) | 60 (36%) |
| Not Indexed (at start) | 108 (64%) |
| Total Clicks (period) | 2 |
| Avg Position | ~30 |

### Queries Close to Page 1 (Quick Wins)

| Query | Position | Impressions | Page Optimized? |
|---|---|---|---|
| junk removal hunters creek fl | 11 | 49 | ✅ done |
| hot tub removal | 23 | 51 | ✅ done |
| concrete removal orlando | 33 | 42 | ✅ done |
| commercial junk removal central florida | 42 | 63 | ✅ done |
| foreclosure cleanouts | 50 | 61 | ✅ done |
| junk removal near me | 6 | 12 | ✅ homepage (done 2026-08-15) |
| junk removal | 3 | 6 | ✅ homepage (done 2026-08-15) |

---

## ✅ COMPLETED WORK — Session 2026-04-25

### Infrastructure Cleanup
- [x] Deleted 3 test files from root (`inc_test.php`, `php_inc_test.php`, `test_php_write.php`)
- [x] Deleted duplicate `material-logistics (1).php`
- [x] Fixed underscore URLs: `apartment_cleanouts.php` → `apartment-cleanouts.php`, `estate_cleanout.php` → `estate-cleanout.php`, 301 redirects added, sitemap updated
- [x] Fixed broken internal links in all 4 city pages — neighborhood sub-page links stripped, text kept

### Sub-Neighborhood Pages — Root Cause Fixed
63 thin pages deleted, 301 redirects to parent pages added to `.htaccess`, sitemap cleaned:
- **Baldwin Park** — 16 sub-pages deleted → `baldwin-park.php`
- **Winter Park** — 15 sub-pages deleted → `winter-park.php`
- **Maitland** — 16 sub-pages deleted → `maitland.php`
- **Windermere** — 16 sub-pages deleted → `windermere.php`

### Service Pages Optimized (title, H1, meta description, canonical)
- [x] `hunters-creek.php` — pos 11, keyword-first H1 + title + first sentence
- [x] `hot-tub-removal.php` — added missing meta, canonical, robots
- [x] `concrete-removal.php` — fixed duplicate H1, added canonical
- [x] `commercial.php` — shifted focus to "Central Florida" (63 impressions query)
- [x] `foreclosure-cleanout.php` — added missing meta, canonical; plural "cleanouts" in title
- [x] `estate-cleanout.php` — title/H1 optimized, URL renamed
- [x] `carpet-removal.php` — added missing meta, canonical
- [x] `appliance-removal.php` — fixed wrong copy-pasted concrete content + full SEO
- [x] `residential.php` — added missing meta, canonical

---

## 🔴 NEXT UP — Do These Now

### Search Console Actions
- [x] Resubmit `sitemap.xml` in Search Console — done 2026-04-25
- [x] Request re-indexing for 9 optimized service pages — done 2026-04-25

### Homepage (`index.php`) — done 2026-08-15
- [x] Optimize title tag — target "junk removal orlando fl"
- [x] Add/fix meta description
- [x] Fix H1 to include "Orlando, FL"
- [x] Add `LocalBusiness` schema with full NAP + service area
- [x] First paragraph must open with target keyword

---

## 🟠 THIS MONTH

- [x] **Create `/junk-removal-orlando.php`** — dedicated money page, 870 words, targets "junk removal orlando" — done 2026-08-15 (added to sitemap, nav dropdown, and site-wide footer)
- [ ] **Google Business Profile** — add all services, before/after photos, post 2x/week, request reviews after every job
- [x] **Add FAQ + FAQPage schema** to top 5 service pages — done 2026-08-15: `residential.php`, `concrete-removal.php`, `foreclosure-cleanout.php`, `apartment-cleanouts.php` were missing it entirely (also added missing Service schema to `foreclosure-cleanout.php`); `cardboard-removal.php` and `material-logistics.php` got FAQ as part of the full optimize below
- [x] **Optimize remaining service pages:** `dumpster-rentals.php`, `cardboard-removal.php`, `material-logistics.php` — done 2026-08-15. `dumpster-rentals.php` was already complete. `cardboard-removal.php` had a serious bug: its entire body content was a leftover copy of `material-logistics.php`'s gravel/dirt content (wrong topic, wrong sidebar bio) — rewritten with genuine cardboard removal content. `material-logistics.php` had a leaked competitor name ("ABR Transport") never replaced with "Haulin Junkies" — fixed, plus added missing Service/FAQ schema and fixed H1/breadcrumb links.
- [x] **Optimize top location pages:** `doctor-phillips.php`, `horizon-west.php`, `kissimmee.php`, `st-cloud.php` — done 2026-08-15 (verified only — all four were already fully built with correct title/H1/meta/canonical, no changes needed)
- [ ] **Build 5-10 local directory citations** — NAP must match exactly: Haulin Junkies, 1375 Lake Shadow Cir, Maitland, FL 32751, (407) 815-4926
  - [x] Yelp — account exists, NAP not yet verified against site
  - [x] Thumbtack — account exists, NAP not yet verified against site
  - [ ] Angi
  - [ ] HomeAdvisor
  - [ ] BBB

---

## ✅ COMPLETED WORK — Session 2026-08-16 (Index Coverage Pruning)

GSC Page Indexing export (2026-08-16) showed only 35/201 known URLs indexed. Root cause: 42 location pages were a single template with the city name swapped (word counts clustered 764–970 words, near-identical structure) — GSC's "Crawled – not indexed" (36) + "Discovered – not indexed" (6) = 42 matched the location-page count almost exactly.

- [x] Pruned 17 lowest-volume/unincorporated location pages (deleted, 301 redirected to nearest kept hub):
  - `geneva.php` → `oviedo.php`
  - `gotha.php` → `winter-garden.php`
  - `wedgfield.php` → `alafaya.php`
  - `minneola.php`, `groveland.php` → `clermont.php`
  - `audubon-park.php` → `baldwin-park.php`
  - `colonialtown.php`, `conway.php`* → `hunters-creek.php` (conway only; colonialtown → downtown-orlando.php)
  - `delaney-park.php`, `lake-eola-heights.php`, `lake-lawsona.php`, `holden-parramore.php`, `metro-west.php`, `mills-50-district.php`, `south-eola.php`, `thornton-park.php` → `downtown-orlando.php`
  - `universal-studios-area.php` → `international-drive.php`
- [x] Added 17 redirects to `.htaccess`
- [x] Removed the 17 pruned URLs from `sitemap.xml`, bumped `lastmod` on touched pages
- [x] Repointed the 5 affected `service-areas.php` cards (Minneola, Wedgfield, Geneva, Gotha, Groveland) to link directly to their hub page instead of the deleted file
- [x] Confirmed the other 12 pruned areas were already named in `downtown-orlando.php`'s locations list (no edit needed) — added missing mentions of Wedgfield to `alafaya.php` and Gotha to `winter-garden.php`
- [x] Resubmitted sitemap.xml in Search Console — done 2026-08-16
- [ ] **Monitor Coverage report over next 2-4 weeks — watch for "Crawled/Discovered – not indexed" to drop from 42 and indexed count to climb from 35**
- [ ] Kept 25 location pages (alafaya, altamonte-springs, apopka, baldwin-park, clermont, doctor-phillips, downtown-orlando, college-park, heathrow, horizon-west, hunters-creek, international-drive, kissimmee, lake-buena-vista, lake-mary, lake-nona, longwood, maitland, ocoee, oviedo, sanford, st-cloud, windermere, winter-garden, winter-haven, winter-park) are still thin/templated — differentiating their content with real local detail is the next lever if pruning alone doesn't move indexation enough
- [ ] Noted but out of scope: `orlando.php` is 301-redirected to homepage yet still listed in `sitemap.xml` and still linked from `service-areas.php` ("Property Managers & Realtors" card) — its unique B2B copy is now unreachable; needs a content decision, not just a technical fix
- [ ] Noted but out of scope: stray debug/test files in web root (`bt_test.txt`, `swaks`, `telnet`, etc.) and `contact_images.php` writing debug logs on every request — flagged separately as a hygiene/security cleanup, not an indexing issue

---

## 🟡 ONGOING

- [ ] **Local backlinks** — partner with real estate agents/property managers for foreclosure cleanout referrals
- [ ] **Internal linking** — add 3-5 internal links to each of the optimized service pages from other pages
- [ ] **Monitor Coverage report** in Search Console over next 2-4 weeks — indexed page count should climb from 60 as Google re-crawls after sub-page removals

---

## Pages Audit Tracker

| Page | File | Title ✅ | H1 ✅ | Meta ✅ | Canonical ✅ | Status |
|---|---|---|---|---|---|---|
| **Homepage** | `index.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Residential | `residential.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Hot Tub Removal | `hot-tub-removal.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Concrete Removal | `concrete-removal.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Foreclosure Cleanouts | `foreclosure-cleanout.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Commercial Junk Removal | `commercial.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Estate Cleanouts | `estate-cleanout.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Carpet Removal | `carpet-removal.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Appliance Removal | `appliance-removal.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Hunters Creek | `hunters-creek.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Apartment Cleanouts | `apartment-cleanouts.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Dumpster Rentals | `dumpster-rentals.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Cardboard Removal | `cardboard-removal.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Material Logistics | `material-logistics.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Doctor Phillips | `doctor-phillips.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Horizon West | `horizon-west.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Kissimmee | `kissimmee.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| St. Cloud | `st-cloud.php` | ✅ | ✅ | ✅ | ✅ | ✅ done |
| Maitland | `maitland.php` | ✅ | ✅ | ✅ | ✅ | ✅ done (verified 2026-08-15; 0 GSC impressions — needs re-index request, see below) |
| Altamonte Springs | `altamonte-springs.php` | ✅ | ✅ | ✅ | ✅ | ✅ done (verified 2026-08-15) |
| Baldwin Park | `baldwin-park.php` | ✅ | ✅ | ✅ | ✅ | ✅ done (verified 2026-08-15) |
| Winter Park | `winter-park.php` | ✅ | ✅ | ✅ | ✅ | ✅ done (verified 2026-08-15) |
| Windermere | `windermere.php` | ✅ | ✅ | ✅ | ✅ | ✅ done (verified 2026-08-15; 0 GSC impressions — needs re-index request, see below) |

---

## Infrastructure Status

| File | Status |
|---|---|
| `robots.txt` | ✅ Clean — no blocks |
| `sitemap.xml` | ✅ Cleaned — sub-pages removed, lastmod updated |
| `.htaccess` | ✅ 65 redirect rules added (63 sub-pages + 2 underscore URLs) |
| Google Verification | ✅ Present |
| Test files | ✅ Deleted |
| Duplicate files | ✅ Deleted |

---

*Generated from Google Search Console data — Jan 2026 to Apr 2026*  
*Last updated: 2026-04-25*
