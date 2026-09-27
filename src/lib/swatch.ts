/**
 * Turn a variant's colour name into something paintable.
 *
 * Colourway swatches are the most recognisable thing on a SKIMS product grid:
 * a row of dots under each tile showing what a piece comes in, so a shopper can
 * see the range without opening anything.
 *
 * The awkward part is that `ProductVariant.color` is free text an admin typed —
 * "Black", "Heather Grey", "Espresso". There is no hex anywhere in the schema.
 * This module bridges that gap, and it is explicitly a bridge:
 *
 *   The right long-term fix is a `colorHex` column on ProductVariant, set from
 *   a picker in the admin form. Then a swatch shows the actual garment colour
 *   rather than this module's opinion of what "Sand" means, and a new colour
 *   needs no code change. Until then, an unmapped name still renders — as a
 *   neutral tone derived from the name itself — so adding one cannot produce an
 *   invisible or missing dot.
 */

/** Known garment colours. Values are the swatch, not the cloth — kept muted. */
const NAMED_COLOURS: Record<string, string> = {
  // Neutrals
  black: "#1a1a1a",
  white: "#f7f7f5",
  cream: "#f0e9dd",
  ivory: "#f4efe6",
  bone: "#e8e1d5",
  sand: "#d9c7ae",
  oat: "#ded3c0",
  beige: "#d8ccb8",
  taupe: "#b3a494",
  stone: "#c2bdb4",
  greige: "#b8b2a7",
  grey: "#9a9a9a",
  gray: "#9a9a9a",
  "heather grey": "#b5b5b3",
  "heather gray": "#b5b5b3",
  charcoal: "#3d3d3d",
  slate: "#5a6068",
  graphite: "#4a4a4a",
  onyx: "#141414",

  // Browns
  brown: "#6b4f3a",
  chocolate: "#4a332a",
  espresso: "#3b2b23",
  cocoa: "#5c4033",
  camel: "#b08d57",
  tan: "#c09a6b",
  rust: "#9c5a3c",
  clay: "#a9705a",

  // Greens
  green: "#4f6b4f",
  olive: "#6b6f4a",
  sage: "#9aa88f",
  forest: "#2f4434",
  moss: "#6a7350",

  // Blues
  blue: "#3f5a76",
  navy: "#252f42",
  denim: "#4a6178",
  sky: "#a8c0d4",
  indigo: "#35405e",

  // Warm
  red: "#8b3a3a",
  burgundy: "#5c2b32",
  wine: "#5a2a35",
  maroon: "#5f2a2f",
  orange: "#c26b3c",
  mustard: "#c49a3f",
  gold: "#c2a25a",

  // Soft
  pink: "#e0b4b4",
  blush: "#e6c9c2",
  rose: "#d9a6a6",
  lilac: "#b9aecb",
  purple: "#6b5a7b",
  lavender: "#c3b8d4"
};

/**
 * A stable neutral for a name we do not know, derived from the name itself so
 * the same colour always gets the same dot. Kept inside a narrow, desaturated
 * band: an unknown value should look like a plausible garment tone rather than
 * announce itself with something lurid.
 */
function fallbackColour(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const saturation = 12 + (hash % 10); // 12–21%
  const lightness = 55 + (hash % 18); // 55–72%
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

/** The CSS colour for a variant colour name. Never returns empty. */
export function swatchColour(name: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return "#c2bdb4";

  if (NAMED_COLOURS[key]) return NAMED_COLOURS[key];

  // "Light Heather Grey" should find "heather grey"; "Washed Black" should find
  // "black". Longest match wins so "heather grey" beats a bare "grey".
  const matches = Object.keys(NAMED_COLOURS)
    .filter((known) => key.includes(known))
    .sort((a, b) => b.length - a.length);

  if (matches.length > 0) return NAMED_COLOURS[matches[0]];

  return fallbackColour(key);
}

/** True for colours close enough to the page ground to need an outline. */
export function swatchNeedsBorder(name: string): boolean {
  const key = name.trim().toLowerCase();
  return ["white", "cream", "ivory", "bone", "oat"].some((pale) => key.includes(pale));
}

export type Colourway = {
  name: string;
  colour: string;
  needsBorder: boolean;
  /** True when the colour came from the guess rather than a stored value. */
  inferred: boolean;
};

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Whether a swatch is pale enough to vanish against the page ground.
 *
 * For a stored hex this is measured rather than assumed: relative luminance
 * using the sRGB coefficients, which weight green most and blue least because
 * that is how the eye responds. A name-matched colour falls back to the word
 * list, since there is nothing to measure.
 */
function hexNeedsBorder(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.82;
}

/**
 * The distinct colourways of a product, in the order its variants were defined.
 * A product made in three sizes of one colour has one swatch, not three.
 *
 * A variant's stored `colorHex` is used when it is present and well-formed.
 * Otherwise the colour NAME is matched against the table above, which is a
 * guess — accurate for "Black", less so for "Dusty Rose". `inferred` reports
 * which happened, so the admin can be shown where a real colour is still owed.
 */
export function colourwaysOf(
  variants: Array<{ color: string; colorHex?: string | null }>
): Colourway[] {
  const seen = new Set<string>();
  const out: Colourway[] = [];

  for (const variant of variants) {
    const key = variant.color.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const stored = variant.colorHex?.trim();
    const hasStored = Boolean(stored && HEX.test(stored));

    out.push({
      name: variant.color.trim(),
      colour: hasStored ? stored!.toLowerCase() : swatchColour(variant.color),
      needsBorder: hasStored
        ? hexNeedsBorder(stored!)
        : swatchNeedsBorder(variant.color),
      inferred: !hasStored
    });
  }

  return out;
}
