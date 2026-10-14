import type { Plan } from "@prisma/client";

// The one place that says what each SaaS plan costs and includes. Everything else (nav, page gates, usage
// limits, seat limits, billing) reads from here, so changing a plan means editing this file only.

// Shown on customer-facing documents ("Powered by ...") until the company buys the brand upgrade.
export const PLATFORM_BRAND = "Haulin Ops";

export const TRIAL_DAYS = 60;
// Seats allowed while on the free trial (it has no subscription to bill extra users on).
export const TRIAL_MAX_OFFICE_USERS = 3;

export const BRAND_UPGRADE_CENTS = 10_000; // one-time, Starter only
export const EXTRA_USER_CENTS = 2_000; // per month, per office user beyond the first, Base and Plus
export const SMS_PACK_TEXTS = 500;
export const SMS_PACK_CENTS = 1_500; // one-time, Base and Plus
export const SMS_WARN_AT = 0.8;
export const BASE_SMS_PER_MONTH = 500;
export const PLUS_SMS_PER_MONTH = 1_000;

export type Feature =
  | "AI" // voice and typed intake, voice items, AI reading customer replies
  | "TEXTING" // sending text messages
  | "RENTALS" // fleet, dispatch board, rental packages and countdown
  | "AI_REMINDERS" // AI-written rental reminders
  | "FUEL_SURCHARGE"
  | "ONLINE_BOOKING" // public order page and website widget
  | "FULL_REPORTING" // reporting beyond the last 30 days
  | "ADVANCED_DASHBOARDS" // utilization, P&L, landfill (when built)
  | "AI_REVIEW_FILTER" // (when built)
  | "QUICKBOOKS"; // (when built)

export const FEATURE_LABELS: Record<Feature, string> = {
  AI: "AI voice and typed intake",
  TEXTING: "Text messaging",
  RENTALS: "Dumpster rentals, fleet and dispatch",
  AI_REMINDERS: "AI rental reminders",
  FUEL_SURCHARGE: "Fuel surcharge by distance",
  ONLINE_BOOKING: "Online booking page and widget",
  FULL_REPORTING: "Full reporting history",
  ADVANCED_DASHBOARDS: "Deeper analytic dashboards",
  AI_REVIEW_FILTER: "AI review filter",
  QUICKBOOKS: "QuickBooks Online sync",
};

// Which plan unlocks a feature first, for the "Upgrade to ..." message.
export const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  AI: "BASE",
  TEXTING: "BASE",
  RENTALS: "BASE",
  AI_REMINDERS: "BASE",
  FUEL_SURCHARGE: "BASE",
  ONLINE_BOOKING: "BASE",
  FULL_REPORTING: "BASE",
  ADVANCED_DASHBOARDS: "PLUS",
  AI_REVIEW_FILTER: "PLUS",
  QUICKBOOKS: "BASE",
};

const BASE_FEATURES: Feature[] = ["AI", "TEXTING", "RENTALS", "AI_REMINDERS", "FUEL_SURCHARGE", "ONLINE_BOOKING", "FULL_REPORTING", "QUICKBOOKS"];
const ALL_FEATURES = Object.keys(FEATURE_LABELS) as Feature[];

export interface PlanDef {
  plan: Plan;
  name: string;
  priceCents: number;
  tagline: string;
  features: Set<Feature>;
  /** Third-party cost (AI, maps) included each month, in millionths of a dollar. */
  /** Outbound texts per month; 0 = none. */
  smsPerMonth: number;
  includedMicros: number;
  /** Most we bill in overage per month before paid features pause; 0 = no overage billing, pause at the allowance. */
  overageCapCents: number;
  /** Office users (not drivers). null = no limit; extra users are billed on top. */
  includedOfficeUsers: number;
  extraUsersAllowed: boolean;
  highlights: string[];
}

export const PLANS: Record<Plan, PlanDef> = {
  STARTER: {
    plan: "STARTER",
    name: "Starter",
    priceCents: 2_500,
    tagline: "One person running the basics.",
    features: new Set<Feature>(),
    smsPerMonth: 0,
    includedMicros: 2_000_000,
    overageCapCents: 0,
    includedOfficeUsers: 1,
    extraUsersAllowed: false,
    highlights: [
      "1 user",
      "Estimates, invoices, customers, price book",
      "Email only, no texting",
      "Reporting on the last 30 days",
      "No AI, rentals or online booking",
      "“Powered by” line on documents. $100 one-time brand upgrade adds your logo and removes it",
    ],
  },
  BASE: {
    plan: "BASE",
    name: "Base",
    priceCents: 9_900,
    tagline: "The full system for a growing dumpster and junk company.",
    features: new Set<Feature>(BASE_FEATURES),
    smsPerMonth: BASE_SMS_PER_MONTH,
    includedMicros: 5_000_000,
    overageCapCents: 5_000,
    includedOfficeUsers: 1,
    extraUsersAllowed: true,
    highlights: [
      "1 user included, $20/mo per extra user",
      "Unlimited drivers and orders",
      "AI voice and typed intake, AI rental reminders",
      `Text messaging (up to ${BASE_SMS_PER_MONTH}/mo)`,
      "Rentals, fleet, dispatch, fuel surcharge",
      "Online booking page and widget",
      "QuickBooks sync, your logo, no “Powered by”",
      "$5/mo of AI and map usage included",
    ],
  },
  PLUS: {
    plan: "PLUS",
    name: "Plus",
    priceCents: 15_900,
    tagline: "Everything in Base, plus more texts, deeper analytics and reviews.",
    features: new Set<Feature>(ALL_FEATURES),
    smsPerMonth: PLUS_SMS_PER_MONTH,
    includedMicros: 20_000_000,
    overageCapCents: 5_000,
    includedOfficeUsers: 1,
    extraUsersAllowed: true,
    highlights: [
      "Everything in Base",
      `Up to ${PLUS_SMS_PER_MONTH.toLocaleString()} texts a month`,
      "Deeper analytic dashboards",
      "AI review filter",
      "$20/mo of AI and map usage included",
    ],
  },
};

export const PLAN_ORDER: Plan[] = ["STARTER", "BASE", "PLUS"];

export type CompanyPlanFields = {
  plan: Plan;
  subscriptionStatus: string;
  stripeSubscriptionId: string | null;
  trialEndsAt: Date | null;
  brandUpgrade: boolean;
};

export interface PlanAccess {
  /** The plan being billed. During the free trial this is still STARTER. */
  plan: Plan;
  /** True on the 60-day signup trial: no subscription yet, full system. */
  onTrial: boolean;
  /** Trial ran out and no subscription was started. */
  expired: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number;
  features: Set<Feature>;
  smsPerMonth: number;
  includedMicros: number;
  overageCapCents: number;
  /** Max office users, or null when extra users are billed instead of blocked. */
  maxOfficeUsers: number | null;
  /** Own logo on documents and no "Powered by" line. */
  branded: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function accessFor(company: CompanyPlanFields, now = new Date()): PlanAccess {
  const def = PLANS[company.plan];
  const noSubscription = !company.stripeSubscriptionId && company.subscriptionStatus === "TRIALING";
  const trialEndsAt = company.trialEndsAt;
  const trialLive = noSubscription && trialEndsAt !== null && trialEndsAt.getTime() > now.getTime();
  const expired = noSubscription && !trialLive;
  const trialDaysLeft = trialLive ? Math.max(1, Math.ceil((trialEndsAt!.getTime() - now.getTime()) / DAY_MS)) : 0;

  if (trialLive) {
    // Full system for 60 days, with the Base usage allowance and no overage billing.
    return {
      plan: company.plan,
      onTrial: true,
      expired: false,
      trialEndsAt,
      trialDaysLeft,
      features: new Set<Feature>(ALL_FEATURES),
      smsPerMonth: PLUS_SMS_PER_MONTH,
      includedMicros: PLANS.BASE.includedMicros,
      overageCapCents: 0,
      maxOfficeUsers: TRIAL_MAX_OFFICE_USERS,
      branded: true,
    };
  }

  return {
    plan: company.plan,
    onTrial: false,
    expired,
    trialEndsAt,
    trialDaysLeft: 0,
    features: def.features,
    smsPerMonth: def.smsPerMonth,
    includedMicros: def.includedMicros,
    overageCapCents: def.overageCapCents,
    maxOfficeUsers: def.extraUsersAllowed ? null : def.includedOfficeUsers,
    branded: company.plan !== "STARTER" || company.brandUpgrade,
  };
}

/** Own logo on documents and no Powered by line. Takes anything with the plan fields (a full Company row works). */
export function isBranded(company: CompanyPlanFields): boolean {
  return accessFor(company).branded;
}

export function hasFeature(access: PlanAccess, feature: Feature): boolean {
  return access.features.has(feature);
}

export function upgradeMessage(feature: Feature): string {
  return `${FEATURE_LABELS[feature]} is part of the ${PLANS[FEATURE_MIN_PLAN[feature]].name} plan.`;
}

export const COMPANY_PLAN_SELECT = {
  plan: true,
  subscriptionStatus: true,
  stripeSubscriptionId: true,
  trialEndsAt: true,
  brandUpgrade: true,
} as const;

// ── Stripe price ids (set in the environment; see .env.example) ──────────────

export function stripePriceId(plan: Plan): string | undefined {
  return { STARTER: process.env.STRIPE_PRICE_STARTER, BASE: process.env.STRIPE_PRICE_BASE, PLUS: process.env.STRIPE_PRICE_PLUS }[plan];
}

export function planFromStripePriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  return PLAN_ORDER.find((p) => stripePriceId(p) === priceId) ?? null;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}
