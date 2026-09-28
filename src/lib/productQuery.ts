import { visibleReleaseWhere } from "@/lib/release";
/**
 * Translate URL search params into a catalog query.
 *
 * Filtering used to happen in the browser: the page loaded every published
 * product and `Array.filter` did the rest. That is fine at five products and
 * indefensible at five hundred — every visitor downloads the entire catalog,
 * including the ones they filtered away, before seeing anything.
 *
 * Kept as a pure function so the parsing can be tested without a database.
 * Nothing here touches Prisma; it returns the shape Prisma expects.
 */

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "name", label: "Alphabetical" }
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const PAGE_SIZE = 24;

export type CatalogParams = {
  category?: string;
  q?: string;
  sort?: string;
  page?: string;
};

export type ParsedCatalogQuery = {
  category: string;
  search: string;
  sort: SortValue;
  page: number;
  skip: number;
  take: number;
};

function isSort(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * Normalise raw params. Anything unrecognised falls back to a default rather
 * than erroring — these arrive from a URL a person can type, and a malformed
 * `?page=banana` should show page one, not a stack trace.
 */
export function parseCatalogParams(params: CatalogParams): ParsedCatalogQuery {
  const category = (params.category ?? "all").trim() || "all";

  // Capped because it reaches a database LIKE. An unbounded string here is a
  // cheap way for anyone to make the server do expensive scans.
  const search = (params.q ?? "").trim().slice(0, 100);

  const sortRaw = (params.sort ?? "newest").trim();
  const sort: SortValue = isSort(sortRaw) ? sortRaw : "newest";

  const pageRaw = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 10_000) : 1;

  return { category, search, sort, page, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

/** The Prisma `where` for a parsed query. */
export function catalogWhere(query: ParsedCatalogQuery, now: Date = new Date()) {
  const where: Record<string, unknown> = {
    isPublished: true,
    // Drops that have not opened to anyone yet are never listed. An `AND`,
    // not a second `OR`, because the search below already owns `OR`.
    AND: [visibleReleaseWhere(now)]
  };

  if (query.category !== "all") {
    where.category = { slug: query.category };
  }

  if (query.search) {
    // Matched across the fields a shopper would actually search by. Case
    // insensitive, since nobody types "Hoodie" with the capital.
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { material: { contains: query.search, mode: "insensitive" } }
    ];
  }

  return where;
}

/**
 * The Prisma `orderBy`. Every sort ends with a unique tiebreak on `id`.
 *
 * Without one, two products sharing a price have no defined order between
 * pages, so the database may return the same row on page one and page two and
 * drop another entirely. It is the classic pagination bug and it only shows up
 * once there is enough data to paginate.
 */
export function catalogOrderBy(sort: SortValue) {
  switch (sort) {
    case "price-low":
      return [{ price: "asc" as const }, { id: "asc" as const }];
    case "price-high":
      return [{ price: "desc" as const }, { id: "asc" as const }];
    case "name":
      return [{ name: "asc" as const }, { id: "asc" as const }];
    case "newest":
    default:
      return [{ createdAt: "desc" as const }, { id: "asc" as const }];
  }
}

/** Total pages for a result count, never less than one. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** Build a querystring for a catalog link, omitting defaults to keep URLs clean. */
export function catalogHref(query: Partial<ParsedCatalogQuery> & { page?: number }): string {
  const params = new URLSearchParams();

  if (query.category && query.category !== "all") params.set("category", query.category);
  if (query.search) params.set("q", query.search);
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));

  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}
