/**
 * Everything on the storefront that is a fact about your business rather than a
 * piece of design.
 *
 * It lives in one file on purpose. These values appear in the footer, the
 * customer-service pages, the product page's delivery note and the checkout
 * copy, and the alternative — a delivery time written into four different JSX
 * files — is how a storefront ends up promising two different things on two
 * different pages.
 *
 * ---------------------------------------------------------------------------
 * EVERY VALUE BELOW IS A PLACEHOLDER AND NEEDS YOUR REAL ONE.
 *
 * Several are commitments to a customer: a returns window, a delivery estimate
 * and a contact address are the terms you are agreeing to when someone buys.
 * They are deliberately not invented for you further down in the markup, where
 * you would have had to find them. Change them here and they change everywhere.
 * ---------------------------------------------------------------------------
 */

export const SITE = {
  name: "Vinx",
  /** One line, used in the footer and as the fallback meta description. */
  tagline: "Considered essentials, made for the in-between.",

  /** Where you are. Shown in the footer and the mobile menu. */
  city: "Accra",
  country: "Ghana",
  currency: "GHS",

  /** Reachable by a customer. Both are printed on the contact page. */
  email: "hello@vinx.example",
  phone: "+233 00 000 0000",
  /** Shown as "we reply within…" so nobody waits wondering. */
  replyWindow: "one working day",

  /**
   * Social. An empty string hides the link entirely rather than rendering a
   * dead icon — a fashion storefront linking to a 404 Instagram is worse than
   * one that links to none.
   */
  social: {
    instagram: "",
    tiktok: "",
    x: ""
  },

  /** Delivery. Free-text so you can phrase these however you actually work. */
  delivery: {
    /** Threshold in minor units (pesewas), to match how money is stored. */
    freeOverMinorUnits: 40000,
    accra: "1–2 working days",
    ghana: "2–4 working days",
    international: "7–14 working days"
  },

  /** Returns. The window is a commitment — set it to yours before launch. */
  returns: {
    windowDays: 14,
    /** Anything you will not take back. Shown as a list on the returns page. */
    exclusions: ["Pieces worn, washed or altered", "Items with tags removed"]
  },

  /** Payment methods actually enabled on your account, in display order. */
  payments: ["Mobile money", "Visa", "Mastercard", "PayPal"]
} as const;

/**
 * The free-delivery threshold as a display string.
 *
 * Derived rather than stored twice, so the number in the ticker can never drift
 * from the one the delivery page quotes. Minor units are divided here for the
 * same reason they are everywhere else in the app — money is stored as an
 * integer and only ever formatted at the edge.
 */
export function freeDeliveryLabel(): string {
  const major = SITE.delivery.freeOverMinorUnits / 100;
  return `${SITE.currency} ${major.toLocaleString("en-GH")}`;
}
