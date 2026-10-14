// One-time: creates the Stripe products and prices for the SaaS plans and prints the env lines to paste.
//   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-plans.mjs
// Run with a TEST key first. Keep the amounts in step with lib/plans.ts.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}
const stripe = new Stripe(key);

async function make(name, cents, recurring) {
  const product = await stripe.products.create({ name });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: cents,
    ...(recurring ? { recurring: { interval: "month" } } : {}),
  });
  return price.id;
}

const lines = {
  STRIPE_PRICE_STARTER: await make("Haulin Ops Starter", 2500, true),
  STRIPE_PRICE_BASE: await make("Haulin Ops Base", 9900, true),
  STRIPE_PRICE_PLUS: await make("Haulin Ops Plus", 15900, true),
  STRIPE_PRICE_SEAT: await make("Haulin Ops extra user", 2000, true),
  STRIPE_PRICE_BRAND: await make("Haulin Ops brand upgrade", 10000, false),
  STRIPE_PRICE_SMS_PACK: await make("Haulin Ops 500 text pack", 1500, false),
};
for (const [k, v] of Object.entries(lines)) console.log(`${k}="${v}"`);
