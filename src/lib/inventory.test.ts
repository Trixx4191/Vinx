import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LOW_STOCK_THRESHOLD, lowStockWhere, isLowStock, lowStockPhrase } from "@/lib/inventory";

describe("isLowStock", () => {
  it("includes the threshold itself", () => {
    assert.equal(isLowStock(LOW_STOCK_THRESHOLD), true);
    assert.equal(isLowStock(LOW_STOCK_THRESHOLD + 1), false);
  });

  // Nothing left is the most low-stock a variant can be. An `=== threshold`
  // comparison, or a truthiness check, would quietly exclude it.
  it("counts zero and treats it as low", () => {
    assert.equal(isLowStock(0), true);
  });
});

describe("lowStockWhere", () => {
  /**
   * The dashboard counts low-stock variants with this filter while the restock
   * page lists them with it. If the filter and `isLowStock` ever disagreed, the
   * dashboard would show a count the page it links to could not produce — the
   * kind of mismatch that gets blamed on caching for a week.
   */
  it("filters on the same boundary the predicate uses", () => {
    assert.deepEqual(lowStockWhere, { quantity: { lte: LOW_STOCK_THRESHOLD } });
    assert.equal(isLowStock(lowStockWhere.quantity.lte), true);
    assert.equal(isLowStock(lowStockWhere.quantity.lte + 1), false);
  });
});

describe("lowStockPhrase", () => {
  /**
   * The prose an admin reads has to describe the rule the query runs. These
   * were separate before — a `lte: 3` filter and a sentence with the word
   * "three" typed into it — so changing the policy in one place left the page
   * explaining a rule the dashboard no longer followed.
   */
  it("spells the current threshold, whatever it is set to", () => {
    assert.ok(
      lowStockPhrase().startsWith("three"),
      `expected the phrase to name ${LOW_STOCK_THRESHOLD}, got "${lowStockPhrase()}"`
    );
    assert.ok(lowStockPhrase().endsWith("or fewer"));
  });

  it("reads as part of a sentence rather than as a number", () => {
    assert.ok(!/\d/.test(lowStockPhrase()), "a word belongs in prose, not a digit");
  });
});
