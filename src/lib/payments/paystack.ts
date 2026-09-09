const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

type InitializeParams = {
  email: string;
  amount: number; // minor units (pesewas for GHS) — already the unit Paystack expects
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

export async function initializeTransaction(params: InitializeParams) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata
    })
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Paystack initialize failed");
  }

  return data.data as { authorization_url: string; access_code: string; reference: string };
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` }
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Paystack verify failed");
  }

  return data.data as {
    status: "success" | "failed" | "abandoned";
    amount: number;
    currency: string;
    reference: string;
    metadata: Record<string, unknown>;
  };
}
