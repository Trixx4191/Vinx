import type { Metadata } from "next";
import InfoPage, { InfoSection, InfoRows } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Size guide" };

/**
 * Measurements are in centimetres and describe the BODY, not the garment.
 *
 * Garment measurements vary by cut — a boxy hoodie and a fitted tee in the same
 * nominal size are different objects — so a single site-wide table can only
 * honestly describe the body it is meant to fit. Per-piece measurements belong
 * on the product, where the model shot and the size worn already sit.
 */
const CHEST: Array<[string, string]> = [
  ["XS", "84 – 89 cm"],
  ["S", "89 – 94 cm"],
  ["M", "94 – 102 cm"],
  ["L", "102 – 110 cm"],
  ["XL", "110 – 118 cm"],
  ["XXL", "118 – 127 cm"]
];

const WAIST: Array<[string, string]> = [
  ["XS", "68 – 73 cm"],
  ["S", "73 – 78 cm"],
  ["M", "78 – 86 cm"],
  ["L", "86 – 94 cm"],
  ["XL", "94 – 102 cm"],
  ["XXL", "102 – 111 cm"]
];

export default function SizeGuidePage() {
  return (
    <InfoPage
      kicker="Help"
      title="Size guide."
      intro="Measure yourself, not a garment you already own — a favourite shirt has usually stretched, and matching it is how people end up a size out."
    >
      <InfoSection title="Chest">
        <p>Around the fullest part, tape level, arms down.</p>
        <InfoRows rows={CHEST} />
      </InfoSection>

      <InfoSection title="Waist">
        <p>At your natural waist, which sits above the hip bone rather than at the belt line.</p>
        <InfoRows rows={WAIST} />
      </InfoSection>

      <InfoSection title="Between two sizes">
        <p>
          Size up for anything knitted or hooded, where the cut is meant to sit away from the body, and
          stay down for tees and shirts. Where a piece has a model shot, the caption says how tall the
          model is and which size they have on — that is usually a faster answer than a table.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
