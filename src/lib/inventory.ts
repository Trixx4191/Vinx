/**
 * When stock counts as low.
 *
 * This number was written out by hand in six places: two Prisma `lte: 3`
 * filters, two `<= 3` comparisons that colour a table cell amber, one
 * storefront "only N left" notice, and one sentence of prose telling an admin
 * what "low stock" means. Changing the policy meant finding all six, and the
 * prose is the one that would have been missed — leaving the dashboard counting
 * by a rule the page describing it contradicted.
 */
export const LOW_STOCK_THRESHOLD = 3;

/** The Prisma filter for a low-stock variant. */
export const lowStockWhere = { quantity: { lte: LOW_STOCK_THRESHOLD } } as const;

export function isLowStock(quantity: number): boolean {
  return quantity <= LOW_STOCK_THRESHOLD;
}

/**
 * How the threshold is described to a person, so the prose cannot drift from
 * the rule. "three or fewer", not "3 or fewer" — this reads in a sentence.
 */
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export function lowStockPhrase(): string {
  const n = LOW_STOCK_THRESHOLD;
  return `${WORDS[n] ?? n} or fewer`;
}
