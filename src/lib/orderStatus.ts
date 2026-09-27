/**
 * Customer-facing wording for order statuses.
 *
 * The database stores these as enum values (`PENDING`, `PAID`, …) which are
 * fine for code and wrong for a customer — "PENDING" in capitals reads as a
 * system error rather than a normal step. Both the account list and the order
 * timeline read from here so the two can never describe the same state
 * differently.
 */
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Placed",
  PAID: "Payment confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  FAILED: "Payment failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded"
};

/** A shorter form for dense lists, where the full phrase crowds the row. */
const SHORT_LABELS: Record<string, string> = {
  PENDING: "Placed",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded"
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function shortStatusLabel(status: string): string {
  return SHORT_LABELS[status] ?? status;
}

/** Statuses that end an order rather than advance it. */
export const TERMINAL_FAILURES = new Set(["FAILED", "CANCELLED", "REFUNDED"]);

/** The sequence a healthy order moves through. */
export const EXPECTED_PATH = ["PENDING", "PAID", "SHIPPED", "DELIVERED"] as const;

/** True when a status needs the customer's attention rather than just reporting progress. */
export function needsAttention(status: string): boolean {
  return status === "PENDING" || TERMINAL_FAILURES.has(status);
}
