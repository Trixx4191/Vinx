import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutSchema,
  createProductSchema,
  createStaffSchema,
  updateStaffRoleSchema,
  passwordSchema
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
