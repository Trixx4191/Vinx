import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyPaidPeriod, isVipActive, isVipPlan, planPrice, removePaidPeriod, VIP_PLANS } from "@/lib/vip";

const at = (iso: string) => new Date(iso);
const DAY = 86_400_000;

describe("isVipActive", () => {
  it("is active until the paid-through moment, then lapses on its own", () => {
    const until = "2026-10-28T12:00:00Z";
    assert.equal(isVipActive(until, at("2026-10-28T11:59:59Z")), true);
    assert.equal(isVipActive(until, at("2026-10-28T12:00:00Z")), false);
  });

  it("is inactive with no membership, or an unreadable date", () => {
    assert.equal(isVipActive(null), false);
    assert.equal(isVipActive(undefined), false);
    assert.equal(isVipActive("not a date"), false);
  });
});

describe("applyPaidPeriod", () => {
  const now = at("2026-10-01T00:00:00Z");

  it("starts a first membership from now", () => {
    const next = applyPaidPeriod({ vipUntil: null, vipSince: null }, 30, now);
    assert.equal(next.vipUntil.getTime(), now.getTime() + 30 * DAY);
    assert.equal(next.vipSince.getTime(), now.getTime());
  });

  /**
   * Renewing early must not cost the member the days they still had. The new
   * period stacks on the current end, not on today.
   */
  it("stacks an early renewal on the current end, losing no days", () => {
    const current = { vipUntil: at("2026-10-08T00:00:00Z"), vipSince: at("2026-09-08T00:00:00Z") };
    const next = applyPaidPeriod(current, 30, now);
    assert.equal(next.vipUntil.getTime(), at("2026-10-08T00:00:00Z").getTime() + 30 * DAY);
    // Unbroken membership keeps its start.
    assert.equal(next.vipSince.getTime(), at("2026-09-08T00:00:00Z").getTime());
  });

  /**
   * Renewing after a lapse starts from today. Stacking on the old, passed end
   * date would hand back days that already elapsed unpaid-for.
   */
  it("restarts from now after a lapse, and restarts 'member since'", () => {
    const lapsed = { vipUntil: at("2026-09-01T00:00:00Z"), vipSince: at("2026-08-01T00:00:00Z") };
    const next = applyPaidPeriod(lapsed, 365, now);
    assert.equal(next.vipUntil.getTime(), now.getTime() + 365 * DAY);
    assert.equal(next.vipSince.getTime(), now.getTime());
  });
});

describe("planPrice", () => {
  // A plan with no price set is not for sale. The shop must never fall back
  // to a price nobody chose.
  it("returns null when the admin has not set a price", () => {
    assert.equal(planPrice({}, "MONTH"), null);
    assert.equal(planPrice({ vipPriceMonth: "" }, "MONTH"), null);
    assert.equal(planPrice({ vipPriceMonth: "0" }, "MONTH"), null);
  });

  it("reads minor units, and refuses anything that is not a whole number", () => {
    assert.equal(planPrice({ vipPriceMonth: "5000" }, "MONTH"), 5000);
    for (const junk of ["50.00", "-5000", "5e3", "abc"]) {
      assert.equal(planPrice({ vipPriceMonth: junk }, "MONTH"), null, junk);
    }
  });

  it("reads each plan from its own setting", () => {
    assert.equal(planPrice({ vipPriceMonth: "5000", vipPriceYear: "50000" }, "YEAR"), 50000);
  });
});

describe("isVipPlan", () => {
  // The plan name arrives from the client. Only the known keys are plans —
  // not inherited object properties that a naive `in` check would accept.
  it("accepts only the defined plans", () => {
    for (const plan of Object.keys(VIP_PLANS)) assert.equal(isVipPlan(plan), true);
    for (const junk of ["WEEK", "month", "toString", "__proto__", "", null, 30]) {
      assert.equal(isVipPlan(junk), false, String(junk));
    }
  });
});

describe("removePaidPeriod — refunds", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const DAY = 86_400_000;
  const days = (n: number) => new Date(now.getTime() + n * DAY);

  it("takes a refunded month off the end", () => {
    const next = removePaidPeriod({ vipUntil: days(50), vipSince: days(-10) }, 30, now);
    assert.equal(next.vipUntil?.getTime(), days(20).getTime());
    // Still a member, so still continuous since the same date.
    assert.equal(next.vipSince?.getTime(), days(-10).getTime());
  });

  /**
   * A refund can end a membership, but never reach further back than now. A
   * membership pushed into the past would show "expired 3 weeks ago" for a
   * customer who was a member this morning.
   */
  it("ends the membership now when the refund exceeds what is left", () => {
    const next = removePaidPeriod({ vipUntil: days(10), vipSince: days(-20) }, 30, now);
    assert.equal(next.vipUntil?.getTime(), now.getTime());
    assert.equal(next.vipSince, null);
    assert.equal(isVipActive(next.vipUntil, now), false);
  });

  it("leaves a lapsed membership alone", () => {
    const lapsed = { vipUntil: days(-5), vipSince: null };
    assert.deepEqual(removePaidPeriod(lapsed, 30, now), lapsed);
  });

  it("gives the same answer whichever of two stacked months is refunded", () => {
    // Two months bought back to back; refunding either leaves one month.
    const stacked = { vipUntil: days(60), vipSince: now };
    assert.equal(removePaidPeriod(stacked, 30, now).vipUntil?.getTime(), days(30).getTime());
  });

  it("refunding every period paid ends the membership", () => {
    let state: { vipUntil: Date | null; vipSince: Date | null } = { vipUntil: null, vipSince: null };
    state = applyPaidPeriod(state, 30, now);
    state = applyPaidPeriod(state, 365, now);
    state = removePaidPeriod(state, 30, now);
    state = removePaidPeriod(state, 365, now);
    assert.equal(isVipActive(state.vipUntil, now), false);
  });
});
