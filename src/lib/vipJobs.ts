/**
 * Decisions for the scheduled VIP jobs, kept free of the database so they can
 * be tested directly. The route in `api/cron/vip` does the reading, claiming
 * and sending; everything that decides *whether* is here.
 */

import { isVipActive } from "@/lib/vip";
import { releaseState } from "@/lib/release";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long before the end a member is told their VIP is running out. */
export const REMINDER_DAYS = 3;

/**
 * Whether a member is due a "your VIP ends soon" email.
 *
 * `reminderFor` is the end date the last reminder was about. Comparing against
 * it (rather than a "reminded" flag) means buying more time — which moves
 * vipUntil — re-arms the reminder for the new end without anyone resetting it.
 */
export function needsReminder(
  vipUntil: Date | null,
  reminderFor: Date | null,
  now: Date = new Date(),
  windowDays: number = REMINDER_DAYS
): boolean {
  if (!vipUntil || !isVipActive(vipUntil, now)) return false;
  if (vipUntil.getTime() - now.getTime() > windowDays * DAY_MS) return false;
  return !reminderFor || reminderFor.getTime() !== vipUntil.getTime();
}

export type AnnounceableProduct = {
  earlyAccessAt: Date | null;
  releaseAt: Date | null;
  isPublished: boolean;
};

/**
 * The products in `candidates` that a member whose cursor is `noticedTo`
 * should hear about now: published, inside their VIP window at this moment,
 * and whose window opened after the last one they were told about.
 *
 * A window that has already closed (the drop is open to everyone) is not news
 * any more, so it is skipped even if the member never heard about it.
 */
export function productsToAnnounce<T extends AnnounceableProduct>(
  candidates: T[],
  noticedTo: Date | null,
  now: Date = new Date()
): T[] {
  return candidates.filter(
    (product) =>
      product.isPublished &&
      product.earlyAccessAt !== null &&
      releaseState(product, now) === "early" &&
      (noticedTo === null || product.earlyAccessAt.getTime() > noticedTo.getTime())
  );
}

/**
 * Where the member's cursor moves to after being told about `announced` — the
 * latest window among them. Never moves backwards.
 */
export function advanceCursor(noticedTo: Date | null, announced: AnnounceableProduct[]): Date | null {
  let latest = noticedTo?.getTime() ?? null;
  for (const product of announced) {
    const t = product.earlyAccessAt?.getTime();
    if (t !== undefined && (latest === null || t > latest)) latest = t;
  }
  return latest === null ? null : new Date(latest);
}

/**
 * Sum of a transaction's refunds that have actually been paid out, in the
 * transaction's own currency. Pending or failed refunds do not count — the
 * customer does not have that money yet.
 */
export function processedRefundTotal(
  refunds: Array<{ amount: number; currency: string; status: string }>,
  currency: string
): number {
  return refunds
    .filter((refund) => refund.status === "processed" && refund.currency === currency)
    .reduce((sum, refund) => sum + refund.amount, 0);
}

/**
 * Whether the refunds add up to the whole payment. A partial refund (a
 * goodwill discount, say) leaves the order or membership standing; only a
 * full refund reverses it.
 */
export function isFullRefund(refunded: number, paid: number): boolean {
  return paid > 0 && refunded >= paid;
}
