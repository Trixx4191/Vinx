import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  orderConfirmationEmail,
  orderShippedEmail,
  vipReceiptEmail,
  vipExpiringEmail,
  vipDropOpenEmail,
  type OrderEmailData
} from "@/lib/email/templates";

const order: OrderEmailData = {
  orderId: "ckabc123def456",
  customerName: "Ama",
  items: [{ name: "Classic Tee", size: "M", color: "Black", quantity: 2, price: 12000 }],
  totalAmount: 24000,
  currency: "GHS",
  address: { fullName: "Ama Mensah", line1: "12 Oxford Street", city: "Accra", region: "Greater Accra" },
  siteUrl: "https://vinx.example"
};

describe("escapeHtml", () => {
  it("escapes every character that can change markup", () => {
    assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
    assert.equal(escapeHtml('"quoted"'), "&quot;quoted&quot;");
    assert.equal(escapeHtml("it's"), "it&#39;s");
  });

  // Ampersand has to go first, or escaping "<" produces "&lt;" and the later
  // ampersand pass turns it into "&amp;lt;" — text showing as literal entities.
  it("escapes ampersands without double-escaping the rest", () => {
    assert.equal(escapeHtml("Black & White"), "Black &amp; White");
    assert.equal(escapeHtml("<a & b>"), "&lt;a &amp; b&gt;");
  });

  it("leaves ordinary text alone", () => {
    assert.equal(escapeHtml("Cotton Fleece Hoodie"), "Cotton Fleece Hoodie");
  });
});

describe("orderConfirmationEmail", () => {
  it("includes the reference, items and total", () => {
    const email = orderConfirmationEmail(order);
    assert.ok(email.subject.includes("ckabc123"));
    assert.ok(email.html.includes("Classic Tee"));
    assert.ok(email.text.includes("Classic Tee"));
  });

  /**
   * Money in an email has to be right for the same reason it has to be right
   * on the page: 24000 pesewas is GHS 240.00, not GHS 24,000. A receipt that
   * misplaces a decimal is worse than no receipt.
   */
  it("renders money in major units", () => {
    const email = orderConfirmationEmail(order);
    assert.match(email.text, /240\.00/);
    assert.match(email.html, /240\.00/);
  });

  it("charges the snapshotted price, not a recomputed one", () => {
    const email = orderConfirmationEmail(order);
    // 2 x 12000 = 24000 -> 240.00 on the line itself, not only in the total.
    const line = email.text.split("\n").find((row) => row.includes("Classic Tee"));
    assert.ok(line, "the item line should be present");
    assert.match(line!, /240\.00/);
  });

  /**
   * Product names, colours and addresses are free text someone typed. Put into
   * HTML unescaped, a name containing markup lands in a customer's inbox.
   */
  it("escapes product names into the HTML body", () => {
    const email = orderConfirmationEmail({
      ...order,
      items: [{ name: "<img src=x onerror=alert(1)>", size: "M", color: "Black", quantity: 1, price: 100 }]
    });
    assert.ok(!email.html.includes("<img src=x"), "raw markup must not reach the body");
    assert.ok(email.html.includes("&lt;img"), "it should appear escaped instead");
  });

  it("escapes the shipping address too", () => {
    const email = orderConfirmationEmail({
      ...order,
      address: { ...order.address, line1: '12 "Oxford" <b>Street</b>' }
    });
    assert.ok(!email.html.includes("<b>Street</b>"));
    assert.ok(email.html.includes("&lt;b&gt;"));
  });

  it("greets without a name rather than saying 'Hello null'", () => {
    const email = orderConfirmationEmail({ ...order, customerName: null });
    assert.ok(!email.text.includes("null"));
    assert.ok(email.text.includes("Hello,"));
  });

  it("links to the order on the configured site", () => {
    const email = orderConfirmationEmail(order);
    assert.ok(email.html.includes("https://vinx.example/orders/ckabc123def456"));
  });

  // Every mail has both parts: some clients and most filters read the plain
  // text, and an HTML-only message is a deliverability problem.
  it("provides a plain text body as well as HTML", () => {
    const email = orderConfirmationEmail(order);
    assert.ok(email.text.length > 0);
    assert.ok(!email.text.includes("<"), "the text part should carry no markup");
  });

  it("handles an order with several lines", () => {
    const email = orderConfirmationEmail({
      ...order,
      items: [
        { name: "Tee", size: "M", color: "Black", quantity: 1, price: 12000 },
        { name: "Hoodie", size: "L", color: "Stone", quantity: 2, price: 38000 }
      ],
      totalAmount: 88000
    });
    assert.ok(email.text.includes("Tee"));
    assert.ok(email.text.includes("Hoodie"));
    assert.match(email.text, /880\.00/);
  });
});

describe("orderShippedEmail", () => {
  it("names the carrier and tracking number when present", () => {
    const email = orderShippedEmail({ ...order, carrier: "DHL", trackingNumber: "ABC123" });
    assert.ok(email.text.includes("DHL"));
    assert.ok(email.text.includes("ABC123"));
  });

  it("omits the tracking block entirely when there is none", () => {
    const email = orderShippedEmail({ ...order, carrier: null, trackingNumber: null });
    assert.ok(!email.text.includes("Tracking:"));
    assert.ok(!email.html.includes("Tracking"));
  });

  it("falls back to the order page when no tracking URL is set", () => {
    const email = orderShippedEmail({ ...order, trackingUrl: null });
    assert.ok(email.html.includes("https://vinx.example/orders/ckabc123def456"));
  });

  it("escapes a carrier name", () => {
    const email = orderShippedEmail({
      ...order,
      carrier: '<b>DHL</b>',
      trackingNumber: "X1"
    });
    assert.ok(!email.html.includes("<b>DHL</b>"));
  });
});

describe("vipReceiptEmail", () => {
  const base = {
    customerName: "Ama",
    planLabel: "1 month",
    amount: 15000,
    currency: "GHS",
    vipUntil: new Date("2026-11-01T12:00:00Z"),
    siteUrl: "https://vinx.example"
  };

  it("states the end date, the price and that it does not renew", () => {
    const email = vipReceiptEmail(base);
    assert.match(email.subject, /1 November 2026/);
    for (const part of [email.html, email.text]) {
      assert.match(part, /1 November 2026/);
      assert.match(part, /150/);
      assert.match(part, /does not renew automatically/);
      assert.match(part, /https:\/\/vinx\.example\/account#vip/);
    }
  });

  it("escapes a customer's name in the HTML", () => {
    const email = vipReceiptEmail({ ...base, customerName: "<img src=x onerror=alert(1)>" });
    assert.ok(!email.html.includes("<img src=x"));
    assert.match(email.html, /&lt;img/);
  });

  it("greets without a name when there is none", () => {
    assert.match(vipReceiptEmail({ ...base, customerName: null }).text, /^Hello,$/m);
  });
});

describe("vipExpiringEmail", () => {
  it("names the end date and says it does not renew", () => {
    const email = vipExpiringEmail({ customerName: "Ama", vipUntil: new Date("2026-10-04T12:00:00Z"), siteUrl: "https://vinx.example" });
    assert.match(email.subject, /4 October 2026/);
    for (const part of [email.html, email.text]) {
      assert.match(part, /does not renew automatically/);
      assert.match(part, /https:\/\/vinx\.example\/account#vip/);
    }
  });
});

describe("vipDropOpenEmail", () => {
  const product = { name: "Wool coat", slug: "wool-coat", price: 120000, currency: "GHS", releaseAt: new Date("2026-10-10T12:00:00Z") };

  it("links each product and gives the public date", () => {
    const email = vipDropOpenEmail({ customerName: null, products: [product], siteUrl: "https://vinx.example" });
    assert.equal(email.subject, "Early access: Wool coat");
    for (const part of [email.html, email.text]) {
      assert.match(part, /https:\/\/vinx\.example\/products\/wool-coat/);
      assert.match(part, /10 October 2026/);
      assert.match(part, /1,200/);
      assert.match(part, /Turn them off/i);
    }
  });

  it("summarises several products in the subject", () => {
    const email = vipDropOpenEmail({ customerName: null, products: [product, { ...product, name: "Scarf", slug: "scarf" }], siteUrl: "https://x.co" });
    assert.equal(email.subject, "Early access: 2 pieces");
  });

  it("escapes product names", () => {
    const email = vipDropOpenEmail({ customerName: null, products: [{ ...product, name: "<script>x</script>" }], siteUrl: "https://x.co" });
    assert.ok(!email.html.includes("<script>x"));
  });
});
