import type { Metadata } from "next";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { SITE } from "@/content/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <InfoPage kicker="Vinx" title="About." intro={SITE.tagline}>
      <InfoSection title="What we make">
        <p>
          A short line of essentials, cut once and properly, from cloth chosen to age rather than fade.
          Fewer pieces, released when they are right, in colours that sit beside each other.
        </p>
      </InfoSection>

      <InfoSection title="Where we are">
        <p>
          {SITE.city}, {SITE.country}. Orders ship from here, priced in {SITE.currency}, payable by
          mobile money as readily as by card.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
