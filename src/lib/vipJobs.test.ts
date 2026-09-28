import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { advanceCursor, isFullRefund, needsReminder, processedRefundTotal, productsToAnnounce } from "@/lib/vipJobs";

const now = new Date("2026-10-01T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

describe("needsReminder", () => {
  it("fires inside the window, once per end date", () => {
    const until = days(2);
    assert.equal(needsReminder(until, null, now), true);
    assert.equal(needsReminder(until, new Date(until), now), false);
  });

  it("re-arms when the member buys more time", () => {
    const oldEnd = days(2);
    const newEnd = days(32);
    assert.equal(needsReminder(newEnd, oldEnd, now), false, "new end is outside the window");
    assert.equal(needsReminder(newEnd, oldEnd, days(30)), true, "and is reminded when it comes near");
  });

  it("does not fire too early, after the end, or for non-members", () => {
    assert.equal(needsReminder(days(3.5), null, now), false);
    assert.equal(needsReminder(days(3), null, now), true, "the window edge is included");
    assert.equal(needsReminder(days(-1), null, now), false);
    assert.equal(needsReminder(now, null, now), false, "ends exactly now: already over");
    assert.equal(needsReminder(null, null, now), false);
  });
});

describe("productsToAnnounce", () => {
  const product = (early: number | null, release: number | null, isPublished = true) => ({
    earlyAccessAt: early === null ? null : days(early),
    releaseAt: release === null ? null : days(release),
    isPublished
  });

  it("announces open windows newer than the cursor", () => {
    const a = product(-1, 2);
    const b = product(-0.1, 1);
    assert.deepEqual(productsToAnnounce([a, b], null, now), [a, b]);
    assert.deepEqual(productsToAnnounce([a, b], days(-0.5), now), [b]);
    assert.deepEqual(productsToAnnounce([a, b], days(-0.1), now), [], "cursor equal to a window: already told");
  });

  it("skips unpublished, not-yet-open and already-released products", () => {
    assert.deepEqual(productsToAnnounce([product(-1, 2, false)], null, now), []);
    assert.deepEqual(productsToAnnounce([product(1, 2)], null, now), []);
    assert.deepEqual(productsToAnnounce([product(-3, -1)], null, now), []);
    assert.deepEqual(productsToAnnounce([product(null, 2)], null, now), []);
  });
});

describe("advanceCursor", () => {
  it("moves to the latest window and never backwards", () => {
    const products = [{ earlyAccessAt: days(-2), releaseAt: null, isPublished: true }, { earlyAccessAt: days(-1), releaseAt: null, isPublished: true }];
    assert.deepEqual(advanceCursor(null, products), days(-1));
    assert.deepEqual(advanceCursor(days(5), products), days(5));
    assert.equal(advanceCursor(null, []), null);
  });
});

describe("refund totals", () => {
  it("counts only processed refunds in the payment's currency", () => {
    const refunds = [
      { amount: 5000, currency: "GHS", status: "processed" },
      { amount: 5000, currency: "GHS", status: "pending" },
      { amount: 5000, currency: "NGN", status: "processed" },
      { amount: 2500, currency: "GHS", status: "processed" }
    ];
    assert.equal(processedRefundTotal(refunds, "GHS"), 7500);
  });

  it("treats only the whole amount as a full refund", () => {
    assert.equal(isFullRefund(15000, 15000), true);
    assert.equal(isFullRefund(14999, 15000), false);
    assert.equal(isFullRefund(0, 0), false, "a free purchase has nothing to refund");
  });
});
