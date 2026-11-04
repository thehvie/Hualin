# SEO Audit - 2026-11-04 - Index drop diagnosis + AI search readiness

**Scope:** repo state at commit `9d36f6f` (live and in sync), full crawl of
`https://haulinjunkies.com`, structured-data validation, and a pairwise
content-similarity analysis of the 26 city pages.

**Data used:** live HTTP headers/status for all sitemap URLs, live redirect
checks, rendered HTML from the repo, and the GSC figures already recorded in
[`seo-action-plan.md`](seo-action-plan.md) and
[`SEO-SITE-AUDIT-2026-08-28.md`](SEO-SITE-AUDIT-2026-08-28.md).

---

## 1. Short answer: why the index dropped

It is **not** a technical indexing blocker. Every check came back clean:

| Check | Result |
| --- | --- |
| All sitemap URLs return 200 | 58/58 |
| Canonical present and self-referencing | 58/58 |
| `noindex` meta or `X-Robots-Tag` on indexable pages | none |
| Pruned-page 301s live (`/geneva.php`, `/gotha.php`, ... 17 URLs) | 301 -> correct target |
| `/orlando.php`, `/index.php`, `/*.html`, underscore URLs | 301 -> correct target |
| `robots.txt` blocking Googlebot or AI crawlers | no |
| Sitemap in repo vs live | identical (58 URLs) |
| Live site vs `HEAD` | in sync |

The cause is **content-level duplication across the city pages**. Measured on
the live site before any change:

- 16 of 26 city pages shared the *same H2 skeleton*, only the city name swapped:
  "`<City>`'s #1 Junk Removal Company / Professional Junk Removal Services in
  `<City>`, FL / Same-Day Junk Removal in `<City>` / ... / Nearby Cities We
  Serve".
- Every city page carried the **same four boilerplate paragraphs** ("From
  Downtown Orlando furniture removal to College Park estate cleanouts...",
  "Born and raised in Central Florida...", the 6-item "Why Choose" list, and the
  same 4-question FAQ with only the city name replaced).
- Worst duplicate pairs: College Park / International Drive **69.8%**,
  Heathrow / Hunter's Creek **60.0%**, Kissimmee / Longwood **58.1%**,
  Altamonte Springs / Ocoee **57.9%** (5-word shingle Jaccard).

That is exactly the signal that produces "Crawled - currently not indexed": the
GSC export recorded in `seo-action-plan.md` showed 36 "Crawled - not indexed" +
6 "Discovered - not indexed" on a site with 42 templated location pages. Google
picks one page of the cluster and parks the rest. **Any new templated city page
therefore shows up as a net index loss, not a gain.**

Contributing factors, in order of impact:

1. **Boilerplate duplication** (above) - the dominant cause.
2. **Deliberate pruning on 2026-08-16** removed 17 URLs + `orlando.php`. Pruning
   always shows as a temporary index dip before it pays off, which is why the
   recovery to 62 indexed pages took weeks.
3. **Homepage repositioning (2026-08-16 and 2026-10-17)** moved the primary
   keyword from "junk removal Orlando" to "junk removal & dumpster rental
   Orlando". A homepage title/H1 pivot on a small site triggers a full
   re-evaluation of the domain and a 4-8 week ranking reset.
4. **Thin support pages**: `junk-blog.php` (445 words) with no article schema,
   `items-we-take.php` with a meta description that named the wrong city
   (Winter Garden) on a sitewide page.

Technical items that were also wrong and are now fixed: `items-we-take.php` had
**no closing `</head>`** (the entire body parsed inside `<head>`),
`contact_us.php` had **two `</head>` tags**, and three city pages shared the
identical H1 "Orlando Junk Removal Services".

---

## 2. What was changed in this pass

### Content differentiation (the actual fix)
- Added a unique, city-specific section to **20 city pages** (`alafaya`,
  `altamonte-springs`, `apopka`, `baldwin-park`, `clermont`, `college-park`,
  `doctor-phillips`, `downtown-orlando`, `heathrow`, `horizon-west`,
  `hunters-creek`, `international-drive`, `kissimmee`, `lake-buena-vista`,
  `lake-mary`, `longwood`, `ocoee`, `oviedo`, `sanford`, `st-cloud`,
  `winter-garden`) plus 3 city-specific FAQs each, written from verified local
  facts (county, housing stock, access constraints, published pricing), not
  invented claims.
- Similarity after the change: average pairwise Jaccard **25.2% -> 21.9%**,
  pairs over 50% **16 -> 1**, worst pair **69.8% -> 60.2%**.

### Structured data (Google + AI answer engines)
- `Service` + `BreadcrumbList` on the 16 city pages that had none.
- `FAQPage` built from the visible FAQ text on each page (schema mirrors
  on-page content verbatim - never fabricated).
- `WebPage` / `CollectionPage` + `about: LocalBusiness` on the remaining
  content pages (`items-we-take`, `junk-blog`, `donation-partners`,
  `what-items-can-junk-removal-take`, `how-to-know-when-to-replace-a-refrigerator`,
  `tips-for-moving-things`, `privacy_policy`, `terms_and_conditions`).
- `ContactPage` + `LocalBusiness` on `contact_us.php`.
- **JSON-LD blocks on the site: 0 new -> 120 total, 0 invalid.**

### On-page fixes
- One H1 per page sitewide (was 2 on `donation-partners`, `service-areas`; 3
  city pages shared the same H1).
- Duplicate `<title>`: 0. Duplicate H1: 0. Duplicate meta description: 0.
- Fixed `items-we-take.php` meta description (was pointing at Winter Garden).
- Shortened `service-areas.php` meta description from 276 to 148 characters.
- Added `</head>` to `items-we-take.php`, removed the duplicated `</head>` on
  `contact_us.php`.

### Crawl + AI readiness
- `robots.txt`: explicit `Allow` for `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`,
  `ClaudeBot`, `Claude-User`, `Claude-SearchBot`, `PerplexityBot`,
  `Perplexity-User`, `Google-Extended`, `Applebot-Extended`; `Disallow` for
  `/contact_images.php`, `/composer-setup.php`, `/includes/`, `/deploy/`,
  `/ops/`.
- `X-Robots-Tag: noindex, nofollow` on `contact_images.php` (form handler) and
  `composer-setup.php` (build tool).
- `sitemap.xml`: added `privacy_policy.php` and `terms_and_conditions.php` (both
  were live, indexable and unlisted). `review.php` intentionally stays out - it
  is `noindex, follow` by design.
- `llms.txt`: added a full service-area index (one line per city page) and a
  Business Facts block (NAP, hours, service radius, quote flow, disposal
  policy, pricing rules) so AI crawlers get grounded facts instead of guessing.

---

## 3. Verification

```
JSON-LD blocks: 120, invalid: 0
pages checked: 60
pages with != 1 H1: none
pages with 0 JSON-LD: review.php (intentional - noindex)
duplicate title: 0 | duplicate h1: 0 | duplicate desc: 0
PHP lint: 65 files, errors: 0
rendered 60 sitemap pages; problems: 0
```

---

## 4. What still needs doing (in priority order)

1. **Rewrite the remaining shared boilerplate.** The "Why Choose Haulin Junkies"
   6-item list, the "Local `<City>` Business Committed to Our Community"
   paragraph and the original 4-question FAQ are still identical sitewide. That
   is the ~45% of each page that keeps pairs in the 40-50% range. This is the
   single highest-value remaining task.
2. **Cannibalization:** the homepage, `junk-removal-orlando.php` and
   `residential.php` all target "junk removal Orlando". Pick one owner per query
   and differentiate the other two.
3. **32 meta descriptions are still over 170 characters.** Google truncates
   around 155-160, so the CTA is getting cut. Trim the money pages first.
4. **Deploy + GSC follow-up:** resubmit `sitemap.xml`, run URL Inspection ->
   Request indexing on `/`, `/dumpster-rentals.php`, `/junk-removal-orlando.php`
   and the 20 touched city pages. Expect 2-4 weeks before the coverage report
   reflects the change.
5. **Remove `composer-setup.php` from the web root** entirely - `noindex` is a
   stopgap, not a fix. It is a Composer installer that has no reason to be
   public.
