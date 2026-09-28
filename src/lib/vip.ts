/**
 * VIP membership: a paid, time-bound pass to early access on drops.
 *
 * WHY PAID-THROUGH AND NOT AUTO-RENEWING
 *
 * Automatic renewal means charging a saved payment method every period. Cards
 * can be charged that way; mobile money cannot — every MoMo debit needs the
 * customer to approve it on their phone. In Ghana that is most customers, so an
 * auto-renewing subscription would be card-only and would quietly exclude them.
 *
 * Instead a member buys a period, their membership runs until a date, and
 * buying again extends it. It works with every Paystack channel, nothing is
 * ever charged without the customer present, there is no failed-renewal state
 * to handle, and nothing to cancel — it simply lapses. Automatic card renewal
 * can be layered on later: a renewal is just another paid period through the
 * same `applyPaidPeriod`.
 */

export const VIP_PLANS = {
  MONTH: { days: 30, label: "1 month", settingKey: "vipPriceMonth" },
  YEAR: { days: 365, label: "1 year", settingKey: "vipPriceYear" }
} as const;

export type VipPlan = keyof typeof VIP_PLANS;

export function isVipPlan(value: unknown): value is VipPlan {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(VIP_PLANS, value);
}

const DAY_MS = 86_400_000;

/** Whether a membership paid through `vipUntil` is active at `now`. */
export function isVipActive(vipUntil: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!vipUntil) return false;
  const until = new Date(vipUntil).getTime();
  return !Number.isNaN(until) && until > now.getTime();
}

/**
 * The membership after one more paid period.
 *
 * Extends from whichever is LATER — now, or the current end. Renewing a week
 * early adds a full period on top of the week still owed; renewing after a
 * lapse starts from today rather than back-dating into time that has passed.
 * Either way the member gets exactly what they paid for.
 *
 * `since` is kept while the membership is unbroken, and restarts when a lapsed
 * member returns.
 */
export function applyPaidPeriod(
  current: { vipUntil: Date | null; vipSince: Date | null },
  periodDays: number,
  now: Date = new Date()
): { vipUntil: Date; vipSince: Date; periodStart: Date } {
  const active = isVipActive(current.vipUntil, now);
  const periodStart = active && current.vipUntil ? current.vipUntil : now;
  return {
    periodStart,
    vipUntil: new Date(periodStart.getTime() + periodDays * DAY_MS),
    vipSince: active && current.vipSince ? current.vipSince : now
  };
}

/**
 * A plan's price in minor units, from the settings an admin saved — or null
 * when it has not been set, in which case the plan is not for sale. The shop
 * never falls back to a price nobody chose.
 */
export function planPrice(settings: Partial<Record<string, string>>, plan: VipPlan): number | null {
  const raw = settings[VIP_PLANS[plan].settingKey];
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value > 0 ? value : null;
}

/**
 * The membership after a paid period is refunded.
 *
 * Removes that purchase's length of time from what the member has left — never
 * more than they have left, so a refund can end a membership but not push it
 * into the past by more than "now".
 *
 * Why subtract from the end rather than cut out the purchase's recorded window:
 * periods are chained end to end, so the dates stored on a purchase stop being
 * where its time actually sits as soon as any earlier purchase is refunded.
 * "This purchase's length, off the end" is right regardless of order, and it is
 * a rule an admin can explain to a customer in one sentence: a refunded month
 * is a month less.
 *
 * Days already used out of a refunded period come off the later time. The
 * customer has the money for those days back, so that is the fair side for
 * them to land on.
 */
export function removePaidPeriod(
  current: { vipUntil: Date | null; vipSince: Date | null },
  periodDays: number,
  now: Date = new Date()
): { vipUntil: Date | null; vipSince: Date | null } {
  if (!isVipActive(current.vipUntil, now) || !current.vipUntil) {
    // Nothing left to take back. Leave the record as it is.
    return { vipUntil: current.vipUntil, vipSince: current.vipSince };
  }

  const remaining = current.vipUntil.getTime() - now.getTime();
  const removed = Math.min(Math.max(periodDays, 0) * DAY_MS, remaining);
  const vipUntil = new Date(current.vipUntil.getTime() - removed);

  // If that ends the membership, it is no longer "continuous since" anything.
  return isVipActive(vipUntil, now)
    ? { vipUntil, vipSince: current.vipSince }
    : { vipUntil: now, vipSince: null };
}

/** Plans an admin can grant for free, in days. Not for sale; recorded as COMP. */
export const COMP_DAYS = [7, 30, 90, 365] as const;
