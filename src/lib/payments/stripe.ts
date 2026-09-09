import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

// Constructed lazily-safe: only throws when actually used without a key
// configured, not at import time (so the app can still boot without Stripe
// configured if only Paystack is in use).
export const stripe = new Stripe(secretKey ?? "sk_test_placeholder", {
  apiVersion: "2024-06-20"
});

export function assertStripeConfigured() {
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
}
