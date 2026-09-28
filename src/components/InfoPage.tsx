import Link from "next/link";

/**
 * The shell every customer-service page sits in.
 *
 * One component rather than five nearly-identical pages, so the measure, the
 * heading treatment and the "still need help" footer are decided once. These
 * pages are the least glamorous part of a storefront and the first place a
 * design system falls apart, because nobody is looking at them.
 */
export default function InfoPage({
  kicker,
  title,
  intro,
  children
}: {
  kicker: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl py-8 sm:py-16">
      <p className="type-micro text-soft-400">{kicker}</p>
      <h1 className="type-d2 mt-4 text-soft-800">{title}</h1>
      {intro && <p className="type-body mt-6">{intro}</p>}

      {/* Sections are separated by space and a hairline, never boxed. */}
      <div className="mt-12 space-y-10">{children}</div>

      <div className="mt-16 border-t border-soft-200 pt-8">
        <p className="type-micro text-soft-400">Still need a hand?</p>
        <Link href="/contact" className="btn-quiet mt-4">
          Contact us
        </Link>
      </div>
    </article>
  );
}

/** A titled block inside an InfoPage. */
export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="type-d3 text-soft-800">{title}</h2>
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
          className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-soft-200 py-3 last:border-0"
        >
          <dt className="text-[13px] text-soft-800">{term}</dt>
          <dd className="text-[13px] text-soft-500">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
