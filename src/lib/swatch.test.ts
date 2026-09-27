import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { swatchColour, swatchNeedsBorder, colourwaysOf } from "@/lib/swatch";

const HEX_OR_HSL = /^(#[0-9a-f]{6}|hsl\(\d+ \d+% \d+%\))$/i;

describe("swatchColour", () => {
  it("maps the colours the catalog actually uses", () => {
    for (const name of ["Black", "White", "Stone", "Olive", "Sand", "Charcoal", "Cream"]) {
      assert.match(swatchColour(name), HEX_OR_HSL, `${name} should resolve to a paintable colour`);
    }
  });

  it("ignores case and surrounding whitespace", () => {
    assert.equal(swatchColour("Black"), swatchColour("  black  "));
    assert.equal(swatchColour("OLIVE"), swatchColour("olive"));
  });

  // Admins type what they see on the garment label, not a controlled value.
  it("finds the base colour inside a compound name", () => {
    assert.equal(swatchColour("Washed Black"), swatchColour("black"));
    assert.equal(swatchColour("Light Sand"), swatchColour("sand"));
  });

  // "Light Heather Grey" contains both "heather grey" and "grey"; the more
  // specific match has to win or every heather reads as plain grey.
  it("prefers the longest match when names overlap", () => {
    assert.equal(swatchColour("Light Heather Grey"), swatchColour("heather grey"));
    assert.notEqual(swatchColour("Light Heather Grey"), swatchColour("grey"));
  });

  /**
   * The point of the fallback: a colour nobody has mapped still has to render.
   * Silently dropping the dot would make a product look like it comes in fewer
   * colours than it does.
   */
  it("still returns a colour for a name it has never seen", () => {
    assert.match(swatchColour("Persimmon Haze"), HEX_OR_HSL);
    assert.match(swatchColour("zzzz"), HEX_OR_HSL);
  });

  it("gives an unknown name the same colour every time", () => {
    assert.equal(swatchColour("Persimmon Haze"), swatchColour("Persimmon Haze"));
    assert.notEqual(swatchColour("Persimmon Haze"), swatchColour("Cobalt Dusk"));
  });

  it("returns a neutral rather than throwing on an empty name", () => {
    assert.match(swatchColour(""), HEX_OR_HSL);
    assert.match(swatchColour("   "), HEX_OR_HSL);
  });

  it("emits no malformed values across the whole map", () => {
    const names = [
      "black", "white", "cream", "sand", "stone", "charcoal", "camel", "tan",
      "olive", "sage", "navy", "denim", "burgundy", "blush", "lilac", "mustard"
    ];
    for (const name of names) {
      assert.match(swatchColour(name), HEX_OR_HSL, `${name} produced a malformed colour`);
    }
  });
});

describe("swatchNeedsBorder", () => {
  // A cream dot on a near-cream page ground is invisible without an outline.
  it("outlines colours that would disappear against the page", () => {
    for (const pale of ["White", "Cream", "Ivory", "Bone", "Oat"]) {
      assert.equal(swatchNeedsBorder(pale), true, `${pale} should be outlined`);
    }
  });

  it("leaves colours with enough contrast alone", () => {
    for (const name of ["Black", "Olive", "Navy", "Charcoal"]) {
      assert.equal(swatchNeedsBorder(name), false, `${name} should not be outlined`);
    }
  });
});

describe("colourwaysOf", () => {
  // A piece in three sizes of one colour is one colourway, not three dots.
  it("collapses sizes down to distinct colours", () => {
    const colourways = colourwaysOf([
      { color: "Black" },
      { color: "Black" },
      { color: "Stone" }
    ]);
    assert.equal(colourways.length, 2);
    assert.deepEqual(colourways.map((c) => c.name), ["Black", "Stone"]);
  });

  it("treats differently-cased spellings as the same colourway", () => {
    assert.equal(colourwaysOf([{ color: "Black" }, { color: "black" }]).length, 1);
  });

  it("keeps the order variants were defined in", () => {
    const colourways = colourwaysOf([{ color: "Olive" }, { color: "Black" }, { color: "Sand" }]);
    assert.deepEqual(colourways.map((c) => c.name), ["Olive", "Black", "Sand"]);
  });

  it("skips blank colours rather than rendering an empty dot", () => {
    assert.equal(colourwaysOf([{ color: "" }, { color: "  " }, { color: "Black" }]).length, 1);
  });

  it("returns nothing for a product with no variants", () => {
    assert.deepEqual(colourwaysOf([]), []);
  });

  it("gives every colourway a paintable colour", () => {
    for (const colourway of colourwaysOf([{ color: "Black" }, { color: "Unmapped Shade" }])) {
      assert.match(colourway.colour, HEX_OR_HSL);
      assert.equal(typeof colourway.needsBorder, "boolean");
    }
  });
});

describe("colourwaysOf — stored hex", () => {
  /**
   * The whole point of the colorHex column: an admin who has set the real
   * garment colour must beat the name-matching guess. "Sand" resolving to some
   * table's idea of sand is a stopgap; #d4b483 is the actual cloth.
   */
  it("prefers a stored hex over the guess from the name", () => {
    const [colourway] = colourwaysOf([{ color: "Sand", colorHex: "#d4b483" }]);
    assert.equal(colourway.colour, "#d4b483");
    assert.notEqual(colourway.colour, swatchColour("Sand"));
  });

  it("marks stored colours as exact and guessed ones as inferred", () => {
    const [stored, guessed] = colourwaysOf([
      { color: "Sand", colorHex: "#d4b483" },
      { color: "Olive" }
    ]);
    assert.equal(stored.inferred, false);
    assert.equal(guessed.inferred, true);
  });

  it("normalises stored hex to lower case so two spellings render identically", () => {
    const [upper] = colourwaysOf([{ color: "Sand", colorHex: "#D4B483" }]);
    assert.equal(upper.colour, "#d4b483");
  });

  // A malformed value in the column must not paint an invalid style attribute.
  it("falls back to the guess when the stored value is malformed", () => {
    for (const bad of ["", "   ", "red", "#ggg", "#12345", "rgb(1,2,3)", null, undefined]) {
      const [colourway] = colourwaysOf([{ color: "Olive", colorHex: bad as string | null }]);
      assert.equal(colourway.colour, swatchColour("Olive"), `${JSON.stringify(bad)} should be ignored`);
      assert.equal(colourway.inferred, true);
    }
  });

  // Border is measured from luminance for stored colours rather than guessed
  // from the name, so a pale custom shade still gets an outline.
  it("outlines a pale stored colour even when its name is not in the word list", () => {
    const [pale] = colourwaysOf([{ color: "Morning Mist", colorHex: "#fafaf8" }]);
    assert.equal(pale.needsBorder, true);

    const [dark] = colourwaysOf([{ color: "Morning Mist", colorHex: "#2b2b2b" }]);
    assert.equal(dark.needsBorder, false);
  });
});
