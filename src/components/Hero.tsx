import Image from "next/image";

/**
 * The homepage hero: one image, centred, on white, with nothing around it.
 *
 * It fills the first screen beneath the header — whose centred VINX wordmark
 * is the label above it, so there is no second one — and it is contained, not
 * cropped: the whole image is always visible, floating like a product does.
 * No frame, no overlay, no headline over it, no buttons. Clicking it scrolls
 * down to the products, which is the only thing a hero is for here.
 *
 * Height is `svh`, not `vh`. On mobile Safari `vh` is measured with the
 * toolbars hidden, so a `100vh` hero is taller than the visible screen on load
 * and the products below it start further away than they look.
 */
export default function Hero({ src }: { src: string }) {
  return (
    <section aria-label="Vinx" className="relative">
      <a
        href="#shop"
        aria-label="Shop the collection"
        className="hero-enter relative block h-[calc(100svh-3.5rem)] min-h-[420px] focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-8px] focus-visible:outline-black"
      >
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="100vw"
          // Contained and inset, so the whole image floats with space on every
          // side. Percentage padding keeps that proportion at every width.
          className="object-contain p-[6%] sm:p-[5%]"
        />
      </a>
    </section>
  );
}
