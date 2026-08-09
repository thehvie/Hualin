# Weekly SEO Audit Checklist

Reusable prompt/checklist for a recurring automated audit (e.g. via n8n → Claude Code CLI). Designed to be run against a fresh clone/pull of the GitHub repo, on a schedule, with findings delivered as a report or a PR — **never as a direct push to main**.

Every item below was found manually at least once in this codebase between 2026-08 and now. The point of this file is to stop re-discovering the same categories of bug by hand.

---

## How this should run

1. Fresh `git pull` (or clone) of the repo — always audit the current state, not a stale local copy.
2. Work through every check below.
3. Output a single report grouped by category, each finding with: file path, line/section, what's wrong, suggested fix.
4. If auto-fixing is enabled for a given check (marked below), apply the fix on a new branch and open a PR with the report as the PR description. Do not push directly to main. Do not touch CSS, layout, or visual structure — content, links, meta tags, and schema only, unless explicitly told otherwise.
5. If auto-fixing is not enabled, just report — do not edit files.

---

## 1. URL & redirect hygiene

- [ ] Search every `.php` file (including `includes/header.php` and `includes/footer.php`) for `href` values using underscore-style URLs (e.g. `apartment_cleanouts.php`, `estate_cleanout.php`) instead of the current hyphenated filenames. These aren't dead links (`.htaccess` redirects them) but they waste internal link equity by routing through an unnecessary redirect. **[safe to auto-fix]**
- [ ] Cross-check every `Redirect 301` rule in `.htaccess` still points to a file that exists.
- [ ] Check whether any URL pattern that used to exist (old `.html` versions, renamed pages) is still being indexed by Google per the Search Console Pages report, and confirm the corresponding redirect is in place and working (`curl -I` should return 301, not 200 or 404).

## 2. Broken / dead internal links

- [ ] Extract every relative `href="*.php"` across all pages (main content + sidebars + header/footer includes) and verify the target file exists on disk. Flag anything that 404s. **[safe to auto-fix if a clearly-correct target page exists; otherwise report only]**
- [ ] Flag any `href="#"` that isn't a legitimate JS-driven interaction (modal triggers, dropdown toggles) — these are usually leftover placeholder links (breadcrumbs, brochure downloads, social icons) that should point somewhere real or be left alone if genuinely decorative.
- [ ] Check for HTML comment blocks containing dead/irrelevant nav items (leftover template cruft) — these aren't bugs since they don't render, but flag if they're ever uncommented accidentally.

## 3. Meta tag health

- [ ] Title tags: flag if missing, if over ~60 characters (will truncate in SERPs), or if duplicated across two or more pages (keyword cannibalization signal).
- [ ] Meta descriptions: flag if missing, under 120 characters, or over ~160 characters (Google truncates and it likely means a poor SERP snippet / weak CTR).
- [ ] Flag any two pages whose `<title>` and `<h1>` target the same exact keyword phrase — likely cannibalization (like `index.php` vs `orlando.php` was).

## 4. Schema markup

- [ ] Every page with a `LocalBusiness` schema block: confirm `aggregateRating` values aren't hardcoded identically across every single page site-wide unless that's a verified, current, real number from Google Business Profile. Flag if suspicious.
- [ ] Every page with a visible FAQ section (look for "Frequently Asked Questions" headings or `.faq-item` blocks): confirm a matching `FAQPage` JSON-LD block exists and its questions/answers match the visible text verbatim. **[safe to auto-fix — generate FAQPage schema from visible content]**
- [ ] Every blog-style page (long-form content, published/updated date visible): confirm `Article` schema exists with correct `headline`, `datePublished`, `author`, `publisher`.
- [ ] Validate every JSON-LD block on every touched page actually parses as valid JSON (a single missing comma silently breaks structured data). Run this as an automated check, not manual review.
- [ ] Flag any FAQPage/Article schema that doesn't match visible on-page content — schema must mirror what's visibly on the page, never fabricated.

## 5. Sitemap health

- [ ] Every `.php` file in the project root that should be indexable has a corresponding `<url>` entry in `sitemap.xml`.
- [ ] Every `sitemap.xml` entry points to a file that still exists (no orphaned/removed pages left in).
- [ ] Flag any page edited in the last audit cycle whose `lastmod` date wasn't bumped.

## 6. Internal linking

- [ ] For the site's highest-priority pages (defined in Search Console Pages report as top by impressions), confirm they're linked from the header nav, footer, and/or at least one other relevant page with descriptive anchor text — not orphaned.
- [ ] Sidebar/service-list links on service pages: confirm every linked filename exists (this is where `services.php`, a page that was never created, kept getting linked from multiple pages).

## 7. AI search readiness

- [ ] `robots.txt`: confirm no `Disallow` rules block GPTBot, ClaudeBot, PerplexityBot, or Google-Extended.
- [ ] `llms.txt` at site root: confirm it still lists current services/pages and hasn't drifted from what the site actually offers.

## 8. Search Console cross-reference (manual step, needs fresh export)

This part can't run unattended without Search Console API access — flag it as a standing reminder in the report:
- [ ] Compare current Pages report against `sitemap.xml` — is Google still showing an old/redirected URL as the primary ranking page instead of the current one? (This happened with `estate_cleanout.php` vs `estate-cleanout.php` — Google held onto the old URL for months after the redirect went live.) If so, recommend requesting re-indexing on the correct URL via URL Inspection.

---

## Report format

```
## SEO Audit Report — [date]

### Critical (broken/incorrect, fix now)
- [file:line] — [issue] — [suggested fix]

### Moderate (opportunity, not broken)
- [file:line] — [issue] — [suggested fix]

### Needs human input (can't auto-resolve)
- [issue] — [why it needs a human — e.g. requires real GBP review count, requires GSC access]
```
