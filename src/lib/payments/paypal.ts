const BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal is not configured");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "PayPal auth failed");
  return data.access_token as string;
}

// PayPal wants a decimal string amount ("120.00"), not minor units — this
// is the one provider where we convert. The authoritative source is still
// our own minor-unit integer; this conversion happens once, right here.
function toDecimalAmount(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

export async function createOrder(orderId: string, amountMinorUnits: number, currency: string, returnUrl: string, cancelUrl: string) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          amount: { currency_code: currency, value: toDecimalAmount(amountMinorUnits) }
        }
      ],
      application_context: { return_url: returnUrl, cancel_url: cancelUrl }
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "PayPal order creation failed");

  const approveLink = data.links?.find((l: { rel: string }) => l.rel === "approve")?.href;
  return { paypalOrderId: data.id as string, approveLink: approveLink as string };
}

export async function captureOrder(paypalOrderId: string) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "PayPal capture failed");

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status as string, // "COMPLETED" on success
    referenceId: data.purchase_units?.[0]?.reference_id as string,
    amountMinorUnits: capture ? Math.round(parseFloat(capture.amount.value) * 100) : 0,
    currency: capture?.amount?.currency_code as string,
    captureId: capture?.id as string
  };
}
