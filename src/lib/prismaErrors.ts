/**
 * The query methods a Prisma model delegate exposes. When the generated client
 * predates a model, `prisma.thatModel` is undefined, and calling any of these
 * on it throws `TypeError: Cannot read properties of undefined (reading 'x')`.
 */
const DELEGATE_METHODS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy"
];

const PATTERN = new RegExp(
  `^Cannot read properties of undefined \\(reading '(${DELEGATE_METHODS.join("|")})'\\)$`
);

/**
 * Whether an error is the signature of a stale generated Prisma client.
 *
 * Deliberately narrow: a TypeError, reading one of the delegate methods, off
 * `undefined`. A TypeError reading anything else is an ordinary bug and must
 * keep surfacing as one — misreporting a real bug as "regenerate your client"
 * would send someone to fix the wrong thing.
 */
export function isStalePrismaClient(err: unknown): boolean {
  return err instanceof TypeError && PATTERN.test(err.message);
}
