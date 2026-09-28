import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { releaseState, canView, canBuy, visibleReleaseWhere, type ReleaseDates } from "@/lib/release";

const at = (iso: string) => new Date(iso);
const drop: ReleaseDates = { earlyAccessAt: "2026-10-10T12:00:00Z", releaseAt: "2026-10-12T12:00:00Z" };

describe("releaseState", () => {
  // Every product that existed before drops had no dates. They must stay
  // exactly as they were.
  it("treats a product with no dates as open", () => {
    assert.equal(releaseState({}, at("2026-01-01T00:00:00Z")), "open");
    assert.equal(releaseState({ releaseAt: null, earlyAccessAt: null }), "open");
  });

  it("walks through upcoming → early → open", () => {
    assert.equal(releaseState(drop, at("2026-10-09T00:00:00Z")), "upcoming");
    assert.equal(releaseState(drop, at("2026-10-11T00:00:00Z")), "early");
    assert.equal(releaseState(drop, at("2026-10-13T00:00:00Z")), "open");
  });

  // Boundaries are inclusive: at the stroke of the time, it has opened.
  it("opens exactly at each moment, not a tick later", () => {
    assert.equal(releaseState(drop, at("2026-10-10T12:00:00Z")), "early");
    assert.equal(releaseState(drop, at("2026-10-12T12:00:00Z")), "open");
  });

  it("with no early window, goes straight from upcoming to open", () => {
    const plain = { releaseAt: "2026-10-12T12:00:00Z" };
    assert.equal(releaseState(plain, at("2026-10-11T00:00:00Z")), "upcoming");
    assert.equal(releaseState(plain, at("2026-10-12T12:00:00Z")), "open");
  });

  it("reads an unparseable date as unset rather than throwing", () => {
    assert.equal(releaseState({ releaseAt: "not a date" }), "open");
  });
});

describe("canBuy — the rule checkout enforces", () => {
  it("lets anyone buy an open product", () => {
    assert.equal(canBuy("open", { isVip: false }), true);
  });

  it("lets only VIPs buy during the early window", () => {
    assert.equal(canBuy("early", { isVip: true }), true);
    assert.equal(canBuy("early", { isVip: false }), false);
  });

  it("lets nobody buy an upcoming product — VIP or not", () => {
    assert.equal(canBuy("upcoming", { isVip: true }), false);
    assert.equal(canBuy("upcoming", { isVip: false }), false);
  });
});

describe("canView", () => {
  // Non-VIPs see early products on purpose — a window nobody can see is no
  // reason to join. They just cannot buy.
  it("shows early products to everyone", () => {
    assert.equal(canView("early", { isVip: false, isAdmin: false }), true);
  });

  it("hides upcoming products from everyone but admins", () => {
    assert.equal(canView("upcoming", { isVip: true, isAdmin: false }), false);
    assert.equal(canView("upcoming", { isVip: false, isAdmin: true }), true);
  });
});

describe("visibleReleaseWhere", () => {
  /**
   * The catalog filters in the database with this; the product page and
   * checkout decide with releaseState. If the two disagreed, a product could
   * appear in the grid and 404 when clicked, or be hidden while still buyable.
   * This evaluates the Prisma filter by hand against the same cases.
   */
  function matches(where: ReturnType<typeof visibleReleaseWhere>, p: ReleaseDates): boolean {
    type Clause = { releaseAt?: null | { lte: Date }; earlyAccessAt?: { lte: Date } };
    return (where.OR as Clause[]).some((clause) => {
      if (clause.releaseAt === null) return p.releaseAt == null;
      if (clause.releaseAt) return p.releaseAt != null && new Date(p.releaseAt) <= clause.releaseAt.lte;
      if (clause.earlyAccessAt) return p.earlyAccessAt != null && new Date(p.earlyAccessAt) <= clause.earlyAccessAt.lte;
      return false;
    });
  }

  it("agrees with releaseState on every case", () => {
    const cases: ReleaseDates[] = [{}, drop, { releaseAt: "2026-10-12T12:00:00Z" }];
    const moments = ["2026-10-09T00:00:00Z", "2026-10-10T12:00:00Z", "2026-10-11T00:00:00Z", "2026-10-13T00:00:00Z"];
    for (const p of cases) {
      for (const m of moments) {
        const now = at(m);
        const listed = matches(visibleReleaseWhere(now), p);
        const visible = releaseState(p, now) !== "upcoming";
        assert.equal(listed, visible, `${JSON.stringify(p)} at ${m}`);
      }
    }
  });
});
