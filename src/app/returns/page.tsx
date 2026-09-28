import type { Metadata } from "next";
import InfoPage, { InfoSection } from "@/components/InfoPage";
import { SITE } from "@/content/site";

export const metadata: Metadata = { title: "Returns" };

export default function ReturnsPage() {
  return (
    <InfoPage
      kicker="Help"
      title="Returns."
      intro={`If a piece is not right, you have ${SITE.returns.windowDays} days from delivery to send it back.`}
    >
      <InfoSection title="How it works">
        <p>
          Email {SITE.email} with your order reference and which pieces you are returning. We reply
          within {SITE.replyWindow} with where to send it. Once it arrives and has been checked, the
          refund goes back to the method you paid with.
        </p>
      </InfoSection>

      <InfoSection title="What we cannot take back">
        <ul className="space-y-2">
          {SITE.returns.exclusions.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden className="text-soft-300">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          Try things on, though. Nothing here counts against you for having been worn indoors to check
          the fit.
        </p>
      </InfoSection>

      <InfoSection title="If something arrived damaged">
        <p>
          That is on us, not on the returns window. Send a photograph to {SITE.email} and we will
          replace it or refund it, including the delivery you paid.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
