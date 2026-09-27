import type { ReactNode } from "react";
import { EXPECTED_PATH, TERMINAL_FAILURES, statusLabel as label } from "@/lib/orderStatus";

type StatusEvent = {
  id: string;
  status: string;
  note: string | null;
  createdAt: Date;
};

// EXPECTED_PATH is the happy path an order walks. Statuses outside it
// (FAILED, CANCELLED, REFUNDED) are ends rather than steps, so an order that
// reaches one shows only what actually happened — projecting "Shipped" and
// "Delivered" ahead of a cancelled order would be worse than showing nothing.

/**
 * The order's progress as a vertical timeline.
 *
 * Events that have happened are rendered from `statusHistory` with their real
 * timestamps. When the order is still moving along the expected path, the
 * remaining steps are shown dimmed and undated, so a customer can see what is
 * coming without being told it has already occurred.
 */
export default function OrderTimeline({
  events,
  currentStatus
}: {
  events: StatusEvent[];
  currentStatus: string;
}) {
  const seen = new Set(events.map((event) => event.status));
  const hasFailed = TERMINAL_FAILURES.has(currentStatus);

  const upcoming = hasFailed
    ? []
    : EXPECTED_PATH.filter((status) => !seen.has(status));

  return (
    <ol className="relative">
      {events.map((event, index) => (
        <Row
          key={event.id}
          done
          failed={TERMINAL_FAILURES.has(event.status)}
          last={index === events.length - 1 && upcoming.length === 0}
          title={label(event.status)}
          meta={new Date(event.createdAt).toLocaleString()}
          note={event.note}
        />
      ))}

      {upcoming.map((status, index) => (
        <Row
          key={status}
          done={false}
          last={index === upcoming.length - 1}
          title={label(status)}
          meta="Pending"
        />
      ))}
    </ol>
  );
}

function Row({
  done,
  failed = false,
  last,
  title,
  meta,
  note
}: {
  done: boolean;
  failed?: boolean;
  last: boolean;
  title: string;
  meta: string;
  note?: string | null;
}): ReactNode {
  return (
    <li className="relative flex gap-5 pb-8 last:pb-0">
      {/* Connector. Omitted on the final row so the line stops at the last
          marker rather than trailing into empty space. */}
      {!last && (
        <span
          aria-hidden
          className={`absolute left-[3px] top-3 h-full w-px ${done ? "bg-soft-300" : "bg-soft-200"}`}
        />
      )}

      {/* Square markers, not dots. The global stylesheet forces every rounded-*
          utility to 0 to keep the editorial system sharp, so `rounded-full`
          here would be a no-op that reads as a circle in the markup and
          renders as a square on screen. Squares are the intent. */}
      <span
        aria-hidden
        className={`relative mt-1.5 h-[7px] w-[7px] shrink-0 ${
          failed ? "bg-vienna-red" : done ? "bg-soft-800" : "border border-soft-300 bg-white"
        }`}
      />

      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? "text-soft-800" : "text-soft-400"}`}>{title}</p>
        <p className="type-micro mt-1.5 text-soft-400">{meta}</p>
        {note && <p className="mt-2 text-sm text-soft-500">{note}</p>}
      </div>
    </li>
  );
}
