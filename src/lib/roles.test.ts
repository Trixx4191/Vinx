import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAdminRole, isSuperAdminRole, roleOf, roleLabel } from "@/lib/roles";

/**
 * These two functions gate every admin route in the application. They are
 * cheap to test and expensive to get wrong: a false negative locks the owner
 * out of their own back office, and a false positive hands a customer the
 * catalog.
 */

describe("isAdminRole", () => {
  it("admits both privileged roles", () => {
    assert.equal(isAdminRole("ADMIN"), true);
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
  });

  it("refuses customers", () => {
    assert.equal(isAdminRole("CUSTOMER"), false);
  });

  // The whole reason this helper exists. Thirteen hand-written
  // `role !== "ADMIN"` comparisons would each have excluded SUPER_ADMIN when
  // that role was introduced, locking the master admin out of the admin area
  // and — in auth.ts — skipping its 2FA check entirely.
  it("does not regress to an exact ADMIN comparison", () => {
    assert.equal(
      isAdminRole("SUPER_ADMIN"),
      true,
      "SUPER_ADMIN must pass admin checks; a literal === \"ADMIN\" would fail here"
    );
  });

  it("refuses absent, malformed and non-string values", () => {
    for (const value of [undefined, null, "", "admin", "Admin", " ADMIN", 0, 1, true, {}, []]) {
      assert.equal(isAdminRole(value), false, `expected ${JSON.stringify(value)} to be refused`);
    }
  });
});

describe("isSuperAdminRole", () => {
  it("admits only the master role", () => {
    assert.equal(isSuperAdminRole("SUPER_ADMIN"), true);
  });

  // If a regular ADMIN passed this, any admin could promote themselves and the
  // distinction between the two roles would be decorative.
  it("refuses a regular admin", () => {
    assert.equal(isSuperAdminRole("ADMIN"), false);
  });

  it("refuses customers and junk", () => {
    for (const value of ["CUSTOMER", undefined, null, "", "super_admin", 1, {}]) {
      assert.equal(isSuperAdminRole(value), false, `expected ${JSON.stringify(value)} to be refused`);
    }
  });
});

describe("roleOf", () => {
  it("reads a role off a session-like object", () => {
    assert.equal(roleOf({ role: "ADMIN" }), "ADMIN");
  });

  it("returns undefined rather than throwing on absent or non-string roles", () => {
    assert.equal(roleOf(null), undefined);
    assert.equal(roleOf(undefined), undefined);
    assert.equal(roleOf({}), undefined);
    assert.equal(roleOf({ role: 42 }), undefined);
  });
});

describe("roleLabel", () => {
  it("gives each role human wording", () => {
    assert.equal(roleLabel("SUPER_ADMIN"), "Master admin");
    assert.equal(roleLabel("ADMIN"), "Admin");
    assert.equal(roleLabel("CUSTOMER"), "Customer");
  });

  it("falls back to Customer for unknown roles rather than leaking the raw value", () => {
    assert.equal(roleLabel("SOMETHING_NEW"), "Customer");
  });
});
