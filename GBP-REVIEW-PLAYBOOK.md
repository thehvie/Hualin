# Google Business Profile + Review Engine — Playbook

**Created:** 2026-09-10
**Owner:** CLIENT (Eric & Glenda) executes; Claude maintains the copy + `/review.php`
**Companion to:** [`seo-growth-plan-2026-09.md`](seo-growth-plan-2026-09.md) — this is Workstream A, spelled out.

---

## Why this doc exists

Per the Sept 10 GSC + GBP review: the website work is done and working through
recrawl. The thing holding back the map pack — where junk-removal customers
actually convert — is **Workstream A**, and the single biggest lever inside it
is **review volume**.

Right now: **3 Google reviews.** Orlando junk-removal competitors in the 3-pack
run 100–900+. Categories, photos, and posts matter, but nothing moves local
rank like a steady stream of new reviews. Everything below is in priority
order.

---

## 1. Get your Google review link (5 minutes, do this first)

1. Open the Business Profile (search "Haulin Junkies" while signed in, or
   business.google.com).
2. Click **"Ask for reviews"** (sometimes "Get more reviews").
3. Copy the short link Google gives you. It looks like:
   `https://g.page/r/CxxxxxxxxxxxxxxxxEAI/review`
4. Put it in **two** places:
   - `review.php` — the line `var GOOGLE_REVIEW_URL = "";` (near the bottom).
     Paste the link between the quotes. Or send it to Claude to commit.
   - Everywhere in this doc that says `[REVIEW LINK]`.
5. Make a short, memorable redirect for texts/cards:
   `haulinjunkies.com/review` already exists (the funnel page) — that's what
   goes on the truck, invoices, and texts. It routes to the Google form.

---

## 2. The review ask — process

**Who:** whoever runs the job (or Glenda from the office that evening).
**When:** within **1 hour** of finishing, while the customer is still happy and
the empty space is fresh. Same-day at the latest.
**How:** text first (90%+ open rate). Email only if you have no mobile number.
**Follow-up:** one time, ~3 days later, if they haven't left one. Never more.

Log it: a simple sheet — date, customer, job type, city, "asked?", "left?".
Two reviews a week, every week, gets you to 25+ by year end and keeps climbing.

### Text — initial

> Hi [Name], thanks for choosing Haulin Junkies today! If we did right by you,
> a quick Google review genuinely helps our small family business:
> haulinjunkies.com/review — thank you! — Eric & Glenda

### Text — follow-up (day 3, only if no review yet)

> Hi [Name], hope the space is still feeling good! If you have 30 seconds, a
> Google review would mean a lot to us: haulinjunkies.com/review. No worries
> if not — thanks again for the business.

### Email (only when there's no cell number)

> **Subject:** Thanks from Haulin Junkies — quick favor?
>
> Hi [Name],
>
> Thank you for having us out today. We hope the [garage / house / property] is
> feeling lighter.
>
> We're a small family-owned crew, and Google reviews are the main way new
> customers find us. If you were happy with the job, would you leave us a
> quick review? It takes about a minute:
>
> **haulinjunkies.com/review**
>
> If anything wasn't right, reply straight to this email and we'll fix it.
>
> Thanks again,
> Eric & Glenda
> Haulin Junkies · (407) 815-4926

---

## 3. Respond to every review (within 24–48 hrs)

Responses are a ranking and trust signal. Keep them short, specific, no
copy-paste feel. Use the customer's name and one detail from the job.

### 5-star, detailed

> Thank you, [Name]! [One specific callback — "That garage was a big one" /
> "Glad we could get the estate cleared before the closing date"]. It was a
> pleasure working with you — call us anytime. — Eric & Glenda

### 5-star, no text ("just the stars")

> Thanks for the 5 stars, [Name]! We appreciate you choosing a local family
> business. — Haulin Junkies

### 4-star

> Thanks for the review and the honest feedback, [Name]. If there's something
> we could have done to make it a 5, we'd genuinely like to hear it —
> (407) 815-4926. We'll use it to get better.

### 3-star or lower

> [Name], I'm sorry we missed the mark. That's not the standard we hold
> ourselves to. I'd like to understand what happened and make it right —
> please call me directly at (407) 815-4926. — Eric

**Then actually call them.** A negative review that gets a calm, fast, public
response and a real fix does less damage than five perfect reviews do good —
prospects read the response, not just the star.

### Fake / not-a-customer review

Respond publicly ("We have no record of serving anyone by this name — please
contact us so we can look into this") **and** flag it to Google via the
profile ("Report review"). Don't argue.

---

## 4. GBP profile fixes (do once, this week)

### Categories

| Action | Category |
|---|---|
| Keep (primary) | Junk removal service |
| Keep | Debris removal service |
| Keep | Dumpster rental service |
| **DELETE** | **Waste management service** — signals recurring municipal/commercial contracts; invites confusion with the company *Waste Management* |
| **DELETE** | **Garbage collection service** — signals weekly curbside bin pickup; pulls low-intent "trash pickup" searches you can't serve |
| Add only if true | Demolition contractor (small interior teardowns only) |

Fewer accurate categories rank better than a wide net.

### Service area

Swap the two outliers for high-value core Orange County areas:

- Remove **Winter Haven** (Polk County, ~40 min south) → add **Dr. Phillips**
- Remove **Pine Hills** (low average ticket) → add **Lake Nona**

Keep it at ~20 areas, all inside the Orlando metro. Still take jobs outside
it — just don't list them.

### Fix the service typos

- "Property Managment" → **Property Management Turnovers**
- "Estate Clean outs" → **Estate Cleanouts**

### Other

- Website link → `https://haulinjunkies.com/?utm_source=gbp&utm_medium=organic`
  (so GBP traffic is visible in analytics)
- Turn on **messaging**
- Attributes: "Online estimates", "Onsite services", "Family-owned" (if the
  identity attribute is offered)

---

## 5. Business description (paste-ready — 730 chars, first ~200 are what shows)

> Haulin Junkies is a family-owned junk removal and hauling company serving
> Orlando and Central Florida with same-day and next-day pickup. We haul
> furniture, appliances, mattresses, hot tubs, yard waste, construction
> debris, and whole-property cleanouts for homes and businesses. Every load is
> sorted — we donate what's usable, recycle metal and e-waste, and keep as
> much as possible out of the landfill. Pricing is upfront and in person, with
> no hidden fees or trip charges. Licensed and insured. Owners Eric and Glenda
> are on site for most jobs. Serving Orlando, Winter Park, Maitland,
> Windermere, Dr. Phillips, Lake Nona, Kissimmee, Oviedo, Sanford, Lake Mary
> and the surrounding metro. Call or text (407) 815-4926 for a free quote.

---

## 6. Services list (paste-ready — name + description for each)

Add/return these under the **Junk removal service** primary category. Each
description mentions the metro and a price or speed cue.

- **Junk Removal** — Same-day and next-day junk removal in Orlando and Central
  Florida. Furniture, appliances, electronics, boxes, and clutter from any
  room, the garage, attic, or yard. You point, we carry. Priced by volume,
  from about $150 for a minimum load.
- **Estate Cleanouts** — Full-service estate and downsizing cleanouts across
  the Orlando metro. We sort keep/donate/haul, coordinate with family and
  Realtors, and leave the home broom-clean. Most whole-home cleanouts run
  $1,500–$4,000+, quoted on site.
- **Foreclosure & Eviction Cleanouts** — Fast property clear-outs for banks,
  REO firms, landlords, and property managers in Orlando. Insured, photo-
  documented, turnaround in days.
- **Property Management Turnovers** — Tenant move-out and turnover cleanouts
  for Orlando-area rental portfolios. Recurring scheduling available.
- **Apartment & Condo Cleanouts** — Quick apartment and condo cleanouts for
  move-outs, evictions, and inherited units throughout Central Florida.
- **Hot Tub Removal** — We disconnect, break down, and haul away hot tubs and
  spas in Orlando. Same-week appointments. Typically $350–$700 depending on
  access.
- **Appliance Removal** — Refrigerators, washers, dryers, dishwashers, ranges,
  and water heaters hauled from anywhere on the property. Metal is recycled.
- **Furniture Removal** — Couches, mattresses, dressers, desks, patio sets —
  single pieces or a houseful. Usable furniture goes to local donation
  partners.
- **Construction & Renovation Debris** — Drywall, wood, flooring, cabinets,
  fixtures, and remodel debris removed from Orlando job sites and homes.
- **Garage, Attic & Basement Cleanouts** — We clear the whole space in one
  visit and sweep up after.
- **Hoarding Cleanouts** — Discreet, patient, judgment-free full-property
  cleanouts. We work at the family's pace.
- **Dumpster Rentals** — Driveway-friendly 12, 14, 16, and 20-yard roll-off
  dumpsters for Orlando-area projects. Flat rate, no permit hassle.
- **Donated Goods Pickup** — Free or low-cost pickup of gently used furniture,
  appliances, and housewares we can route to local charities.
- **Senior Move Management** — Compassionate downsizing help for Orlando-area
  seniors and families: sort, pack, move, and clear the old home.

---

## 7. Q&A seed (post these yourself, then answer from the owner account)

1. **Q:** Do you offer same-day junk removal?
   **A:** Yes — same-day and next-day service is available across the Orlando
   metro most days. Call or text (407) 815-4926 and we'll give you a two-hour
   arrival window.
2. **Q:** How is pricing calculated?
   **A:** By how much room your stuff takes in the truck. A minimum load
   starts around $150; a full truck runs $725–900. You get a firm price on
   site before any work starts — no hidden fees.
3. **Q:** What areas do you serve?
   **A:** Orlando and the surrounding metro — Winter Park, Maitland,
   Windermere, Dr. Phillips, Lake Nona, Kissimmee, Oviedo, Sanford, Lake Mary,
   Clermont, and more.
4. **Q:** Do you donate or recycle?
   **A:** Yes. Every load is sorted — usable items go to local donation
   partners, metal and appliances to recyclers, and only what's left goes to
   the landfill.
5. **Q:** Do I need to move things outside first?
   **A:** No. We remove items from anywhere on the property — upstairs, attic,
   garage, backyard, storage unit. You just point.
6. **Q:** What won't you take?
   **A:** Hazardous materials — wet paint, chemicals, motor oil, solvents,
   asbestos, propane tanks, and medical waste.
7. **Q:** Are you licensed and insured?
   **A:** Yes, fully licensed and insured. We can send a certificate of
   insurance for commercial and property-management jobs.
8. **Q:** Can you handle a full estate or hoarding cleanout?
   **A:** Yes — that's one of our specialties. We work with the family and
   any Realtor, sort keep/donate/haul, and leave the home broom-clean.

---

## 8. Products (replace the AI/stock images with real job photos)

Keep 4–6, each with a **real** before/after photo and a price range:

| Product | Price field | Photo needed |
|---|---|---|
| Single-Item Pickup | From $150 | A crew member carrying one couch/appliance to the truck |
| Garage Cleanout | $300–$600 | Before/after of a cleared garage |
| Whole-Home / Estate Cleanout | $1,500–$4,000+ | Before/after of a furnished room emptied |
| Construction Debris Haul | $350–$900 | Truck bed loaded with reno debris |
| Hot Tub Removal | $350–$700 | Spa being broken down |
| 15-Yard Dumpster Rental | Flat rate — call | Dumpster in a driveway |

Until real photos exist, run **fewer** listings rather than fake-looking ones.

---

## 9. Weekly GBP posts (resume — last one was Aug 14)

One post a week. Photo + 2–3 sentences + a button. Rotate these angles:

1. **Job spotlight** — "Cleared a two-car garage in Oviedo this morning —
   trailer to donation center, metal to the recycler, driveway swept.
   Same-day slots open this week." [Call now]
2. **Before/after** — pair of photos, name the neighborhood, one line.
3. **What happens to your stuff** — a photo at the donation partner: "Every
   load gets sorted. This week's usable furniture went to [partner]." [Learn
   more → donation-partners.php]
4. **Service spotlight** — "Estate cleanout season. We coordinate with the
   family and the Realtor, sort keep/donate/haul, and leave it broom-clean."
   [Learn more → estate-cleanout.php]
5. **Offer** — "Book a full-truck load this week, mention this post, save
   $50." [Call now]
6. **Seasonal** — pre-move season, spring cleaning, post-storm yard debris,
   end-of-year garage clean-out.
7. **Team** — a photo of Eric & Glenda / the crew. People hire people.
8. **Review shout-out** — screenshot a great new review (with the customer's
   permission) and say thanks.

---

## 10. Photo shot list (target 30+ on the profile, add 2–3/week)

Priority order:

1. Branded truck, exterior, logo visible, clean
2. Eric & Glenda together (profile "team" photo)
3. Crew in Haulin Junkies shirts, mid-job
4. 6+ before/after pairs — garage, living room, yard, storage unit, office
5. A loaded truck bed
6. Unloading at a donation center / recycler
7. A hot tub being broken down
8. A dumpster placed in a driveway
9. Wide shot of a finished, broom-clean space

Take them on a phone, landscape, good light. Upload a few at a time — steady
activity is its own signal.

---

## 11. Citations — exact NAP (submit ~1 batch/week)

Use this string **identically** everywhere — no abbreviation swaps:

```
Haulin Junkies
1375 Lake Shadow Cir, Maitland, FL 32751
(407) 815-4926
https://haulinjunkies.com/
```

Priority list (check off as done):

- [ ] Bing Places for Business
- [ ] Apple Business Connect (Maps)
- [ ] Yelp — confirm existing listing matches exactly
- [ ] Facebook page — confirm address/phone match
- [ ] Better Business Bureau
- [ ] Angi
- [ ] Thumbtack — confirm existing matches
- [ ] HomeAdvisor
- [ ] Nextdoor Business
- [ ] Yellow Pages (yp.com)
- [ ] Foursquare
- [ ] Manta
- [ ] Chamber of Commerce (Maitland / Winter Park / Orlando regional)
- [ ] Hotfrog
- [ ] Brownbook
- [ ] Cylex
- [ ] Superpages
- [ ] MapQuest
- [ ] eLocal
- [ ] Angi's "Junk Removal near me" category page
- [ ] LoadUp / junk-removal aggregator partner listings (optional, lead cost)

Consistency matters more than volume. One wrong phone number across three
directories does measurable damage.

---

## 12. What Claude does alongside this

- [x] `/review.php` funnel page — live once deployed
- [x] Dead internal links + sitemap cleanup
- [ ] `estate-cleanout.php` full rebuild (structure; photo slots for later)
- [ ] Top-8 location pages differentiated with researched local detail
- [ ] Re-request indexing on the money pages + `service-areas.php`
- [ ] Drop `GOOGLE_REVIEW_URL` into `review.php` once the client sends it

---

## 13. Leading indicators (check weekly, Mondays)

| Metric | Baseline (Sep 10) | 30 days | 90 days |
|---|---|---|---|
| Google reviews | 3 | 10+ | 25+ |
| Reviews in last 30 days | ~0 | 6+ | 8+/mo pace |
| GBP calls / 30 days | unknown — check | +25% | 2× |
| GBP direction requests + website clicks | unknown — check | rising | rising |
| Money-query positions (scorecard in the plan) | pages 5–8 | −5 to −15 spots | page 2–3 on the easier terms |
| Pages with >0 GSC clicks | 1 (homepage) | 2–3 | 5+ |

If reviews hit 25+ and GBP is fully fixed but calls are still flat at 90 days,
the constraint is competitive density in Orlando — at that point start the
Local Services Ads test (numbers already worked up) and lean the site harder
into estate / foreclosure / hoarding cleanouts where the field is thinner.
