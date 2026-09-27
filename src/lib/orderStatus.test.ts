import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  statusLabel,
  shortStatusLabel,
  needsAttention,
  TERMINAL_FAILURES,
  EXPECTED_PATH
} from "@/lib/orderStatus";

const ALL_STATUSES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
  "REFUNDED"
] as const;

describe("status labelling", () => {
  // Customers were being shown the raw enum — "PENDING" in capitals reads as
  // a system error rather than a normal step in an order's life.
  it("gives every status human wording", () => {
    for (const status of ALL_STATUSES) {
      const label = statusLabel(status);
      assert.notEqual(label, status, `${status} should not be shown raw`);
      assert.equal(label, label.trim());
      assert.notEqual(label, "");
    }
  });

  it("has a short form for every status, for dense lists", () => {
    for (const status of ALL_STATUSES) {
      const short = shortStatusLabel(status);
      assert.notEqual(short, "");
      assert.ok(
        short.length <= statusLabel(status).length,
        `short form of ${status} should not be longer than the full form`
      );
    }
  });

  it("falls back to the raw value for an unknown status rather than rendering blank", () => {
    assert.equal(statusLabel("SOMETHING_NEW"), "SOMETHING_NEW");
    assert.equal(shortStatusLabel("SOMETHING_NEW"), "SOMETHING_NEW");
  });
});

describe("needsAttention", () => {
  it("flags the states a customer can act on", () => {
    assert.equal(needsAttention("PENDING"), true, "an unpaid order needs payment");
    assert.equal(needsAttention("FAILED"), true);
    assert.equal(needsAttention("CANCELLED"), true);
  });

  it("stays quiet for states that are just progress", () => {
    for (const status of ["PAID", "SHIPPED", "DELIVERED"]) {
      assert.equal(needsAttention(status), false, `${status} should not be emphasised`);
    }
  });
});

describe("order progression", () => {
  it("describes the happy path in order", () => {
    assert.deepEqual([...EXPECTED_PATH], ["PENDING", "PAID", "SHIPPED", "DELIVERED"]);
  });

  /**
   * The timeline projects the remaining expected steps ahead of an order in
   * flight. Terminal failures must be excluded from that path, or a cancelled
   * order would be shown a future in which it is delivered.
   */
  it("keeps terminal failures out of the expected path", () => {
    for (const failure of TERMINAL_FAILURES) {
      assert.equal(
        (EXPECTED_PATH as readonly string[]).includes(failure),
        false,
        `${failure} must not appear as a step`
      );
    }
  });

  it("treats exactly the three unrecoverable states as terminal", () => {
    assert.deepEqual([...TERMINAL_FAILURES].sort(), ["CANCELLED", "FAILED", "REFUNDED"]);
  });

  // This mirrors the calculation the timeline component performs.
  it("projects remaining steps for a healthy order and none for a failed one", () => {
    const upcoming = (seen: string[], current: string) =>
      TERMINAL_FAILURES.has(current)
        ? []
        : EXPECTED_PATH.filter((status) => !seen.includes(status));

    assert.deepEqual(upcoming(["PENDING"], "PENDING"), ["PAID", "SHIPPED", "DELIVERED"]);
    assert.deepEqual(upcoming(["PENDING", "PAID"], "PAID"), ["SHIPPED", "DELIVERED"]);
    assert.deepEqual(upcoming(["PENDING", "PAID", "SHIPPED", "DELIVERED"], "DELIVERED"), []);
    assert.deepEqual(upcoming(["PENDING", "CANCELLED"], "CANCELLED"), []);
    assert.deepEqual(upcoming(["PENDING", "FAILED"], "FAILED"), []);
  });
});
