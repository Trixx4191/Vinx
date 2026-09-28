import type { Metadata } from "next";
import InfoPage, { InfoSection, InfoRows } from "@/components/InfoPage";
import { SITE } from "@/content/site";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <InfoPage
      kicker="Help"
      title="Contact."
      intro={`A real person reads these. We reply within ${SITE.replyWindow}.`}
    >
      <InfoSection title="Reach us">
        {/* Plain links rather than a contact form. A form needs somewhere to
            send to and something to stop spam reaching it; an address works
            today, keeps the customer's own copy of what they sent, and does not
            quietly fail. */}
        <InfoRows
          rows={[
            ["Email", SITE.email],
            ["Phone", SITE.phone],
            ["Based in", `${SITE.city}, ${SITE.country}`]
          ]}
        />
        <p className="pt-2">
          <a
            href={`mailto:${SITE.email}`}
            className="border-b border-soft-400 pb-0.5 text-soft-800 transition-colors hover:border-soft-800"
          >
            Write to us
          </a>
        </p>
      </InfoSection>

      <InfoSection title="About an order">
        <p>
          Include your order reference — it is in your confirmation email and on the order page under
          your account. With it we can answer in one reply instead of three.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
