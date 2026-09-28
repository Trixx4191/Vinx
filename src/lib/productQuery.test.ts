import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseCatalogParams,
  catalogWhere,
  catalogOrderBy,
  pageCount,
  catalogHref,
  PAGE_SIZE
} from "@/lib/productQuery";
import { visibleReleaseWhere } from "@/lib/release";

describe("parseCatalogParams", () => {
  it("defaults an empty query to page one of everything", () => {
    const query = parseCatalogParams({});
    assert.deepEqual(
      { category: query.category, search: query.search, sort: query.sort, page: query.page },
      { category: "all", search: "", sort: "newest", page: 1 }
    );
    assert.equal(query.skip, 0);
    assert.equal(query.take, PAGE_SIZE);
  });

  // These come from a URL anyone can type. Nothing here should throw.
  it("falls back rather than failing on nonsense", () => {
    assert.equal(parseCatalogParams({ page: "banana" }).page, 1);
    assert.equal(parseCatalogParams({ page: "-4" }).page, 1);
    assert.equal(parseCatalogParams({ page: "0" }).page, 1);
    assert.equal(parseCatalogParams({ sort: "; DROP TABLE" }).sort, "newest");
    assert.equal(parseCatalogParams({ sort: "cheapest" }).sort, "newest");
  });

  it("computes skip from the page size", () => {
    assert.equal(parseCatalogParams({ page: "3" }).skip, PAGE_SIZE * 2);
  });

  // An unbounded search string reaches a database LIKE; capping it keeps a
  // cheap request from producing an expensive scan.
  it("caps the search term", () => {
    const query = parseCatalogParams({ q: "x".repeat(5000) });
    assert.equal(query.search.length, 100);
  });

  it("caps the page number so a huge offset cannot be requested", () => {
    assert.equal(parseCatalogParams({ page: "999999999" }).page, 10_000);
  });

  it("trims whitespace-only values back to defaults", () => {
    assert.equal(parseCatalogParams({ q: "   " }).search, "");
    assert.equal(parseCatalogParams({ category: "  " }).category, "all");
  });
});

describe("catalogWhere", () => {
  it("only ever returns published products", () => {
    const where = catalogWhere(parseCatalogParams({})) as Record<string, unknown>;
    assert.equal(where.isPublished, true);
  });

  it("does not constrain category when showing everything", () => {
    const where = catalogWhere(parseCatalogParams({ category: "all" })) as Record<string, unknown>;
    assert.equal("category" in where, false);
  });

  it("constrains by category slug when one is chosen", () => {
    const where = catalogWhere(parseCatalogParams({ category: "hoodies" })) as Record<string, unknown>;
    assert.deepEqual(where.category, { slug: "hoodies" });
  });

  it("searches name, description and material, case insensitively", () => {
    const where = catalogWhere(parseCatalogParams({ q: "Fleece" })) as Record<string, unknown>;
    const or = where.OR as Array<Record<string, { contains: string; mode: string }>>;

    assert.equal(or.length, 3);
    for (const clause of or) {
      const [field] = Object.keys(clause);
      assert.equal(clause[field].contains, "Fleece");
      assert.equal(clause[field].mode, "insensitive");
    }
    assert.deepEqual(or.map((c) => Object.keys(c)[0]).sort(), ["description", "material", "name"]);
  });

  /**
   * Unreleased drops must never be listed. The rule is `visibleReleaseWhere`,
   * itself tested against `releaseState`; this checks the catalog applies it,
   * and applies it for the moment passed in rather than a cached one.
   */
  it("always excludes drops that have not opened", () => {
    const now = new Date("2026-10-11T00:00:00Z");
    const where = catalogWhere(parseCatalogParams({ q: "fleece" }), now) as Record<string, unknown>;
    assert.deepEqual(where.AND, [visibleReleaseWhere(now)]);
    // And alongside a search, not instead of it.
    assert.ok(Array.isArray(where.OR));
  });

  it("adds no OR clause when there is no search term", () => {
    const where = catalogWhere(parseCatalogParams({})) as Record<string, unknown>;
    assert.equal("OR" in where, false);
  });
});

describe("catalogOrderBy", () => {
  /**
   * The pagination bug this prevents: two products at the same price have no
   * defined order between them, so the database is free to return one of them
   * on page 1 and again on page 2, dropping another entirely. A unique
   * tiebreak makes the total ordering stable across queries.
   */
  it("ends every sort with a unique tiebreak", () => {
    for (const sort of ["newest", "price-low", "price-high", "name"] as const) {
      const order = catalogOrderBy(sort);
      const last = order[order.length - 1];
      assert.deepEqual(last, { id: "asc" }, `${sort} must end with an id tiebreak`);
    }
  });

  it("sorts by the field each option names, in the right direction", () => {
    // Read as a plain record: the union of per-sort shapes is not worth
    // narrowing here, and the assertion is about the data, not the type.
    // The union of per-sort shapes carries optional keys, so it does not
    // overlap a plain string record directly. Widening through `unknown` says
    // the assertion is about the runtime data, not the type.
    const first = (sort: Parameters<typeof catalogOrderBy>[0]) =>
      catalogOrderBy(sort)[0] as unknown as Record<string, string>;

    assert.deepEqual(first("price-low"), { price: "asc" });
    assert.deepEqual(first("price-high"), { price: "desc" });
    assert.deepEqual(first("name"), { name: "asc" });
    assert.deepEqual(first("newest"), { createdAt: "desc" });
  });
});

describe("pageCount", () => {
  it("is never less than one, even with no results", () => {
    assert.equal(pageCount(0), 1);
  });

  it("rounds a partial page up", () => {
    assert.equal(pageCount(PAGE_SIZE), 1);
    assert.equal(pageCount(PAGE_SIZE + 1), 2);
    assert.equal(pageCount(PAGE_SIZE * 3), 3);
  });
});

describe("catalogHref", () => {
  // A clean URL is what gets shared. Carrying every default as a parameter
  // makes the common case look like a filtered view.
  it("omits defaults", () => {
    assert.equal(catalogHref({ category: "all", search: "", sort: "newest", page: 1 }), "/products");
  });

  it("includes only what differs from the default", () => {
    assert.equal(catalogHref({ category: "hoodies", page: 1 }), "/products?category=hoodies");
    assert.equal(catalogHref({ page: 3 }), "/products?page=3");
    assert.equal(catalogHref({ sort: "price-low" }), "/products?sort=price-low");
  });

  it("encodes a search term safely", () => {
    const href = catalogHref({ search: "cotton & wool" });
    assert.ok(!href.includes(" "), "spaces must be encoded");
    assert.ok(href.includes("cotton") && href.includes("wool"));
  });

  it("round-trips back through the parser", () => {
    const original = parseCatalogParams({ category: "hoodies", q: "fleece", sort: "price-high", page: "2" });
    const href = catalogHref(original);
    const params = Object.fromEntries(new URL(href, "https://x.test").searchParams);
    const reparsed = parseCatalogParams(params);

    assert.deepEqual(
      { c: reparsed.category, q: reparsed.search, s: reparsed.sort, p: reparsed.page },
      { c: "hoodies", q: "fleece", s: "price-high", p: 2 }
    );
  });
});
