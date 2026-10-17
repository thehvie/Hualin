# SEO + AI Search Audit: Dumpster Rental Focus (2026-10-14)

Source data: GSC Performance export, Web, last 3 months (2026-07-12 → 2026-10-11), plus a crawl of the live site and the repo.
Companion to [SEO-SITE-AUDIT-2026-08-28.md](SEO-SITE-AUDIT-2026-08-28.md) and [seo-growth-plan-2026-09.md](seo-growth-plan-2026-09.md).

## Executive summary

The business is getting more dumpster rental calls, but the website treats dumpsters as a minor side service. Google and AI assistants follow what the site says, so they currently see Haulin Junkies as a junk removal company that also has a dumpster page.

- **Dumpster demand already appears in GSC.** 14 dumpster queries, 59 impressions, and **2 of the site's 13 clicks** (15%), even though the pages ranked around position 100–141. "rent a dumpster" shows 33 impressions at position 1.0. Filter that query in GSC to see which page and feature it is. It is probably a local or brand placement, not an organic page-1 ranking.
- **The dumpster page has almost no Google visibility:** `dumpster-rentals.php` got **2 impressions in 3 months** (position 50). `junk-removal-orlando.php` got 421.
- **The homepage said "dumpster" zero times.** That includes its title, H1, copy, service cards, and schema. The homepage earns all but one click on the site.
- **The dumpster page looked unfinished on the live site:** all 4 size photos return 404 and show "Image Coming Soon" placeholders. There was also stray `=====-->` text after the header and footer.
- **Traffic overall is flat to down:** impressions by month were Jul 286 (partial), Aug 725, Sep 626, and Oct 137 (11 days, about a 390/mo pace). Clicks were 1, 5, 6, and 1. As noted in September, average position is the wrong health metric. Track the money queries.

## What was fixed in this pass (code, ready to deploy)

| # | Fix | Files |
|---|-----|-------|
| 1 | Removed stray visible `=============================-->` text and broken comment wrappers around the header and footer includes | `dumpster-rentals.php` + 28 other pages (location pages, contact, blog posts) |
| 2 | **Corrected the dumpster lineup sitewide.** The site listed 12/14/16/20 yard at $400/$410/$450. The real lineup is **12 yd ($400, 3 days, 4,000 lbs), 15 yd, 20 yd, 25 yd, and a 45 yd combo (20 + 25 delivered together) for $700**. Updated on the dumpster page, homepage, `llms.txt`, comparison guide, cost page, commercial, benefits, and furniture pages. Title is now "Dumpster Rental Orlando FL \| 12–45 Yard From $400" | 8 pages + `llms.txt` |
| 3 | Added a "Quick answer" price paragraph and a size/price/best-for comparison table near the top. This is the passage AI Overviews, ChatGPT, and Perplexity can lift directly | `dumpster-rentals.php` |
| 4 | FAQ schema synced with visible prices (it had said "competitive pricing" with no numbers and left out 20 yd). Added 3 FAQs (what can go in, permits, dumpster vs. junk removal) in both visible copy and schema | `dumpster-rentals.php` |
| 5 | Service schema: `offers` with real prices, 12 cities in `areaServed` (was Orlando only), provider linked to the homepage LocalBusiness `@id` | `dumpster-rentals.php` |
| 6 | BreadcrumbList pointed to `services.php`, which returns 404. Fixed | `dumpster-rentals.php` |
| 7 | Removed `schema.org/Product` microdata from the size cards. It had no `offers` or `review`, which triggers GSC Product snippet errors | `dumpster-rentals.php` |
| 8 | Fixed copy contradictions: "three sizes" vs. four shown; "keep it as long as you need" vs. 3-day rental; "no weight overage games" vs. a 4,000 lb cap | `dumpster-rentals.php` |
| 9 | Homepage title is now "Junk Removal & Dumpster Rental Orlando, FL". The meta description, hero paragraph, and service-areas intro now mention and link dumpster rentals. LocalBusiness schema gained `hasOfferCatalog`, listing dumpster rental with a price | `index.php` |
| 10 | `llms.txt` (read by AI crawlers) now opens with dumpster rentals: a dedicated section with every size, price, inclusions, delivery area, prohibited items, and permits. Also fixed the junk removal price range, which said $100–$650 and contradicted the published $150–$900 | `llms.txt` |
| 11 | Contextual dumpster link on the commercial page, which has a contractor audience and 131 impressions | `commercial.php` |

## Remaining issues, by priority

### High: client-owed, and they block dumpster rankings

1. **Real dumpster photos.** Each size on the driveway, one being loaded, the truck dropping one off. Save as `assets/images/dumpster-12-yard.jpg`, `dumpster-15-yard.jpg`, `dumpster-20-yard.jpg`, `dumpster-25-yard.jpg`, `dumpster-45-yard-combo.jpg` and they appear automatically. Use the same photos on GBP. Right now the money page shows 5 grey placeholders.
2. **Prices for the 15, 20 and 25 yard sizes, the rental period and weight allowance for each size (and for the 45 yd combo), the overage rate, and the extra-day rate.** These currently say "Call for price". Published prices are what Google snippets and AI answers quote. Once we have them, they go into the cards, table, FAQ, schema, and `llms.txt`. Size dimensions would also help.
3. **Google Business Profile:**
   - Add **"Dumpster rental service"** as a secondary category. This is the single biggest lever for "dumpster rental near me" in the map pack, which organic pages can't reach.
   - Delete "Waste management service" and "Garbage collection service" (carried over from the September playbook).
   - Add a "Dumpster Rental" service with prices.
   - Post dumpster photos weekly.
   - When asking dumpster customers for reviews, ask them to mention "dumpster" in the review. Review text feeds both map rankings and AI answers.
4. **Reviews.** Still 3. Nothing else moves map and AI visibility as much. Dumpster rentals are a natural review moment, since pickup day is when the customer is happiest.

### High: next code work

5. **Dumpster-specific location content.** The location pages are all junk-removal framed. Add a short "Dumpster rental in {City}" section, with a link, to the top 8 by impressions: Apopka, Kissimmee, Maitland, Clermont, Oviedo, Winter Garden, St. Cloud, Sanford. Don't build separate thin "dumpster-rental-{city}.php" pages yet. That repeats the thin-page problem from August.
6. **Dumpster cluster pages** (each one answers a real question in a format AI answers can quote):
   - `what-size-dumpster-do-i-need.php`: a project → size guide (roof squares, kitchen remodel, whole-house cleanout).
   - `dumpster-rental-cost-orlando.php`: mirrors the existing junk removal cost page, which is our best pattern.
   - Roofing dumpster / construction dumpster sections on the main page, or a page for contractors if those calls are a big share.
7. **Homepage service grid has no dumpster card.** The 6 cards are Junk Removal, Material Hauling, Appliance, Concrete, Commercial, and Apartment. Swap the Apartment Cleanouts card (3 impressions) for Dumpster Rentals once a real photo exists. I didn't use a stock or AI image here on purpose.

### Medium

8. **"24/7" badges on every service-area card** conflict with the posted hours (Mon–Fri 7–6, Sat 10–…) in schema and GBP. AI systems penalise contradictory facts. Either make it true or change it to "Same-day".
9. **19 pages have no JSON-LD at all.** These include `lake-mary`, `sanford`, `oviedo`, `st-cloud`, `winter-garden`, `contact_us`. Add a small Service + areaServed block per location page when doing item 5.
10. **`estate_cleanout.php` (underscore URL) still gets 112 impressions** despite the 301 to `estate-cleanout.php`. Google is splitting signals. Request re-indexing of the hyphen URL and inspect the underscore URL in GSC to confirm it sees the 301. Same for `orlando.php` (22 impressions, 301 → /).
11. **`meta keywords` tags** do nothing for Google. Harmless, but don't spend time maintaining them.
12. **og:image is the logo on every page.** Once dumpster photos exist, use one as the dumpster page's og:image. Social and AI link previews pull it.

### Low

13. Unrelated low-intent traffic: the metal recycling post (51 impressions, position 84) and Venice/Sarasota carpet queries. Ignore them, don't optimise for them.
14. About 6% of impressions are non-US. That's normal noise.

## AI search (ChatGPT, Perplexity, Google AI Overviews, Gemini) checklist

What these engines need in order to recommend Haulin Junkies for "dumpster rental in Orlando":

| Signal | Status |
|---|---|
| Crawlable by AI bots (robots.txt allows GPTBot, PerplexityBot, ClaudeBot, Google-Extended) | ✅ `User-agent: * Allow: /` |
| `llms.txt` positions the business for dumpsters | ✅ fixed in this pass |
| Extractable, specific facts (prices, sizes, inclusions) in plain HTML near the top of the page | ✅ fixed in this pass (quick answer + table) |
| FAQ content matching real buyer questions, mirrored in schema | ✅ 9 FAQs |
| Consistent facts across site, schema, GBP, and directories (price, hours, sizes) | ⚠️ 24/7 vs. hours; 15/20/25 yd prices missing; check Yelp/Thumbtack list dumpsters |
| Third-party mentions (directories, reviews mentioning "dumpster") | ❌ biggest gap. AI answers lean heavily on Yelp, Google reviews, Angi, Thumbtack, Nextdoor, and local "best dumpster rental Orlando" listicles |
| Real photos / first-hand proof | ❌ client photos needed |

**Citations to add or update for dumpsters:** Yelp (add the "Dumpster Rental" category), Thumbtack (dumpster rental service), Angi, Nextdoor business page, Bing Places (it feeds ChatGPT search; copy the GBP categories), Apple Business Connect.

**Monthly AI visibility check** (5 minutes): ask ChatGPT, Perplexity, and Google (AI Overview) "best dumpster rental in Orlando", "how much is a 20 yard dumpster in Orlando", and "dumpster rental Maitland FL". Log whether Haulin Junkies is mentioned or cited.

## Scorecard to track (replaces average position)

| Query | Page | Now (Jul–Oct) |
|---|---|---|
| dumpster rental orlando (+ variants) | dumpster-rentals.php | pos ~100–141, 1 click |
| rent a dumpster / dumpster rental near me | GBP + dumpster-rentals.php | 40 impr, pos 1.0 (verify the feature) |
| commercial dumpster rental (near me) | dumpster-rentals.php | 7 impr, pos 33–41 |
| dumpster-rentals.php total impressions | — | **2** |
| estate clean-out orlando | estate-cleanout.php | 145 impr, pos ~52 |
| junk removal orlando | junk-removal-orlando.php | 67 impr, pos 75 |

Check again around 2026-11-15, 4 weeks after deploy. A realistic first sign of success is dumpster-rentals.php going from 2 impressions to 50+ per month. Expect clicks to follow GBP category and review changes before organic.

## Deploy

All code changes are uncommitted site files at the repo root, not inside `ops/`. Deploy them to `main` the same way as the September SEO work, then in GSC:

1. URL Inspection → Request indexing for `/dumpster-rentals.php` and `/`.
2. Resubmit `sitemap.xml`.
3. Rich Results Test on `/dumpster-rentals.php`. Expect FAQ, Breadcrumb, and no Product errors.
