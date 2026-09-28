import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateSession, tokenVersion, type SessionUserRow } from "@/lib/sessionCheck";

const row = (overrides: Partial<SessionUserRow> = {}): SessionUserRow => ({
  role: "ADMIN",
  sessionVersion: 0,
  vipUntil: null,
  name: "Ama",
  avatarUrl: null,
  ...overrides
});

describe("evaluateSession", () => {
  /**
   * The flaw: the role used to be read from the token, which was written at
   * login and trusted for 30 days. A revoked admin's token kept saying ADMIN.
   * The role must come from the database row — so a demotion takes effect on
   * the very next request even if nothing else changed.
   */
  it("takes the role from the database row, not from the token", () => {
    const verdict = evaluateSession(0, row({ role: "CUSTOMER" }));
    assert.equal(verdict.kind, "valid");
    if (verdict.kind === "valid") assert.equal(verdict.role, "CUSTOMER");
  });

  it("ends the session when the version has moved on", () => {
    // Password changed, role changed, or "sign out everywhere".
    const verdict = evaluateSession(2, row({ sessionVersion: 3 }));
    assert.deepEqual(verdict, { kind: "revoked", reason: "version-mismatch" });
  });

  // A token can never be *ahead* of the row legitimately; if it is, something
  // is wrong and it must not be honoured either.
  it("ends the session when the token claims a newer version than the row", () => {
    assert.equal(evaluateSession(5, row({ sessionVersion: 3 })).kind, "revoked");
  });

  it("ends the session when the user no longer exists", () => {
    assert.deepEqual(evaluateSession(0, null), { kind: "revoked", reason: "user-missing" });
  });

  it("keeps a session whose version matches", () => {
    assert.equal(evaluateSession(3, row({ sessionVersion: 3 })).kind, "valid");
  });

  /**
   * Tokens issued before this change carry no version at all. Treating that as
   * 0 — the column default — means deploying the fix does not sign every
   * customer out; it only bites once a version is bumped.
   */
  it("reads a token issued before versioning as version 0", () => {
    assert.equal(evaluateSession(undefined, row({ sessionVersion: 0 })).kind, "valid");
    assert.equal(evaluateSession(undefined, row({ sessionVersion: 1 })).kind, "revoked");
  });

  it("carries VIP status, name and photo from the row", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    const verdict = evaluateSession(
      0,
      row({ vipUntil: new Date("2026-10-31T00:00:00Z"), name: "Kofi", avatarUrl: "/uploads/a.png" }),
      now
    );
    assert.deepEqual(verdict, { kind: "valid", role: "ADMIN", vip: true, name: "Kofi", image: "/uploads/a.png" });
  });

  /**
   * VIP is paid through a date. It must stop at that date on its own — on the
   * next request after it passes — without a job having to switch it off.
   */
  it("stops counting a member as VIP once their paid period has ended", () => {
    const lapsed = row({ vipUntil: new Date("2026-09-30T23:59:59Z") });
    const verdict = evaluateSession(0, lapsed, new Date("2026-10-01T00:00:00Z"));
    assert.equal(verdict.kind === "valid" && verdict.vip, false);
  });
});

describe("tokenVersion", () => {
  // The value comes out of a decoded token. Anything that is not a plain
  // non-negative integer is treated as the default, never as a wildcard.
  it("accepts only non-negative integers", () => {
    assert.equal(tokenVersion(4), 4);
    for (const junk of [undefined, null, "4", -1, 1.5, NaN, {}]) {
      assert.equal(tokenVersion(junk), 0, String(junk));
    }
  });
});
