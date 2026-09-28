/**
 * Deciding whether a login token still stands, from the database's current
 * view of the user.
 *
 * THE FLAW THIS FIXES
 *
 * A JWT session is self-contained: the role was written into it at login, and
 * every guard in the app — middleware, the admin layout, each admin page, each
 * admin API route — read the role back out of it. None of them asked the
 * database. So when a SUPER_ADMIN revoked an admin, the database changed and
 * the revoked admin's token went on saying ADMIN for the rest of its 30-day
 * life. Every guard agreed with the token, so every guard let them in. Revoke
 * was a button that updated a row nobody read.
 *
 * The same shape applied to passwords: changing a password left every existing
 * session — including one opened with the old, possibly leaked, password —
 * fully valid.
 *
 * THE FIX
 *
 * On every server-side session read the token is checked against the user row:
 *
 *   - the row is gone                       → revoked
 *   - the token's version ≠ the row's       → revoked (password changed, role
 *                                             changed, or "sign out everywhere")
 *   - otherwise                             → valid, and the ROLE COMES FROM THE
 *                                             ROW, never from the token
 *
 * The last point means a role change takes effect on the very next request,
 * without needing to bump the version at all. The version bump on role change is
 * belt and braces: it also ends the session outright.
 */

import { isVipActive } from "@/lib/vip";

export type SessionUserRow = {
  role: string;
  sessionVersion: number;
  /** VIP is paid through this moment — active only while it is in the future. */
  vipUntil: Date | null;
  name: string | null;
  avatarUrl: string | null;
};

export type SessionVerdict =
  | { kind: "valid"; role: string; vip: boolean; name: string | null; image: string | null }
  | { kind: "revoked"; reason: "user-missing" | "version-mismatch" };

/**
 * Tokens issued before versioning existed carry no version. They are read as
 * version 0 — the column's default — so deploying this does not sign everyone
 * out; it only bites the first time a user's version is bumped.
 */
export function tokenVersion(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function evaluateSession(
  tokenSessionVersion: unknown,
  row: SessionUserRow | null,
  now: Date = new Date()
): SessionVerdict {
  if (!row) return { kind: "revoked", reason: "user-missing" };

  if (tokenVersion(tokenSessionVersion) !== row.sessionVersion) {
    return { kind: "revoked", reason: "version-mismatch" };
  }

  return {
    kind: "valid",
    role: row.role,
    // Computed on every read, so a membership lapses the moment it runs out —
    // no job has to come round and switch it off.
    vip: isVipActive(row.vipUntil, now),
    name: row.name,
    image: row.avatarUrl
  };
}
