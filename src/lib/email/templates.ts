import { formatPrice } from "@/types/product";

/**
 * Email bodies, as pure functions.
 *
 * Kept free of any I/O so they can be tested directly — an email template is
 * exactly the kind of code that is never looked at again until a customer
 * forwards you a broken one.
 */

export type EmailMessage = { subject: string; html: string; text: string };

export type OrderEmailData = {
  orderId: string;
  customerName: string | null;
  items: Array<{ name: string; size: string; color: string; quantity: number; price: number }>;
  totalAmount: number;
  currency: string;
  address: { fullName: string; line1: string; city: string; region: string };
  siteUrl: string;
};

/**
 * Escape text before it goes into HTML.
 *
 * Product names, colours and addresses are all free text someone typed into an
 * admin form or a checkout field. Interpolated raw, a name containing `<` would
 * at best break the layout of every receipt and at worst carry markup into a
 * customer's inbox. Mail clients strip most script, which makes this easy to
 * get wrong and never notice.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const shell = (bodyHtml: string) => `<!doctype html>
<html><body style="margin:0;padding:32px;background:#faf9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#121010;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;padding:32px;">
<p style="margin:0 0 28px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#79736c;">Vinx</p>
${bodyHtml}
</div>
</body></html>`;

function itemLines(items: OrderEmailData["items"], currency: string) {
  return items
    .map((item) => {
      const label = `${item.name} — ${item.size}, ${item.color} × ${item.quantity}`;
      const amount = formatPrice(item.price * item.quantity, currency);
      return { label, amount };
    });
}

export function orderConfirmationEmail(data: OrderEmailData): EmailMessage {
  const lines = itemLines(data.items, data.currency);
  const total = formatPrice(data.totalAmount, data.currency);
  const reference = data.orderId.slice(0, 8);
  const greeting = data.customerName ? `Hello ${data.customerName},` : "Hello,";

  const rowsHtml = lines
    .map(
      (line) =>
        `<tr><td style="padding:8px 0;font-size:14px;color:#4a453f;">${escapeHtml(line.label)}</td>` +
        `<td align="right" style="padding:8px 0;font-size:14px;white-space:nowrap;">${escapeHtml(line.amount)}</td></tr>`
    )
    .join("");

  const html = shell(`
<h1 style="margin:0 0 16px;font-size:22px;font-weight:400;">Order confirmed</h1>
<p style="margin:0 0 8px;font-size:14px;color:#4a453f;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;font-size:14px;color:#4a453f;">We have your payment and your order is being prepared.</p>
<p style="margin:0 0 24px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#79736c;">Reference ${escapeHtml(reference)}</p>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e3df;">${rowsHtml}</table>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e3df;margin-top:8px;">
<tr><td style="padding:12px 0;font-size:14px;">Total</td><td align="right" style="padding:12px 0;font-size:14px;">${escapeHtml(total)}</td></tr>
</table>
<p style="margin:24px 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#79736c;">Shipping to</p>
<p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4a453f;">
${escapeHtml(data.address.fullName)}<br>${escapeHtml(data.address.line1)}<br>${escapeHtml(data.address.city)}, ${escapeHtml(data.address.region)}
</p>
<a href="${escapeHtml(data.siteUrl)}/orders/${escapeHtml(data.orderId)}" style="display:inline-block;background:#121010;color:#ffffff;padding:12px 24px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">View your order</a>
`);

  const text = [
    "Order confirmed",
    "",
    greeting,
    "We have your payment and your order is being prepared.",
    "",
    `Reference ${reference}`,
    "",
    ...lines.map((line) => `${line.label}  ${line.amount}`),
    "",
    `Total  ${total}`,
    "",
    "Shipping to:",
    data.address.fullName,
    data.address.line1,
    `${data.address.city}, ${data.address.region}`,
    "",
    `${data.siteUrl}/orders/${data.orderId}`
  ].join("\n");

  return { subject: `Your Vinx order is confirmed (${reference})`, html, text };
}

export function orderShippedEmail(
  data: OrderEmailData & { carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null }
): EmailMessage {
  const reference = data.orderId.slice(0, 8);
  const greeting = data.customerName ? `Hello ${data.customerName},` : "Hello,";

  const trackingHtml = data.trackingNumber
    ? `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#79736c;">Tracking</p>
<p style="margin:0 0 28px;font-size:14px;color:#4a453f;">${escapeHtml(data.carrier ?? "")} ${escapeHtml(data.trackingNumber)}</p>`
    : "";

  const html = shell(`
<h1 style="margin:0 0 16px;font-size:22px;font-weight:400;">Your order is on its way</h1>
<p style="margin:0 0 8px;font-size:14px;color:#4a453f;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;font-size:14px;color:#4a453f;">Order ${escapeHtml(reference)} has shipped.</p>
${trackingHtml}
<a href="${escapeHtml(data.trackingUrl || `${data.siteUrl}/orders/${data.orderId}`)}" style="display:inline-block;background:#121010;color:#ffffff;padding:12px 24px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">Track your order</a>
`);

  const text = [
    "Your order is on its way",
    "",
    greeting,
    `Order ${reference} has shipped.`,
    ...(data.trackingNumber ? ["", `Tracking: ${data.carrier ?? ""} ${data.trackingNumber}`.trim()] : []),
    "",
    data.trackingUrl || `${data.siteUrl}/orders/${data.orderId}`
  ].join("\n");

  return { subject: `Your Vinx order has shipped (${reference})`, html, text };
}

export type VipReceiptData = {
  customerName: string | null;
  planLabel: string;
  amount: number;
  currency: string;
  /** When the membership now runs until — after this payment is applied. */
  vipUntil: Date;
  siteUrl: string;
};

/**
 * Receipt for a VIP payment. States the one fact a member needs — when their
 * access now runs until — and, because nothing renews automatically, says so:
 * a membership that quietly lapses should never surprise anyone.
 */
export function vipReceiptEmail(data: VipReceiptData): EmailMessage {
  const greeting = data.customerName ? `Hello ${data.customerName},` : "Hello,";
  const paid = formatPrice(data.amount, data.currency);
  const until = data.vipUntil.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const html = shell(`
<h1 style="margin:0 0 16px;font-size:22px;font-weight:400;">You are VIP</h1>
<p style="margin:0 0 8px;font-size:14px;color:#4a453f;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;font-size:14px;color:#4a453f;">You have early access to every Vinx drop until <strong>${escapeHtml(until)}</strong>.</p>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e3df;">
<tr><td style="padding:12px 0;font-size:14px;">VIP · ${escapeHtml(data.planLabel)}</td><td align="right" style="padding:12px 0;font-size:14px;">${escapeHtml(paid)}</td></tr>
</table>
<p style="margin:16px 0 28px;font-size:12px;color:#79736c;">This does not renew automatically. Buy another period any time from your account — it is added on to the end.</p>
<a href="${escapeHtml(data.siteUrl)}/account#vip" style="display:inline-block;background:#121010;color:#ffffff;padding:12px 24px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">Your account</a>
`);

  const text = [
    "You are VIP",
    "",
    greeting,
    `You have early access to every Vinx drop until ${until}.`,
    "",
    `VIP · ${data.planLabel}  ${paid}`,
    "",
    "This does not renew automatically. Buy another period any time from your account — it is added on to the end.",
    "",
    `${data.siteUrl}/account#vip`
  ].join("\n");

  return { subject: `Vinx VIP — until ${until}`, html, text };
}

const longDate = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const button = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:#121010;color:#ffffff;padding:12px 24px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">${escapeHtml(label)}</a>`;

export type VipExpiringData = {
  customerName: string | null;
  vipUntil: Date;
  siteUrl: string;
};

/**
 * "Your VIP ends soon." Sent once per end date. Nothing renews by itself, so
 * this is the only warning a member gets before early access stops.
 */
export function vipExpiringEmail(data: VipExpiringData): EmailMessage {
  const greeting = data.customerName ? `Hello ${data.customerName},` : "Hello,";
  const until = longDate(data.vipUntil);
  const link = `${data.siteUrl}/account#vip`;

  const html = shell(`
<h1 style="margin:0 0 16px;font-size:22px;font-weight:400;">Your VIP ends ${escapeHtml(until)}</h1>
<p style="margin:0 0 8px;font-size:14px;color:#4a453f;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 28px;font-size:14px;color:#4a453f;">Early access to drops stops then. VIP does not renew automatically — add another month or year from your account and it carries on from ${escapeHtml(until)}, so nothing is lost by renewing early.</p>
${button(link, "Renew")}
`);

  const text = [
    `Your VIP ends ${until}`,
    "",
    greeting,
    `Early access to drops stops then. VIP does not renew automatically — add another month or year from your account and it carries on from ${until}, so nothing is lost by renewing early.`,
    "",
    link
  ].join("\n");

  return { subject: `Your Vinx VIP ends ${until}`, html, text };
}

export type VipDropOpenData = {
  customerName: string | null;
  products: Array<{ name: string; slug: string; price: number; currency: string; releaseAt: Date }>;
  siteUrl: string;
};

/**
 * "Early access is open." One email per run per member, listing every window
 * that opened since they were last told — never one email per product.
 */
export function vipDropOpenEmail(data: VipDropOpenData): EmailMessage {
  const greeting = data.customerName ? `Hello ${data.customerName},` : "Hello,";
  const rows = data.products.map((product) => ({
    name: product.name,
    url: `${data.siteUrl}/products/${encodeURIComponent(product.slug)}`,
    price: formatPrice(product.price, product.currency),
    opens: longDate(product.releaseAt)
  }));
  const settings = `${data.siteUrl}/account#vip`;
  const subject =
    rows.length === 1 ? `Early access: ${rows[0].name}` : `Early access: ${rows.length} pieces`;

  const html = shell(`
<h1 style="margin:0 0 16px;font-size:22px;font-weight:400;">Early access is open</h1>
<p style="margin:0 0 8px;font-size:14px;color:#4a453f;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 20px;font-size:14px;color:#4a453f;">As VIP you can buy ${rows.length === 1 ? "this" : "these"} now, before ${rows.length === 1 ? "it opens" : "they open"} to everyone.</p>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e3df;">
${rows
  .map(
    (row) =>
      `<tr><td style="padding:12px 0;font-size:14px;border-bottom:1px solid #e7e3df;"><a href="${escapeHtml(row.url)}" style="color:#121010;">${escapeHtml(row.name)}</a><br><span style="font-size:12px;color:#79736c;">Everyone from ${escapeHtml(row.opens)}</span></td><td align="right" style="padding:12px 0;font-size:14px;border-bottom:1px solid #e7e3df;">${escapeHtml(row.price)}</td></tr>`
  )
  .join("\n")}
</table>
<p style="margin:24px 0 0;font-size:12px;color:#79736c;">You get these because you are VIP. <a href="${escapeHtml(settings)}" style="color:#79736c;">Turn them off</a>.</p>
`);

  const text = [
    "Early access is open",
    "",
    greeting,
    `As VIP you can buy ${rows.length === 1 ? "this" : "these"} now, before ${rows.length === 1 ? "it opens" : "they open"} to everyone.`,
    "",
    ...rows.flatMap((row) => [`${row.name}  ${row.price}`, `  Everyone from ${row.opens}`, `  ${row.url}`, ""]),
    `You get these because you are VIP. Turn them off: ${settings}`
  ].join("\n");

  return { subject, html, text };
}
