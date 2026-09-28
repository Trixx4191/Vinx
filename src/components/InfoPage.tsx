/**
 * The shell every customer-service page sits in.
 *
 * One component rather than five nearly-identical pages, so the measure and the
 * heading treatment are decided once. A title, a paragraph, a few rows of
 * facts. The "still need a hand? contact us" block that used to close every
 * page is gone — Contact is in the footer and the menu on every page already.
 */
export default function InfoPage({
  title,
  intro,
  children
}: {
  /** Kept for call-site compatibility; no longer rendered. */
  kicker?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-lg pb-10 pt-16 sm:pt-24">
      {/* Titles are written with a trailing full stop at the call sites
          ("Delivery."), which suited a display headline and reads as a typo in
          small capitals. Stripped here rather than at five call sites. */}
      <h1>{title.replace(/\.$/, "")}</h1>
      {intro && <p className="type-body mt-6">{intro}</p>}
      <div className="mt-14 space-y-12">{children}</div>
    </article>
  );
}

/** A titled block inside an InfoPage. */
export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      <div className="type-body mt-3 space-y-3">{children}</div>
    </section>
  );
}

/**
 * A key/value row, for the tables these pages are mostly made of — delivery
 * zones against times, measurements against sizes.
 *
 * A definition list rather than a `<table>`: these are pairs, not a grid, and a
 * table would need a header row that says nothing.
 */
export function InfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="mt-4">
      {rows.map(([term, value]) => (
        <div
          key={term}
          className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2"
        >
          <dt className="type-label">{term}</dt>
          <dd className="type-label text-[var(--muted)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
