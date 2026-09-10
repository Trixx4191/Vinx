import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex w-full flex-col items-center pt-12 text-center sm:pt-20">
        <p className="mb-3 text-sm font-medium tracking-wide text-soft-500 animate-fade-in">
          New season
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-soft-700 sm:text-5xl md:text-6xl animate-slide-up">
          Soft layers.
          <br />
          <span className="text-soft-500">Considered essentials.</span>
        </h1>
        <p className="mt-5 max-w-md text-base text-soft-500 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          Textured knits, quiet graphics, and outdoor-ready pieces designed for everyday movement.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Link href="/products" className="btn-primary">
            Shop collection
          </Link>
          <Link href="/products" className="btn-secondary">
            Explore looks
          </Link>
        </div>
      </section>

      {/* Soft feature strip */}
      <section className="mt-24 w-full">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Texture first", desc: "Heavy knits, fleece, and quilted surfaces that feel lived-in from day one." },
            { title: "Quiet detail", desc: "Subtle prints and washed tones that reward a second look." },
            { title: "Ready to move", desc: "Layerable cuts for city streets and open air." }
          ].map((item, i) => (
            <div
              key={item.title}
              className="card-soft rounded-3xl p-6 text-left"
              style={{ animationDelay: `${0.15 * i}s` }}
            >
              <h3 className="text-sm font-semibold text-soft-700">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-soft-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mt-20 w-full">
        <div className="glass-strong relative overflow-hidden rounded-4xl px-8 py-16 text-center sm:px-12">
          <div className="absolute inset-0 bg-gradient-to-br from-soft-100/80 via-transparent to-soft-200/40 pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl font-semibold tracking-tight text-soft-700 sm:text-3xl">
              Built to be worn
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-soft-500">
              Every piece is selected for feel, weight, and how it sits in a rotation.
            </p>
            <Link href="/products" className="btn-primary mt-8 inline-flex">
              View all products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
