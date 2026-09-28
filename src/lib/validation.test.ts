import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutSchema,
  createProductSchema,
  modelSchema,
  subscribeSchema,
  siteSettingsSchema,
  MAX_MODEL_SHOTS,
  createStaffSchema,
  updateStaffRoleSchema,
  passwordSchema,
  vipCheckoutSchema,
  vipGrantSchema
} from "@/lib/validation";

const validAddress = {
  fullName: "Ama Mensah",
  phone: "0244123456",
  line1: "12 Oxford Street",
  city: "Accra",
  region: "Greater Accra",
  country: "GH"
};

describe("checkoutSchema — charge integrity", () => {
  it("accepts an order of identity and quantity only", () => {
    const result = checkoutSchema.safeParse({
      items: [{ variantId: "variant_1", quantity: 2 }],
      address: validAddress,
      paymentProvider: "PAYSTACK"
    });
    assert.equal(result.success, true);
  });

  /**
   * The central money guarantee. The README states it is "structurally
   * impossible to send a price" to /api/checkout — not that a price is
   * ignored, but that the schema has no such field at all.
   *
   * This test exists so a future refactor cannot quietly reintroduce one.
   * Zod strips unknown keys, so a tampered request carrying a price parses
   * successfully — and the price simply is not in the output the route reads.
   */
  it("strips any price a tampered client tries to send", () => {
    const result = checkoutSchema.safeParse({
      items: [{ variantId: "variant_1", quantity: 1, price: 1, priceAtPurchase: 1 }],
      address: validAddress,
      paymentProvider: "PAYSTACK",
      total: 1,
      totalAmount: 1,
      price: 1
    });

    assert.equal(result.success, true, "a request with extra keys should still parse");
    if (!result.success) return;

    const parsed = result.data as Record<string, unknown>;
    for (const key of ["total", "totalAmount", "price"]) {
      assert.equal(key in parsed, false, `${key} must never survive validation`);
    }

    const item = parsed.items as Array<Record<string, unknown>>;
    assert.deepEqual(
      Object.keys(item[0]).sort(),
      ["quantity", "variantId"],
      "a checkout item must carry nothing but identity and quantity"
    );
  });

  it("rejects zero, negative and absurd quantities", () => {
    for (const quantity of [0, -1, 51, 1.5]) {
      const result = checkoutSchema.safeParse({
        items: [{ variantId: "v", quantity }],
        address: validAddress,
        paymentProvider: "PAYSTACK"
      });
      assert.equal(result.success, false, `quantity ${quantity} should be refused`);
    }
  });

  it("rejects an empty basket", () => {
    const result = checkoutSchema.safeParse({
      items: [],
      address: validAddress,
      paymentProvider: "PAYSTACK"
    });
    assert.equal(result.success, false);
  });

  it("rejects an unknown payment provider", () => {
    const result = checkoutSchema.safeParse({
      items: [{ variantId: "v", quantity: 1 }],
      address: validAddress,
      paymentProvider: "FREE_MONEY"
    });
    assert.equal(result.success, false);
  });
});

describe("createProductSchema — media URLs", () => {
  const baseProduct = {
    name: "Classic Tee",
    description: "A tee.",
    material: "Cotton",
    price: 12000,
    categorySlug: "t-shirts",
    variants: [{ size: "M", color: "Black", sku: "SKU-1", quantity: 5 }]
  };

  const withImages = (front: string, back = front) => ({
    ...baseProduct,
    frontImageUrl: front,
    backImageUrl: back
  });

  it("accepts absolute URLs", () => {
    assert.equal(createProductSchema.safeParse(withImages("https://cdn.vinx.com/a.png")).success, true);
  });

  // The development-only local upload fallback produces root-relative paths.
  // A plain .url() check rejects those, which would have made every locally
  // uploaded image fail validation on save.
  it("accepts the /uploads paths produced by local development uploads", () => {
    const path = "/uploads/products/3f2a1b4c-5d6e-7f80-9a1b-2c3d4e5f6071.png";
    assert.equal(createProductSchema.safeParse(withImages(path)).success, true);
  });

  it("rejects traversal, arbitrary paths and script URLs", () => {
    for (const bad of [
      "/uploads/../../etc/passwd",
      "/etc/passwd",
      "javascript:alert(1)",
      "not a url",
      ""
    ]) {
      assert.equal(
        createProductSchema.safeParse(withImages(bad)).success,
        false,
        `expected ${JSON.stringify(bad)} to be refused`
      );
    }
  });

  it("caps the gallery so an admin cannot push an unbounded list into the row", () => {
    const image = "https://cdn.vinx.com/a.png";
    const eight = Array(8).fill(image);
    const nine = Array(9).fill(image);

    assert.equal(
      createProductSchema.safeParse({ ...withImages(image), galleryImages: eight }).success,
      true
    );
    assert.equal(
      createProductSchema.safeParse({ ...withImages(image), galleryImages: nine }).success,
      false
    );
  });

  it("treats a blank optional video field as absent rather than invalid", () => {
    const result = createProductSchema.safeParse({
      ...withImages("https://cdn.vinx.com/a.png"),
      hoverVideoUrl: ""
    });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.hoverVideoUrl, undefined);
  });

  it("rejects a non-positive price", () => {
    for (const price of [0, -100]) {
      const result = createProductSchema.safeParse({
        ...withImages("https://cdn.vinx.com/a.png"),
        price
      });
      assert.equal(result.success, false, `price ${price} should be refused`);
    }
  });
});

describe("productVariantSchema — swatch colour", () => {
  const variant = (colorHex?: unknown) => ({
    size: "M",
    color: "Sand",
    sku: "SKU-1",
    quantity: 5,
    ...(colorHex === undefined ? {} : { colorHex })
  });

  const parseVariant = (colorHex?: unknown) =>
    createProductSchema.safeParse({
      name: "Tee",
      description: "A tee.",
      material: "Cotton",
      price: 12000,
      categorySlug: "t-shirts",
      frontImageUrl: "https://cdn.vinx.com/a.png",
      backImageUrl: "https://cdn.vinx.com/b.png",
      variants: [variant(colorHex)]
    });

  it("accepts a six-digit hex", () => {
    const result = parseVariant("#1a1a1a");
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.variants[0].colorHex, "#1a1a1a");
  });

  // One stored shape means the storefront never has to handle two.
  it("expands shorthand and lower-cases, so every stored value has one form", () => {
    const short = parseVariant("#FFF");
    assert.equal(short.success, true);
    if (short.success) assert.equal(short.data.variants[0].colorHex, "#ffffff");

    const upper = parseVariant("#D4B483");
    if (upper.success) assert.equal(upper.data.variants[0].colorHex, "#d4b483");
  });

  it("treats an untouched field as not set rather than invalid", () => {
    const result = parseVariant("");
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.variants[0].colorHex, undefined);
  });

  it("is optional — variants predating the column still validate", () => {
    assert.equal(parseVariant(undefined).success, true);
  });

  /**
   * This value is interpolated into a style attribute on the storefront. The
   * pattern is strict so nothing but a colour can be stored in it.
   */
  it("refuses anything that is not a hex colour", () => {
    for (const bad of [
      "red",
      "rgb(1,2,3)",
      "#12345",
      "#gggggg",
      "#1a1a1a; background: url(x)",
      "javascript:alert(1)",
      "expression(alert(1))"
    ]) {
      assert.equal(parseVariant(bad).success, false, `expected ${JSON.stringify(bad)} to be refused`);
    }
  });
});

describe("staff schemas", () => {
  it("accepts a valid new admin", () => {
    const result = createStaffSchema.safeParse({
      name: "Kofi",
      email: "Kofi@Example.com",
      password: "correct-horse9",
      role: "ADMIN"
    });
    assert.equal(result.success, true);
    // Emails are normalised so the same person cannot end up with two accounts
    // differing only by capitalisation.
    if (result.success) assert.equal(result.data.email, "kofi@example.com");
  });

  it("refuses to create staff with a CUSTOMER role", () => {
    const result = createStaffSchema.safeParse({
      name: "Kofi",
      email: "kofi@example.com",
      password: "correct-horse9",
      role: "CUSTOMER"
    });
    assert.equal(result.success, false);
  });

  // Revoking is expressed as a role change to CUSTOMER, so that value has to
  // be permitted here even though it is refused on creation.
  it("permits CUSTOMER on a role change, which is how access is revoked", () => {
    assert.equal(updateStaffRoleSchema.safeParse({ role: "CUSTOMER" }).success, true);
    assert.equal(updateStaffRoleSchema.safeParse({ role: "SUPER_ADMIN" }).success, true);
    assert.equal(updateStaffRoleSchema.safeParse({ role: "OWNER" }).success, false);
  });
});

describe("passwordSchema", () => {
  it("accepts a password meeting the stated policy", () => {
    assert.equal(passwordSchema.safeParse("correct-horse9").success, true);
  });

  it("refuses short, letterless and numberless passwords", () => {
    for (const bad of ["short9", "nodigitshere", "1234567890"]) {
      assert.equal(passwordSchema.safeParse(bad).success, false, `expected ${bad} to be refused`);
    }
  });
});

describe("modelSchema", () => {
  const base = { name: "Kofi", gender: "Men" };

  it("accepts a model with nothing but a name and gender", () => {
    const parsed = modelSchema.safeParse(base);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.heightCm, undefined);
      assert.equal(parsed.data.wearingSize, undefined);
      assert.equal(parsed.data.isActive, true);
      assert.equal(parsed.data.displayOrder, 0);
    }
  });

  /**
   * The admin form's optional number inputs submit "" when untouched. Without
   * coercion that arrives as a string and fails as "expected number, received
   * string" — a blank height would have blocked the save with an error message
   * about a field the admin deliberately left alone.
   */
  it("reads an empty optional number as absent rather than failing", () => {
    for (const value of ["", null, undefined]) {
      const parsed = modelSchema.safeParse({ ...base, heightCm: value });
      assert.equal(parsed.success, true, `heightCm ${JSON.stringify(value)} should parse`);
      if (parsed.success) assert.equal(parsed.data.heightCm, undefined);
    }
  });

  it("coerces a numeric string from the form into a number", () => {
    const parsed = modelSchema.safeParse({ ...base, heightCm: "185", displayOrder: "3" });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.heightCm, 185);
      assert.equal(parsed.data.displayOrder, 3);
    }
  });

  /**
   * This value is printed next to a garment. "1850cm" beside a hoodie is worse
   * than no height at all, so the range is bounded rather than trusting a
   * mistyped input.
   */
  it("rejects heights outside a plausible human range", () => {
    for (const bad of [0, -5, 1850, 251, 1.5]) {
      assert.equal(
        modelSchema.safeParse({ ...base, heightCm: bad }).success,
        false,
        `heightCm ${bad} should be rejected`
      );
    }
  });

  it("requires a name and a gender", () => {
    assert.equal(modelSchema.safeParse({ gender: "Men" }).success, false);
    assert.equal(modelSchema.safeParse({ name: "Kofi" }).success, false);
    assert.equal(modelSchema.safeParse({ name: "   ", gender: "Men" }).success, false);
  });

  it("normalises a blank size worn to absent", () => {
    const parsed = modelSchema.safeParse({ ...base, wearingSize: "" });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.wearingSize, undefined);
  });

  // The reference portrait goes through the same URL guard as product imagery,
  // so a traversal path cannot be stored here either.
  it("holds the reference portrait to the same URL rules as product images", () => {
    assert.equal(
      modelSchema.safeParse({ ...base, referenceImageUrl: "https://cdn.vinx.com/kofi.png" }).success,
      true
    );
    assert.equal(modelSchema.safeParse({ ...base, referenceImageUrl: "" }).success, true);
    assert.equal(
      modelSchema.safeParse({ ...base, referenceImageUrl: "/uploads/../../etc/passwd" }).success,
      false
    );
    assert.equal(
      modelSchema.safeParse({ ...base, referenceImageUrl: "javascript:alert(1)" }).success,
      false
    );
  });
});

describe("createProductSchema — model shots", () => {
  const baseProduct = {
    name: "Classic Tee",
    description: "A tee.",
    material: "Cotton",
    price: 12000,
    categorySlug: "t-shirts",
    frontImageUrl: "https://cdn.vinx.com/front.png",
    backImageUrl: "https://cdn.vinx.com/back.png",
    variants: [{ size: "M", color: "Black", sku: "SKU-1", quantity: 5 }]
  };

  const shot = (modelId: string) => ({ modelId, imageUrl: `https://cdn.vinx.com/${modelId}.png` });

  // A product with no model view is the default, so this must never be required.
  it("defaults to no model shots", () => {
    const parsed = createProductSchema.safeParse(baseProduct);
    assert.equal(parsed.success, true);
    if (parsed.success) assert.deepEqual(parsed.data.modelShots, []);
  });

  it("accepts up to the cap and rejects more", () => {
    const shots = Array.from({ length: MAX_MODEL_SHOTS }, (_, index) => shot(`m${index}`));
    assert.equal(createProductSchema.safeParse({ ...baseProduct, modelShots: shots }).success, true);
    assert.equal(
      createProductSchema.safeParse({ ...baseProduct, modelShots: [...shots, shot("extra")] }).success,
      false
    );
  });

  /**
   * The database enforces one shot per model per product. Catching a repeat in
   * the schema is what turns an opaque unique-constraint 500 into a sentence
   * naming what the admin actually did.
   */
  it("rejects two shots of the same model", () => {
    const parsed = createProductSchema.safeParse({
      ...baseProduct,
      modelShots: [shot("kofi"), { modelId: "kofi", imageUrl: "https://cdn.vinx.com/other.png" }]
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.match(parsed.error.errors[0]?.message ?? "", /one shot per product/i);
    }
  });

  it("holds a model shot to the same URL rules as every other image", () => {
    for (const bad of ["/uploads/../../etc/passwd", "javascript:alert(1)", "not a url", ""]) {
      assert.equal(
        createProductSchema.safeParse({
          ...baseProduct,
          modelShots: [{ modelId: "kofi", imageUrl: bad }]
        }).success,
        false,
        `imageUrl ${JSON.stringify(bad)} should be rejected`
      );
    }
  });

  it("requires a model to attribute the shot to", () => {
    assert.equal(
      createProductSchema.safeParse({
        ...baseProduct,
        modelShots: [{ modelId: "", imageUrl: "https://cdn.vinx.com/a.png" }]
      }).success,
      false
    );
  });

  /**
   * Display order is assigned server-side from the submitted sequence. A
   * client-supplied sortOrder is dropped rather than honoured, so a caller
   * cannot push one product's shot ahead of the arrangement the admin made.
   */
  it("ignores a client-supplied sort order", () => {
    const parsed = createProductSchema.safeParse({
      ...baseProduct,
      modelShots: [{ ...shot("kofi"), sortOrder: 99 }]
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal("sortOrder" in parsed.data.modelShots[0], false);
    }
  });
});

describe("subscribeSchema", () => {
  it("accepts a plain address and defaults the source", () => {
    const parsed = subscribeSchema.safeParse({ email: "ama@example.com" });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.source, "popup");
  });

  /**
   * Stored lower-cased and trimmed, because the column is unique. Without
   * normalising, "Ama@example.com" and "ama@example.com" are two rows, and the
   * upsert that is meant to make a repeat sign-up idempotent stops working.
   */
  it("normalises the address so the unique index actually dedupes", () => {
    const parsed = subscribeSchema.safeParse({ email: "  AMA@Example.COM " });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.email, "ama@example.com");
  });

  it("rejects anything that is not an address", () => {
    for (const bad of ["", "ama", "ama@", "@example.com", "ama example.com"]) {
      assert.equal(
        subscribeSchema.safeParse({ email: bad }).success,
        false,
        `${JSON.stringify(bad)} should be rejected`
      );
    }
  });

  /**
   * `source` reaches a public, unauthenticated endpoint. An open string field
   * there is an invitation to write arbitrary content into the database, so it
   * is constrained to the surfaces that actually exist.
   */
  it("refuses a source it does not know", () => {
    assert.equal(subscribeSchema.safeParse({ email: "a@b.com", source: "footer" }).success, true);
    assert.equal(subscribeSchema.safeParse({ email: "a@b.com", source: "<script>" }).success, false);
    assert.equal(subscribeSchema.safeParse({ email: "a@b.com", source: "anything" }).success, false);
  });
});

describe("siteSettingsSchema", () => {
  it("accepts a hero image URL, including a local upload path", () => {
    assert.equal(siteSettingsSchema.safeParse({ heroImageUrl: "https://cdn.vinx.com/hero.png" }).success, true);
    assert.equal(
      siteSettingsSchema.safeParse({ heroImageUrl: "/uploads/products/3f2a1b4c-5d6e-7f80-9a1b-2c3d4e5f6071.png" }).success,
      true
    );
  });

  // "" is how the admin removes the hero; the route turns it into a delete.
  it("accepts an empty string as 'clear this setting'", () => {
    const parsed = siteSettingsSchema.safeParse({ heroImageUrl: "" });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.heroImageUrl, "");
  });

  /**
   * The hero URL is rendered on every visitor's homepage. It goes through the
   * same guard as product imagery, so an admin session cannot point the front
   * page at a traversal path or a script URL.
   */
  it("holds the hero to the same URL rules as product images", () => {
    for (const bad of ["/uploads/../../etc/passwd", "javascript:alert(1)", "/etc/passwd", "not a url"]) {
      assert.equal(siteSettingsSchema.safeParse({ heroImageUrl: bad }).success, false, `${bad} should be rejected`);
    }
  });

  /**
   * The table is key/value. If the schema passed unknown keys through, any
   * admin request could write arbitrary rows into it.
   */
  it("drops keys it does not know", () => {
    const parsed = siteSettingsSchema.safeParse({ heroImageUrl: "", anything: "x", __proto__: "y" });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.deepEqual(Object.keys(parsed.data), ["heroImageUrl"]);
  });
});

describe("createProductSchema — drop timing", () => {
  const base = {
    name: "Classic Tee",
    description: "A tee.",
    material: "Cotton",
    price: 12000,
    categorySlug: "t-shirts",
    frontImageUrl: "https://cdn.vinx.com/front.png",
    backImageUrl: "https://cdn.vinx.com/back.png",
    variants: [{ size: "M", color: "Black", sku: "SKU-1", quantity: 5 }]
  };

  // Every product saved before drops existed has neither field.
  it("treats absent and empty dates as 'already open'", () => {
    for (const extra of [{}, { releaseAt: "", earlyAccessAt: "" }, { releaseAt: null, earlyAccessAt: null }]) {
      const parsed = createProductSchema.safeParse({ ...base, ...extra });
      assert.equal(parsed.success, true, JSON.stringify(extra));
      if (parsed.success) {
        assert.equal(parsed.data.releaseAt, null);
        assert.equal(parsed.data.earlyAccessAt, null);
      }
    }
  });

  it("accepts a drop with a VIP window leading into it", () => {
    const parsed = createProductSchema.safeParse({
      ...base,
      earlyAccessAt: "2026-10-10T12:00:00.000Z",
      releaseAt: "2026-10-12T12:00:00.000Z"
    });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.ok(parsed.data.releaseAt instanceof Date);
  });

  /**
   * An early window at or after the drop would never apply — the product would
   * go straight from hidden to open and VIPs would get nothing. Refusing it at
   * save time is the only moment anyone would notice.
   */
  it("refuses an early window that does not start before the drop", () => {
    for (const early of ["2026-10-12T12:00:00.000Z", "2026-10-13T00:00:00.000Z"]) {
      const parsed = createProductSchema.safeParse({ ...base, earlyAccessAt: early, releaseAt: "2026-10-12T12:00:00.000Z" });
      assert.equal(parsed.success, false, early);
    }
  });

  it("refuses an early window with no drop to lead into", () => {
    assert.equal(createProductSchema.safeParse({ ...base, earlyAccessAt: "2026-10-10T12:00:00.000Z" }).success, false);
  });

  // A wall-clock string with no timezone is ambiguous by hours; the form sends
  // a full instant and anything else is refused.
  it("refuses a date with no timezone", () => {
    assert.equal(createProductSchema.safeParse({ ...base, releaseAt: "2026-10-12T12:00" }).success, false);
  });
});

describe("vipCheckoutSchema", () => {
  it("accepts only the sold plans", () => {
    assert.ok(vipCheckoutSchema.safeParse({ plan: "MONTH" }).success);
    assert.ok(vipCheckoutSchema.safeParse({ plan: "YEAR" }).success);
    // COMP is admin-only; a customer must not be able to "buy" a free period.
    assert.ok(!vipCheckoutSchema.safeParse({ plan: "COMP" }).success);
    assert.ok(!vipCheckoutSchema.safeParse({}).success);
  });
});

describe("vipGrantSchema", () => {
  it("normalises the email", () => {
    const parsed = vipGrantSchema.parse({ email: "  Ama@Example.COM ", days: 30 });
    assert.equal(parsed.email, "ama@example.com");
  });

  it("accepts only the offered lengths", () => {
    for (const days of [7, 30, 90, 365]) assert.ok(vipGrantSchema.safeParse({ email: "a@b.co", days }).success);
    for (const days of [0, -30, 31, 3650, "30"]) assert.ok(!vipGrantSchema.safeParse({ email: "a@b.co", days }).success);
  });

  it("requires an email", () => {
    assert.ok(!vipGrantSchema.safeParse({ email: "not-an-email", days: 30 }).success);
  });
});
