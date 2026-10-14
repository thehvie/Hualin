# Product roadmap (rebuilt 2026-10-13)

## Who we sell to
Small and mid-size dumpster rental, roll-off and junk removal operators who keep their books in **QuickBooks**.

## How we win
- **Now: beat iCans** ($99 / $159 a month, unlimited users, driver app, AI route building, AI review requests) on **AI**, **online ordering** and **price/setup speed**.
- **Later: grow toward TrashLab** (telematics, call center, larger commercial haulers) only after the small-operator product is solid.
- Positioning: *the AI-run office for dumpster and junk operators: customers order online, AI takes the questions, you dispatch and bill from one place, and it all lands in QuickBooks.*

## What we already have
Estimates with voice and typed AI drafting, e-sign and terms snapshots, invoices (direct, from estimates, deposits, payment link), fleet and availability, package pricing with extra-day and overweight billing, dispatch board, maps (lookup, day, dumpsters on site), fuel surcharge by distance, Inbox with email and text and photos, own-Mailgun setup, usage metering and billing, multi-company.

## Where we're behind iCans
Driver app, online card and ACH payments, QuickBooks sync, customer portal and online booking with availability, automated notifications, client-specific pricing, reports.

---

## Stage 1: Foundation (needed before anything customer-facing)
| Item | Why | Size |
|---|---|---|
| **Online payments** (Stripe per company: card, ACH, deposits, refunds) | The storefront can't take orders without it; invoices update themselves | L |
| **Twilio live** + A2P registration | Text is where customers and the AI assistant live | S (approval takes weeks, start now) |
| **Rental agreement** e-sign (terms, prohibited items, placement, ID optional) | Required for online orders; builds on the terms snapshot | M |
| **Driver view in the phone browser** (today's stops, one tap delivered / picked up, photo, signature, load state: empty, full, dumped) | Matches iCans' driver app; our stops and statuses already exist | M |
| **Rental countdown + AI-assisted reminders**: a live counter on estimates, jobs, Dispatch and the dumpster map (delivers in, time left, overdue); reminders before the end by rules (24 h and 2 h before, quiet hours, skip if pickup requested), AI writes the message and reads replies like "extend till Friday" and proposes the action; review mode first. Full design in `HANDOFF.md`. | Table stakes, and an iCans differentiator | M |

## Stage 2: Online ordering (the e-commerce piece) + AI order taking
| Item | Detail | Size |
|---|---|---|
| **Order page and website widget** per company | Pick service (drop-off, pickup, swap, junk removal), size, address with autocomplete, **service-area and delivery fee from distance**, dates from **live availability**, extras (extra days, mattress, tires), contact, sign the agreement, pay deposit or in full. Creates customer, approved estimate, job, reservation and payment. | L |
| **Company settings for ordering** | Service area, lead time, blackout dates, delivery windows, per-size prices, auto-confirm or review first | M |
| **Customer self-service link** (no login) | See the rental, request pickup, ask for more days, pay the balance | M |
| **AI order assistant** (website chat and SMS) | "20-yard Saturday to Friday at 123 Main": checks availability, quotes with package price and fuel, books through the same engine. Starts as **suggest and you approve**, later auto for clear cases, with hand-off when unsure. | L |
| **"What size do I need?"** from a description or photos | Recommends a size and quotes | M |

## Stage 3: QuickBooks + AI operations
| Item | Detail | Size |
|---|---|---|
| **QuickBooks Online sync** (customers, items, invoices, payments, refunds) | Needed by the target customer; requires Intuit's app approval | L |
| **AI dispatcher** | Proposes driver, unit and stop order for the day using real drive times; one tap to accept; "move D-12 to Smith on Thursday" by voice or text | L |
| **AI inbox** | Reads replies and texts, tags intent (pickup request, extension, complaint), drafts replies, and can mark pickup requested after your confirm | M |
| **Voice and typed commands everywhere** (invoices, items by voice on invoices, dispatch) | Already built for estimates | S |
| **Google review requests** after a paid invoice | Parity with iCans' review filter | S |
| **Daily brief** (AI summary: drops, pickups, overdue, unpaid) | Cheap and visible | S |
| **Contractor and client-specific pricing**, discount groups | Parity | M |
| **Reports**: fleet utilization, revenue per dumpster, top clients, unpaid by age, landfill cost | Parity | M |

## Stage 4: Grow toward TrashLab
Route optimization at scale, dumpsite and landfill tracking and costs, scale tickets, truck telematics (Motive, Samsara), AI phone answering (Twilio voice), commercial recurring-route billing, Xero and more accounting, multi-location. Only on customer demand.

---

## What would beat iCans (the pitch)
1. **AI that takes the order**, not just builds routes. They list none.
2. **Online ordering with live availability and distance-based delivery fees**, with the agreement and payment in one flow.
3. **QuickBooks-ready**, with published pricing and setup in minutes (TrashLab sells by demo only).
4. **One system for dumpsters, junk removal and equipment.**

## Risks and dependencies
- A2P 10DLC approval takes days to weeks. Start it now.
- Stripe Connect onboarding for each company, and Intuit's review for QuickBooks. Both have lead time.
- AI quotes and bookings must stay human-reviewed until accuracy is measured per company. Log each AI quote against the final price.
- Google Maps and AI cost per use: keep the existing metering and the $50 cap.
- A rental agreement is a legal document. Have the template reviewed by a lawyer before it ships as a default.

## Open decisions
- Pricing model: keep **$99 base with AI included up to an allowance**, then metered overage (already built), or tiers like iCans.
- Does a company's customer pay the platform fee (Stripe application fee), or only the company?
- Free website for companies without one (iCans offers this), or widget only?
