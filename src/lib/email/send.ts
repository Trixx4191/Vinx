import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email over SMTP.
 *
 * The single most important property of this module: **sending email must
 * never break the thing that triggered it.** An order is marked paid after a
 * provider confirms the money moved. If the confirmation email then fails —
 * the SMTP host is down, the credentials expired, the mailbox is full — the
 * payment has still happened and the order must still be paid. Throwing here
 * would roll a successful transaction back into an error response and, worse,
 * could have the provider retry a webhook against an order that is already
 * settled.
 *
 * So every function here resolves. Failures are logged and reported in the
 * return value for a caller that wants to know, and ignored by callers that
 * do not.
 */

export type EmailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "failed"; detail?: string };

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

// One transport per process. Nodemailer pools connections, and building a new
// transport per message would open a new SMTP conversation every time.
let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!isConfigured()) return null;
  if (cached) return cached;

  const port = Number(process.env.SMTP_PORT ?? 587);

  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 is implicit TLS ("smtps"); 587 and 25 start in the clear and
    // upgrade with STARTTLS. Getting this backwards is the most common reason
    // an otherwise correct SMTP config silently refuses to connect.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  return cached;
}

/** Only exported so tests can reset between cases. */
export function resetTransportCache() {
  cached = null;
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  const transport = getTransport();

  if (!transport) {
    // Not an error. A shop that has not set up email yet should still take
    // orders; it just does not send receipts.
    console.info(`[email] skipped "${message.subject}" — SMTP is not configured`);
    return { sent: false, reason: "not-configured" };
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;

  try {
    await transport.sendMail({ from, ...message });
    return { sent: true };
  } catch (error) {
    // Logged with enough detail to debug, but never rethrown.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[email] failed to send "${message.subject}" to ${message.to}: ${detail}`);
    return { sent: false, reason: "failed", detail };
  }
}
