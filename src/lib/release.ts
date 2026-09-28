/**
 * Timed drops and VIP early access.
 *
 * A product has two optional moments:
 *
 *   earlyAccessAt ──────────── releaseAt ──────────────▶
 *        │     VIP can buy      │    everyone can buy
 *
 * and is, at any instant, in exactly one state:
 *
 *   open      — no releaseAt, or releaseAt has passed. Anyone sees and buys it.
 *               Every product that existed before drops did is here, so the
 *               catalog is unchanged until an admin sets a date.
 *   early     — inside the VIP window. VIPs see and buy it; everyone else sees
 *               it with "join VIP" in place of "add to bag". Showing it to
 *               non-members is deliberate: a window nobody can see is not an
 *               incentive to join.
 *   upcoming  — before any window has opened. Hidden from everyone except
 *               admins, who need to preview it.
 *
 * These functions are the only definition of the rules. The catalog query, the
 * product page and — the one that actually matters — the checkout route all
 * call them, so the button a shopper sees and the order the server will accept
 * cannot disagree.
 */

export type ReleaseState = "open" | "early" | "upcoming";

export type ReleaseDates = {
  releaseAt?: Date | string | null;
  earlyAccessAt?: Date | string | null;
};

function toTime(value: Date | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function releaseState(product: ReleaseDates, now: Date = new Date()): ReleaseState {
  const release = toTime(product.releaseAt);
  const early = toTime(product.earlyAccessAt);
  const t = now.getTime();

  if (release === null || t >= release) return "open";
  if (early !== null && t >= early) return "early";
  return "upcoming";
}

export type Viewer = { isVip: boolean; isAdmin: boolean };

/** Whether this viewer may see the product at all (list it, open its page). */
export function canView(state: ReleaseState, viewer: Viewer): boolean {
  if (state === "upcoming") return viewer.isAdmin;
  return true;
}

/**
 * Whether this viewer may BUY it. Enforced at checkout.
 *
 * Admins get no exemption here. Previewing an unreleased product is part of
 * running the shop; buying one ahead of customers is not, and an admin who
 * wants early access can join VIP like anyone else.
 */
export function canBuy(state: ReleaseState, viewer: Pick<Viewer, "isVip">): boolean {
  if (state === "open") return true;
  if (state === "early") return viewer.isVip;
  return false;
}

/**
 * The Prisma filter for products that are not `upcoming` at `now` — the ones a
 * non-admin catalog may list. Mirrors `releaseState` exactly; the tests check
 * the two agree.
 */
export function visibleReleaseWhere(now: Date = new Date()) {
  return {
    OR: [{ releaseAt: null }, { releaseAt: { lte: now } }, { earlyAccessAt: { lte: now } }]
  };
}

/** "12 Oct" — how a drop date is shown to a shopper. */
export function formatDropDate(value: Date | string | null | undefined): string {
  const time = toTime(value);
  if (time === null) return "";
  return new Date(time).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
