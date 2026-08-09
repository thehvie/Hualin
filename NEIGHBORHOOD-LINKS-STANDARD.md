# Neighborhood Links — Standard Design

All neighborhood/sub-area link lists must use the `locations-list` pattern below.
Do NOT use `class="area-link"` (pill/button style) — that has been retired.

---

## Pattern A — With dedicated sub-pages (use `<a>` tag)

Use this when the neighborhood has its own `.php` page (e.g. `maitland-downtown.php`).

```html
<ul class="locations-list">
  <li><a href="area-name.php" style="color:#ff6b35; text-decoration:none; font-weight:600;">Area Name</a></li>
  <li><a href="area-name-2.php" style="color:#ff6b35; text-decoration:none; font-weight:600;">Area Name 2</a></li>
</ul>
```

**Pages using Pattern A:**
- `maitland.php` — 16 sub-area links
- `baldwin-park.php` — 16 sub-area links (fixed April 2026)
- `orlando.php`
- `winter-park.php`
- `windermere.php`

---

## Pattern B — No dedicated sub-pages (use `<span>` tag)

Use this when no individual sub-page exists for the neighborhood. Same visual appearance.

```html
<ul class="locations-list">
  <li><span style="color:#ff6b35; font-weight:600;">Area Name</span></li>
  <li><span style="color:#ff6b35; font-weight:600;">Area Name 2</span></li>
</ul>
```

**Pages using Pattern B (fixed April 2026):**
- `altamonte-springs.php`
- `apopka.php`
- `oviedo.php`
- `kissimmee.php`
- `longwood.php`

---

## What it looks like
- Bullet list, two columns on desktop
- Orange bold text (`#ff6b35`)
- No underline, no button/pill border
- Clean neighborhood names only — no appended service words ("junk removal", "cleanouts", etc.)

---

## Rules
1. Always use `<ul class="locations-list">` as the wrapper
2. List only the neighborhood/area name — never append "junk removal", "cleanouts", "furniture removal", etc.
3. Use Pattern A if a sub-page exists, Pattern B if not
4. The `.locations-list` CSS is defined inline in each page's `<style>` block

---

## Do NOT use (retired)

```html
<!-- WRONG — pill button style, retired -->
<a href="area-name.php" class="area-link">Area Name</a>

<!-- WRONG — plain text, no styling -->
<li>Downtown Apopka junk removal</li>
```
