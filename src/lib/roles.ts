/**
 * One definition of what each role may do.
 *
 * Before this existed, `role !== "ADMIN"` was written out by hand in thirteen
 * separate places. That works until a second privileged role is added, at
 * which point every one of those comparisons silently excludes it — a
 * SUPER_ADMIN would have been redirected out of the admin area by the very
 * pages it is meant to own. Route guards now go through these helpers so a
 * future role is a change in one file, not a hunt through thirteen.
 *
 * These are pure string checks with no imports, so they are safe to call from
 * middleware (edge runtime), server components, and client components alike.
 */

export type AppRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

/** Roles that may reach /admin at all. */
const ADMIN_ROLES: readonly string[] = ["ADMIN", "SUPER_ADMIN"];

/**
 * True for any role allowed into the admin area. Use this for every admin
 * route guard — never compare against the literal "ADMIN".
 */
export function isAdminRole(role: unknown): boolean {
  return typeof role === "string" && ADMIN_ROLES.includes(role);
}

/**
 * True only for the master role that manages staff. Guards anything that
 * grants or revokes access, which a regular ADMIN must never reach.
 */
export function isSuperAdminRole(role: unknown): boolean {
  return role === "SUPER_ADMIN";
}

/** Reads the role off a NextAuth session or JWT without unsafe casts at call sites. */
export function roleOf(subject: { role?: unknown } | null | undefined): string | undefined {
  const role = subject?.role;
  return typeof role === "string" ? role : undefined;
}

/** Human-readable label for the staff table. */
export function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Master admin";
  if (role === "ADMIN") return "Admin";
  return "Customer";
}
