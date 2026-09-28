import type { Metadata } from "next";
import InfoPage, { InfoSection, InfoRows } from "@/components/InfoPage";
import { SITE, freeDeliveryLabel } from "@/content/site";

export const metadata: Metadata = { title: "Delivery" };

export default function DeliveryPage() {
  return (
    <InfoPage
      kicker="Help"
      title="Delivery."
      intro={`Orders leave ${SITE.city} once payment clears. You get a confirmation email with your order reference, and a second one with tracking as soon as the parcel is handed over.`}
    >
      <InfoSection title="Times and zones">
        <p>Working days, counted from dispatch rather than from when you ordered.</p>
        <InfoRows
          rows={[
            [SITE.city, SITE.delivery.accra],
            [`Elsewhere in ${SITE.country}`, SITE.delivery.ghana],
            ["International", SITE.delivery.international]
          ]}
        />
      </InfoSection>

      <InfoSection title="Cost">
        <p>
          Delivery within {SITE.city} is free on orders over {freeDeliveryLabel()}. Everything else is
          quoted at checkout before you pay, against the address you enter — there is nothing added
          afterwards.
        </p>
      </InfoSection>

      <InfoSection title="Tracking your order">
        <p>
          Every order has its own page under your account, showing where it is and every status it has
          moved through. You do not need to email us to find out.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
