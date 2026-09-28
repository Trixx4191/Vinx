import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authoriseCron } from "@/lib/cronAuth";
import { withSafeErrors } from "@/lib/safeErrors";
import { sendEmail } from "@/lib/email/send";
import { vipDropOpenEmail, vipExpiringEmail } from "@/lib/email/templates";
import { REMINDER_DAYS, advanceCursor, needsReminder, productsToAnnounce } from "@/lib/vipJobs";

/**
 * VIP emails that depend on the clock rather than on something a person did:
 *
 *   1. "Your VIP ends soon" — REMINDER_DAYS before a membership runs out.
 *   2. "Early access is open" — when a product's VIP window opens.
 *
 * Schedule it every 15 minutes, with the same secret as release-stock:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/vip
 *
 * HOW IT AVOIDS DOUBLE-SENDING
 *
 * Every email is preceded by a conditional UPDATE that claims it — "set this
 * member's cursor to X *where it is still Y*". If two runs overlap, only one
 * claim changes a row and only that run sends. The cost is at-most-once: if
 * the mail host fails after the claim, that email is skipped rather than
 * retried. For a reminder or an announcement that is the right way round — a
 * missed one is a shrug, a duplicate every 15 minutes is a reason to
 * unsubscribe.
 *
 * HOW IT STAYS INSIDE A FUNCTION TIMEOUT
 *
 * Each run handles at most BATCH members per job and reports whether more are
 * waiting. The next run picks up the rest, because the claim moved the ones
 * already done out of the query. A thousand members drain in a few runs.
 */

export const dynamic = "force-dynamic";

const BATCH = 50;

type OpenProduct = {
  name: string;
  slug: string;
  price: number;
  currency: string;
  earlyAccessAt: Date | null;
  releaseAt: Date | null;
  isPublished: boolean;
};

function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function sendReminders(now: Date) {
  const horizon = new Date(now.getTime() + REMINDER_DAYS * 24 * 60 * 60 * 1000);

  // Members ending inside the window who have not been reminded about this
  // end date. "Reminded about an end date already in the past" stands in for
  // vipReminderFor ≠ vipUntil, which a WHERE clause cannot compare across two
  // columns: a member who renewed was reminded about their OLD end, which is
  // behind `now` by the time the new end comes within the window (every period
  // is at least a week, the window is REMINDER_DAYS). Excluding already-sent
  // rows in the query matters — filtering them afterwards would let a page of
  // already-reminded members starve everyone behind them.
  const due = (
    await prisma.user.findMany({
      where: {
        vipUntil: { gt: now, lte: horizon },
        OR: [{ vipReminderFor: null }, { vipReminderFor: { lt: now } }]
      },
      select: { id: true, email: true, name: true, vipUntil: true, vipReminderFor: true },
      orderBy: { vipUntil: "asc" },
      take: BATCH
    })
  ).filter((user) => needsReminder(user.vipUntil, user.vipReminderFor, now));

  let sent = 0;
  for (const user of due) {
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, vipUntil: user.vipUntil, vipReminderFor: user.vipReminderFor },
      data: { vipReminderFor: user.vipUntil }
    });
    if (claimed.count === 0) continue;

    const result = await sendEmail({
      to: user.email,
      ...vipExpiringEmail({ customerName: user.name, vipUntil: user.vipUntil!, siteUrl: siteUrl() })
    });
    if (result.sent) sent += 1;
  }

  return { due: due.length, sent, more: due.length === BATCH };
}

async function sendDropAnnouncements(now: Date) {
  // Every product currently inside its VIP window. Usually a handful.
  const open: OpenProduct[] = await prisma.product.findMany({
    where: { isPublished: true, earlyAccessAt: { lte: now }, releaseAt: { gt: now } },
    select: { name: true, slug: true, price: true, currency: true, earlyAccessAt: true, releaseAt: true, isPublished: true },
    orderBy: { earlyAccessAt: "asc" }
  });
  if (open.length === 0) return { members: 0, sent: 0, more: false };

  const newest = advanceCursor(null, open)!;

  // Members who have not yet heard about the newest open window.
  const members = await prisma.user.findMany({
    where: {
      vipUntil: { gt: now },
      vipDropEmails: true,
      OR: [{ vipDropNoticedTo: null }, { vipDropNoticedTo: { lt: newest } }]
    },
    select: { id: true, email: true, name: true, vipDropNoticedTo: true },
    take: BATCH
  });

  let sent = 0;
  for (const member of members) {
    const news = productsToAnnounce(open, member.vipDropNoticedTo, now);
    const cursor = advanceCursor(member.vipDropNoticedTo, open);

    const claimed = await prisma.user.updateMany({
      where: { id: member.id, vipDropNoticedTo: member.vipDropNoticedTo },
      data: { vipDropNoticedTo: cursor }
    });
    if (claimed.count === 0 || news.length === 0) continue;

    const result = await sendEmail({
      to: member.email,
      ...vipDropOpenEmail({
        customerName: member.name,
        products: news.map((product) => ({
          name: product.name,
          slug: product.slug,
          price: product.price,
          currency: product.currency,
          releaseAt: product.releaseAt!
        })),
        siteUrl: siteUrl()
      })
    });
    if (result.sent) sent += 1;
  }

  return { members: members.length, sent, more: members.length === BATCH };
}

async function handle(req: NextRequest) {
  if (!authoriseCron(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return withSafeErrors(async () => {
    const now = new Date();
    const reminders = await sendReminders(now);
    const drops = await sendDropAnnouncements(now);
    console.info(
      `[cron] vip: ${reminders.sent}/${reminders.due} reminder(s), ${drops.sent}/${drops.members} drop notice(s)`
    );
    return NextResponse.json({ ok: true, reminders, drops });
  });
}

export const GET = handle;
export const POST = handle;
