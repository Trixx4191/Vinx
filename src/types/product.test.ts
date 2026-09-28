import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPrice,
  isProductInStock,
  totalStock,
  productMedia,
  isNewArrival,
  modelShotCaption,
  type Product
} from "@/types/product";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Classic Tee",
    slug: "classic-tee",
    description: "A tee.",
    material: "Cotton",
    price: 12000,
    currency: "GHS",
    frontImageUrl: "https://cdn.vinx.com/front.png",
    backImageUrl: "https://cdn.vinx.com/back.png",
    category: { name: "T-Shirts", slug: "t-shirts" },
    variants: [
      { id: "v1", size: "S", color: "Black", quantity: 3, inStock: true },
      { id: "v2", size: "M", color: "Black", quantity: 0, inStock: false }
    ],
    ...overrides
  };
}

describe("formatPrice", () => {
  /**
   * Money is stored in minor units (pesewas) precisely to avoid float
   * rounding. The one thing this function must never do is display the
   * integer as if it were a major-unit amount — 12000 pesewas is GHS 120.00,
   * not GHS 12,000.
   */
  it("converts minor units to major units", () => {
    assert.match(formatPrice(12000, "GHS"), /120\.00/);
    assert.match(formatPrice(1, "GHS"), /0\.01/);
    assert.match(formatPrice(0, "GHS"), /0\.00/);
  });

  it("does not lose precision on amounts that would round badly as floats", () => {
    assert.match(formatPrice(26690, "GHS"), /266\.90/);
    assert.match(formatPrice(999, "GHS"), /9\.99/);
  });

  it("honours the currency it is given rather than assuming one", () => {
    // The symbol itself is ICU's business and varies by platform; what matters
    // is that a different currency produces a different rendering.
    assert.notEqual(formatPrice(12000, "GHS"), formatPrice(12000, "USD"));
  });
});

describe("stock helpers", () => {
  it("counts a product in stock when any variant is buyable", () => {
    assert.equal(isProductInStock(makeProduct()), true);
  });

  it("counts a product out of stock when every variant is empty", () => {
    const product = makeProduct({
      variants: [
        { id: "v1", size: "S", color: "Black", quantity: 0, inStock: false },
        { id: "v2", size: "M", color: "Black", quantity: 0, inStock: true }
      ]
    });
    assert.equal(isProductInStock(product), false);
  });

  // A variant flagged inStock but holding zero units is not buyable. Trusting
  // the flag alone would let someone add a phantom item to their bag.
  it("requires both the flag and a positive quantity", () => {
    const product = makeProduct({
      variants: [{ id: "v1", size: "S", color: "Black", quantity: 5, inStock: false }]
    });
    assert.equal(isProductInStock(product), false);
  });

  it("sums stock across variants", () => {
    assert.equal(totalStock(makeProduct()), 3);
  });

  it("returns zero for a product with no variants", () => {
    assert.equal(totalStock(makeProduct({ variants: [] })), 0);
    assert.equal(isProductInStock(makeProduct({ variants: [] })), false);
  });
});

describe("isNewArrival", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

  it("badges a piece added recently", () => {
    assert.equal(isNewArrival(makeProduct({ createdAt: daysAgo(1) }), now), true);
    assert.equal(isNewArrival(makeProduct({ createdAt: daysAgo(29) }), now), true);
  });

  /**
   * The badge is derived from the date rather than stored as a flag precisely
   * so it expires on its own. A manually-cleared badge is one that ends up
   * still sitting on last year's stock.
   */
  it("stops badging once the window has passed", () => {
    assert.equal(isNewArrival(makeProduct({ createdAt: daysAgo(31) }), now), false);
    assert.equal(isNewArrival(makeProduct({ createdAt: daysAgo(400) }), now), false);
  });

  it("accepts the ISO strings that survive a server-to-client boundary", () => {
    assert.equal(isNewArrival(makeProduct({ createdAt: daysAgo(2).toISOString() }), now), true);
    assert.equal(isNewArrival(makeProduct({ createdAt: daysAgo(90).toISOString() }), now), false);
  });

  it("does not badge a product with no date, or an unparseable one", () => {
    assert.equal(isNewArrival(makeProduct({ createdAt: undefined }), now), false);
    assert.equal(isNewArrival(makeProduct({ createdAt: "not a date" }), now), false);
  });

  // Clock skew between a database server and the web server can date a row a
  // few seconds into the future; that should read as new, not as an error.
  it("treats a future date as new rather than silently dropping the badge", () => {
    const future = new Date(now.getTime() + 60_000);
    assert.equal(isNewArrival(makeProduct({ createdAt: future }), now), true);
  });
});

describe("productMedia", () => {
  /**
   * Both the product tile and the detail gallery read from this function, so
   * the order it returns is the order a shopper sees. Keeping it in one place
   * is what stops the two surfaces disagreeing about a product's media.
   */
  it("returns front then back when there is nothing else", () => {
    const media = productMedia(makeProduct());
    assert.equal(media.length, 2);
    assert.deepEqual(
      media.map((slot) => slot.kind),
      ["image", "image"]
    );
    assert.equal(media[0].src, "https://cdn.vinx.com/front.png");
    assert.equal(media[1].src, "https://cdn.vinx.com/back.png");
  });

  it("places gallery images after front and back", () => {
    const media = productMedia(
      makeProduct({ galleryImages: ["https://cdn.vinx.com/d1.png", "https://cdn.vinx.com/d2.png"] })
    );
    assert.equal(media.length, 4);
    assert.equal(media[2].src, "https://cdn.vinx.com/d1.png");
    assert.equal(media[3].src, "https://cdn.vinx.com/d2.png");
  });

  it("places the video last and posters it with the front image", () => {
    const media = productMedia(makeProduct({ hoverVideoUrl: "https://cdn.vinx.com/clip.mp4" }));
    const last = media[media.length - 1];
    assert.equal(last.kind, "video");
    if (last.kind === "video") {
      assert.equal(last.src, "https://cdn.vinx.com/clip.mp4");
      assert.equal(last.poster, "https://cdn.vinx.com/front.png");
    }
  });

  it("omits the video slot entirely when there is no video", () => {
    for (const value of [undefined, null, ""]) {
      const media = productMedia(makeProduct({ hoverVideoUrl: value as string | null | undefined }));
      assert.equal(
        media.some((slot) => slot.kind === "video"),
        false,
        `expected no video slot for ${JSON.stringify(value)}`
      );
    }
  });

  it("gives every slot descriptive alt text naming the product", () => {
    const media = productMedia(
      makeProduct({
        galleryImages: ["https://cdn.vinx.com/d1.png"],
        hoverVideoUrl: "https://cdn.vinx.com/clip.mp4"
      })
    );
    for (const slot of media) {
      assert.ok(slot.alt.includes("Classic Tee"), `alt text should name the product: ${slot.alt}`);
      assert.notEqual(slot.alt.trim(), "");
    }
  });

  it("treats an absent gallery the same as an empty one", () => {
    assert.equal(productMedia(makeProduct({ galleryImages: undefined })).length, 2);
    assert.equal(productMedia(makeProduct({ galleryImages: [] })).length, 2);
  });

  /**
   * A garment on a body is what a shopper looks at first, so the on-model shot
   * leads. The flat front image answers "what is it"; the model shot answers
   * "what does it look like worn".
   */
  it("puts model shots ahead of the flat product shots", () => {
    const media = productMedia(
      makeProduct({
        modelShots: [{ imageUrl: "https://cdn.vinx.com/kofi.png", model: { name: "Kofi" } }]
      })
    );

    assert.equal(media.length, 3);
    assert.equal(media[0].src, "https://cdn.vinx.com/kofi.png");
    assert.equal(media[1].src, "https://cdn.vinx.com/front.png");
  });

  // Ordering is the admin's, not the database's insertion order.
  it("orders model shots by sortOrder, not by array position", () => {
    const media = productMedia(
      makeProduct({
        modelShots: [
          { imageUrl: "https://cdn.vinx.com/second.png", sortOrder: 2, model: { name: "Ama" } },
          { imageUrl: "https://cdn.vinx.com/first.png", sortOrder: 1, model: { name: "Kofi" } }
        ]
      })
    );

    assert.equal(media[0].src, "https://cdn.vinx.com/first.png");
    assert.equal(media[1].src, "https://cdn.vinx.com/second.png");
  });

  // Sorting must not mutate the product it was handed — the detail page derives
  // this inside a useMemo over the same object it renders from.
  it("does not reorder the product's own modelShots array", () => {
    const shots = [
      { imageUrl: "https://cdn.vinx.com/b.png", sortOrder: 2, model: { name: "Ama" } },
      { imageUrl: "https://cdn.vinx.com/a.png", sortOrder: 1, model: { name: "Kofi" } }
    ];
    productMedia(makeProduct({ modelShots: shots }));
    assert.equal(shots[0].imageUrl, "https://cdn.vinx.com/b.png");
  });

  it("captions a model slot and leaves the flat shots uncaptioned", () => {
    const media = productMedia(
      makeProduct({
        modelShots: [
          { imageUrl: "https://cdn.vinx.com/kofi.png", model: { name: "Kofi", heightCm: 185, wearingSize: "L" } }
        ]
      })
    );

    assert.equal(media[0].caption, "On Kofi · 185cm · wearing L");
    assert.equal(media[1].caption, undefined);
  });

  it("names the model in a model slot's alt text", () => {
    const media = productMedia(
      makeProduct({ modelShots: [{ imageUrl: "https://cdn.vinx.com/k.png", model: { name: "Kofi" } }] })
    );
    assert.ok(media[0].alt.includes("Kofi"));
    assert.ok(media[0].alt.includes("Classic Tee"));
  });

  it("treats absent model shots the same as an empty list", () => {
    assert.equal(productMedia(makeProduct({ modelShots: undefined })).length, 2);
    assert.equal(productMedia(makeProduct({ modelShots: [] })).length, 2);
  });

  // The video is postered with the flat front image rather than whatever slot
  // happens to be first, which model shots now change.
  it("still posters the video with the front image when model shots lead", () => {
    const media = productMedia(
      makeProduct({
        hoverVideoUrl: "https://cdn.vinx.com/clip.mp4",
        modelShots: [{ imageUrl: "https://cdn.vinx.com/kofi.png", model: { name: "Kofi" } }]
      })
    );

    const last = media[media.length - 1];
    assert.equal(last.kind, "video");
    if (last.kind === "video") assert.equal(last.poster, "https://cdn.vinx.com/front.png");
  });
});

describe("modelShotCaption", () => {
  /**
   * This line is the whole reason a model is a database record rather than just
   * another image URL. "Kofi is 185cm and wearing L" tells a shopper more about
   * fit than a size chart does, and it is the one thing the photograph cannot
   * say for itself.
   */
  it("reads as a sentence when everything is known", () => {
    assert.equal(
      modelShotCaption({ name: "Kofi", heightCm: 185, wearingSize: "L" }),
      "On Kofi · 185cm · wearing L"
    );
  });

  it("omits missing parts rather than leaving empty segments", () => {
    assert.equal(modelShotCaption({ name: "Ama" }), "On Ama");
    assert.equal(modelShotCaption({ name: "Ama", heightCm: 172 }), "On Ama · 172cm");
    assert.equal(modelShotCaption({ name: "Ama", wearingSize: "S" }), "On Ama · wearing S");
  });

  it("treats null the same as absent, since that is what the database stores", () => {
    assert.equal(modelShotCaption({ name: "Ama", heightCm: null, wearingSize: null }), "On Ama");
  });

  /**
   * A stored 0 is a data error, not a height. Rendering "0cm" next to a garment
   * looks like a bug to a shopper — because it is one — so it is dropped rather
   * than displayed.
   */
  it("drops a nonsensical height instead of printing it", () => {
    assert.equal(modelShotCaption({ name: "Ama", heightCm: 0 }), "On Ama");
    assert.equal(modelShotCaption({ name: "Ama", heightCm: -5 }), "On Ama");
  });

  it("ignores a size that is only whitespace", () => {
    assert.equal(modelShotCaption({ name: "Ama", wearingSize: "   " }), "On Ama");
  });

  it("never returns an empty string, so the caption slot is never blank text", () => {
    assert.notEqual(modelShotCaption({ name: "Ama" }).trim(), "");
  });
});
