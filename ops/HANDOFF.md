# Haulin Ops: handoff for a new chat

Read this first, then `ops/ROADMAP.md` (the plan) and `ops/FUTURE-IDEAS.md` (parked AI/photo ideas).
Last updated 2026-10-13. Branch: `feat/multi-tenant-saas`. Last pushed commit: `3813c1a`.

## What this is
**Haulin Ops** is a multi-tenant SaaS for small and mid-size **dumpster rental, roll-off and junk removal** companies that use **QuickBooks**.
It lives in `ops/` of the repo `C:\xampp\htdocs\haulin` (the marketing site is the PHP code at the repo root; do not mix them up).
Stack: Next.js 16 (App Router, server actions), React 19, Prisma 5 + PostgreSQL, Tailwind 4, NextAuth, PM2 on a shared DigitalOcean droplet.
The SaaS will not be called "Haulin Junkies" (that's the first customer and the test domain). The brand name is still to be chosen.

## How the owner likes to work
- Terse messages. "commit and push" means do both. A plain "commit" means commit only; they say "push" separately.
- Wants the **steps in order and not over-explained**, copy-paste commands in code blocks, and plain-English summaries.
- Tends to test on the server right after pushing, so every push needs the **deploy commands** at the end of the message.
- Competitors they track: **iCans** (icans.ai) is the one to beat now; **TrashLab** (trashlab.com) later.
- Does not want customer-facing documents to show schedule dates (they change too much).

## Environment gotchas
- Windows + Git Bash. **Large heredocs containing apostrophes sometimes fail to parse in the Bash tool.** Use the Write/Edit tools, or write a Python script file to the scratchpad and run it.
- `npx prisma generate` fails with EPERM if the dev server is running. Stop the preview server first, then restart it.
- Typecheck with `npx tsc --noEmit` from `ops/` (no test suite). Dev server is the preview config `haulin-ops-dev` (port 3000). It needs a login, so UI can't be driven without credentials: don't guess passwords; ask the user to look.
- Migrations: `npx prisma migrate dev --name x` locally; `npx prisma migrate deploy && npx prisma generate` on the server.
- Do not put secrets in chat or files. API keys were pasted into the chat during setup, so assume they should be rotated.

## Deploy (server: ops.haulinjunkies.com, droplet 104.131.69.219, 2 GB RAM)
```bash
cd /var/www/haulin-ops && git pull origin feat/multi-tenant-saas
cd ops
npx prisma migrate deploy && npx prisma generate     # only when there are new migrations
NODE_OPTIONS=--max-old-space-size=1536 npx next build --webpack
pm2 restart haulin-ops --update-env
```
Never use a plain `next build` there (OOM-killed, leaves a broken `.next` and PM2 crash-loops). App runs on port 3010 behind nginx. The auto-deploy webhook is not registered.

## Accounts and settings: state
| Thing | State |
|---|---|
| Mailgun (shared sender `mg.haulinjunkies.com`) | Working. MX records and an inbound Route to `/api/mailgun/inbound` are set; replies land in the Inbox. Needs `MAILGUN_WEBHOOK_SIGNING_KEY` for signature checks. From address should not be a real mailbox (Outlook shows "Note to self"). |
| Google Maps | Browser key (referrer-restricted, Maps JavaScript) and server key (IP-restricted to the droplet, Geocoding + Routes). Billing enabled. |
| OpenRouter (voice and typed AI) | Working; default model google/gemini-2.5-flash via `OPENROUTER_VOICE_MODEL`. Needs credit (audio needs a $0.50 minimum). |
| Twilio | **Not set up.** Code is ready (`/api/twilio/inbound`). Needs paid account, number, A2P 10DLC registration, env vars. |
| Stripe | **Not set up** (signup and service-plan code exist; no live keys on the server). Online card/ACH payments for companies' customers are not built. |
| DigitalOcean Spaces | Code built, **turned off** (`DO_SPACES_*` unset); attachments are in Postgres. |
| Monthly usage billing cron | Endpoint exists (`/api/cron/usage-billing`), **not scheduled** on the server and needs Stripe. |
| Server `.env` | Needs `SECRETS_ENCRYPTION_KEY`, `CRON_SECRET`, Stripe vars, Twilio vars, Spaces vars as those features go live. |

## What is built (all pushed)
- **Customers, estimates, invoices, price book, jobs, schedule, service plans, purchase orders, online booking widget** (the original base).
- **Estimate builder** with photos, discount ($ or %), fuel surcharge field, deposit, **deposit-paid recording** (carries to the invoice as a payment), labor cost, margin %, **Convert to invoice** (any status), direct **New invoice** without an estimate, editable client and service address, payment link (Settings) shown under totals / on PDFs / in emails, phone numbers stored as `###.###.####`.
- **Terms & conditions** (Settings): main terms + extra **rental terms**; light formatting (### headings, **bold**, bullets, numbered); preview; signed estimates keep a **snapshot** of the terms.
- **AI** (OpenRouter): dashboard **command center** (hold-to-talk or type), voice intake on New estimate (customer, job details, dates, items matched to the price book), "Add items by voice" on estimates. Shared review panel, "not enough information" guard.
- **Communication**: Inbox, Email/Text tabs with attachments and photo viewer, unread badges, sender verification, send/receive limits, 500 MB attachment cap per company, replies routed by estimate/invoice, **own-Mailgun** setup per company with a 60-day shared-sender limit (existing companies exempt).
- **Maps**: estimate Location card (route, distance, drive time, fuel fee), **Map page** with address lookup (last 10 saved), **Day map**, **Dumpsters on site**; Office/Address/Whole route buttons.
- **Usage metering**: per company, $5/month included, overage at cost + 50% capped at $50, then paid features pause. Settings usage card.
- **Dumpster rentals (phase 1)**: Fleet page (units), rental package pricing on price book items (included days/tons, extra-day price, over-weight price, fleet size), **Rentals card on estimates** (reserve, assign units, availability, no double booking), **Dispatch** board (delivered, pickup requested, picked up with weight and ticket, undo), job page rentals, extra days and overweight added to the invoice when it is created.

## Migrations (apply in order; 38 so far)
Latest ones: `rental_reminders`, `company_own_mailgun`, `rental_fleet_and_bookings`, `format_phone_numbers`, `company_payment_link`, `estimate_deposit_paid`, `terms_rental_and_snapshot`, `map_lookups`.
**The server's last confirmed deploy was before `dd6aef7`** (payment link onward). Ask the user, or run `npx prisma migrate status` there, before assuming anything after that is live.

## Current direction (see ROADMAP.md)
Target small/mid operators on QuickBooks. Beat **iCans** on **AI + online ordering + price/setup speed**, then grow toward TrashLab.
Stage 1 foundation: online payments (Stripe per company), Twilio live, rental agreement e-sign, driver view (phone browser), reminders.
Stage 2: **online order page / widget** (drop-off, pickup, swap, junk; live availability; distance-based delivery fee; agreement; payment), customer self-service link, **AI order assistant** (text and web chat, review-first), size recommendation.
Stage 3: QuickBooks Online sync, AI dispatcher, AI inbox, review requests, client pricing, reports.

## Rental countdown and reminders: BUILT (not yet committed/deployed as of 2026-10-14)
- **Counter**: `lib/rental-clock.ts` (pure) + `components/rental-countdown.tsx` (ticks each minute). Shown on Dispatch rows, job page, the estimate Rentals card, and in the dumpsters-on-site map pin text.
- **Reminder engine**: `lib/rental-reminders.ts`, run by `POST /api/cron/rental-reminders` (Bearer `CRON_SECRET`). Rules: main reminder N hours before pickup (default 24), short one 2 h before for rentals of N hours or less, only inside sending hours (default 8am-8pm company tz), once per rental+kind+pickup time (`RentalReminder` unique key), skipped if not DELIVERED or an extension proposal is pending. Review mode by default (DRAFT on the Dispatch page); automatic mode per company.
- **AI**: wording via `askJson` in `lib/openrouter.ts` (falls back to a template if AI is off, capped, fails, or omits the pickup time). Replies: `lib/rental-replies.ts` is called from the Twilio and Mailgun inbound routes; "READY" or "keep it till Friday" becomes a `RentalProposal` (EXTEND or PICKUP) shown on Dispatch. Confirming (`app/(dashboard)/dispatch/ai-actions.ts`) checks the unit is free, moves `endAt` and the job end, and sends the customer a confirmation. Extra-day money needs no new line: invoice creation already bills days past the package.
- **Text**: no extra work; `lib/outbound.ts` texts when Twilio is configured and the customer can be texted, else emails.
- **Settings**: Rental reminders card (`settings/reminder-card.tsx`). Off by default.
- Migration `rental_reminders`. **To go live on the server**: deploy (with migrate), add `CRON_SECRET` to the server `.env`, then add to crontab: `*/15 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3010/api/cron/rental-reminders` (set the variable in the crontab line or inline the value), then turn the card on in Settings.
- Tested: pure clock logic, and a script run of the engine against the dev DB (quiet hours, one draft only, no duplicates, extension pauses reminders, READY proposal, switched-off). UI pages were NOT driven in a browser (needs login): check Dispatch, a job page, an estimate, Settings.
- Not done: nav badge for pending items, a send log view, per-customer timing patterns.

## SaaS plans (2026-10-15)
Three plans, all defined in `lib/plans.ts` (prices, features, AI allowance, seats):
- **Starter $25**: 1 user, email only, no AI/rentals/online booking/fuel surcharge/QuickBooks, "Powered by" line on documents until the **$100 one-time brand upgrade**. Signup gives **60 days of the full system free, no card**; after that a plan must be chosen (`/billing/expired`).
- **Base $99**: everything except deeper dashboards and AI review filter; texting up to 500/mo. **$5/mo** AI+map allowance.
- **Plus $159**: adds 1,000 texts/mo, dashboards, AI review filter. **$20/mo** allowance.
- **Text packs**: 500 extra texts for $15 one time (Base and Plus), carried over, used after the monthly allowance (`Company.smsCredits`, webhook adds them, `recordTextSent` spends them). Warning banner at 80% and when out; out of texts means messages go by email.
- Base and Plus include 1 office user, **$20/mo per extra user** (Stripe seat price, quantity synced by `syncSeats`). Drivers (role CREW) are unlimited and free.
- Gates live in `lib/plan-access.ts` (`featureBlock`, `companyHasFeature`, `canSendText`); nav greys locked items; `FeatureLocked` replaces locked pages. Not built yet, so only declared: QuickBooks, customer portal, driver app, full reporting, advanced dashboards, AI review filter.
- Pages: Settings > Plan and billing (`/settings/plan`), Settings > Team (`/settings/team`). Webhook sets `Company.plan` from the price id.
- **To go live**: run migrations `saas_plans` and `sms_packs`, create the Stripe prices (`node scripts/setup-stripe-plans.mjs` with a test key first), set the six `STRIPE_PRICE_*` env vars (adds `STRIPE_PRICE_SMS_PACK`), enable the Stripe customer portal, register `/api/stripe/webhook`. Existing companies are migrated to Plus with the brand upgrade.

## Customer rental page (2026-10-15)
No new link or login: the private estimate link (`/e/<token>`) shows a "Your rental" card once the estimate is approved and a rental exists (Base/Plus/trial). The customer can request **pickup**, **more time (1-14 days)** or a **swap** (new `SWAP` proposal kind, `RentalBooking.swapRequested`). Requests never change a rental by themselves: they become pending proposals (`fromCustomer`) in the Dispatch approval box, the office is emailed, and confirming sends the customer a confirmation. Rental reminders and the estimate email now carry the link. Migration `rental_customer_requests`. Tested in the browser with seeded data (swap and extension requests created); the office confirm step (Dispatch, needs login) was not driven.

**Swap pricing** (Settings > Swap-outs, `Company.swapPolicy`): Off (default, the button is hidden), Free, Flat fee, or Full package rate. The fee is fixed on the booking when the office confirms the swap (`RentalBooking.swapFeeCents`) and becomes a "swap-out" line on the invoice with the extra-day and overweight lines. The replacement dumpster is still scheduled by hand; the owner must not also add a package for it. Migration `swap_policy`.

**Waiving charges**: on Dispatch, "Confirm, no charge" confirms a swap with the fee at $0. On a picked-up dumpster each automatic charge (swap, extra days, overweight) has "Don't charge this" / "Charge it again" (`RentalBooking.waivedCharges`, `setChargeWaived`); it only affects invoices not yet created, so on an existing invoice remove the line there. Migration `waived_charges`. Typechecked and the charge maths checked on sample numbers; the Dispatch buttons were not driven in a browser (needs login).

## Customer request messages (2026-10-17)
Settings > Customer requests (`/settings/customer-requests`) edits three templates, each with its own email and text switch: **Request received** (sent to the customer when they ask on their rental page), **Request approved** (when the office confirms on Dispatch) and **Request declined** (new Decline button, asks for a reason). Variables like `{{customer_name}}` are listed on the page. Defaults live in `lib/message-templates.ts`; saved wording is in `MessageTemplate`. Email goes out as branded HTML (logo, headline, details card, button, footer; same builder renders the Settings preview), texts follow the plan's text cap. Logo is served publicly from `/api/logo/<companyId>` because mail clients block data URLs. Defaults: email on, text off. Online-booking confirmations and the estimate/invoice emails still use their own fixed wording. Migration `message_templates`. Typechecked and the email layout checked in a browser from a rendered file; the Settings page, test-email button and Dispatch Decline button were not driven (need a login), and no real email was sent.

## Contacts under a customer (2026-10-18)
`CustomerContact`: other people at a customer (name, role, email, phone, notes), managed in the "People at this customer" card on the customer page. An estimate or invoice can be assigned a contact (picker under the header card, shown only when the customer has contacts; `Estimate.contactId` / `Invoice.contactId`). The estimate email and text and the invoice email go to that contact's email or phone, falling back to the main customer for whatever the contact lacks, and greet them by first name. Replies from a contact's number or email thread into the customer's conversation (and count as a verified sender). A STOP from a contact opts out the whole customer. Not covered: rental request messages and the Inbox composer still go to the main customer; the public estimate page and PDF don't show "Attn". Migration `customer_contacts`. Typechecked only; not driven in a browser (needs login).

## Beta hardening (2026-10-19)
- **Password reset** (`/forgot-password`, `/reset-password/<token>`): hashed one-time tokens in `VerificationToken`, 1 hour, rate limited, same answer for any email. **Email verification** on signup (`/verify-email/<token>`, banner with resend): until one person in a company confirms, the shared email sender and texting are blocked (`EmailNotVerifiedError`, `companyVerified`). Existing accounts were marked verified by migration `verify_existing_users`; people added on the Team page count as verified. Signup has a honeypot, IP rate limits and on-page errors.
- **First-run**: setup checklist on the dashboard home, and customers CSV import (`/customers/import`). Not done: sample data, a guided tour.
- **Data audit**: every query and server action was reviewed for missing company scoping. Two gaps fixed (invoice tax rate and service-plan property could point at another company's record). Everything unauthenticated is token-gated by design. Driver logins (`CREW`) are now kept out of the office app: `requireSession` sends them to `/driver`. **Known, not fixed**: Texts from a number shared by customers of two companies are matched by the most recent outbound text (one shared Twilio number).
- **Cron**: `bash ops/deploy/install-cron.sh` on the server installs rental reminders (every 15 min) and monthly usage billing (1st, 06:10 UTC) reading `CRON_SECRET` from `.env`. Usage billing logs an error until Stripe is set up.

## Drivers (2026-10-20)
`Driver` model (name, phone, email, truck, map colour, notes, active, optional `userId` login) and a **Drivers** page under Scheduling & Dispatch (`/drivers`, Base/Plus/trial, admin or dispatcher). A driver can exist without a login (office dispatches for them); "Give a login" creates a CREW user. Drivers never count as seats. A CREW login lands on `/driver`, currently a placeholder ("nothing assigned yet"), and is bounced there from every office page and action. **Not built (next)**: assigning deliveries and pickups to drivers on Dispatch (the reference is an iCans-style map with an Unassigned tasks list and a Drivers list), the driver's stop list, mark delivered/picked up from the phone, price-group zones. Migration `drivers`. Tested in a browser with a throwaway company: add driver, give login, sign in as the driver, every office URL redirects to `/driver`.

## Other open decisions
- Whether the platform takes a Stripe fee, hosted website vs widget only (see ROADMAP.md).
- Whether voice should be added to the New invoice page and invoice editor (offered, not requested yet).

## Where things live (ops/)
`app/(dashboard)/` pages and server actions per area (estimates, invoices, fleet, dispatch, map, inbox, settings, price-book, jobs...).
`app/api/` webhooks and APIs (mailgun inbound, twilio inbound, stripe, cron, voice-intake, voice-items, attachments, usage).
`app/e/[token]`, `app/i/[token]`: customer-facing estimate (sign) and invoice pages. `app/book/[companyId]`: booking widget.
`lib/` shared logic: `openrouter.ts` (AI), `usage.ts` (metering), `mail-config.ts` and `mailgun.ts` (email), `office.ts`/`geocode.ts`/`map-pins.ts` (maps), `rentals.ts`/`rental-charges.ts`/`rental-stops.ts` (dumpsters), `terms.ts`/`terms-format.ts`, `payment-link.ts`, `phone.ts`, `email-limits.ts`, `invoice-totals.ts`, `invoice-status.ts`, `estimate-invoice.ts`, `pdf/`.
`components/` shared UI (conversation panel, composer, command center, route map, pins map, rentals card, rental row, deposit paid, voice components).
`prisma/schema.prisma` and `prisma/migrations/`.
