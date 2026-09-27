"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice, isProductInStock, isNewArrival } from "@/types/product";
import { colourwaysOf } from "@/lib/swatch";
import { useWishlist } from "@/lib/useWishlist";

/**
 * A product tile.
 *
 * Hover reveals a second layer: the product's video if it has one, otherwise
 * the back image. The video element is only mounted once the tile has actually
 * been hovered — mounting it upfront would have every card on the page start
 * fetching a clip, which is the fastest way to make a 20-product grid feel
 * slow. `preload="none"` keeps even the mounted element from pulling bytes
 * until play() is called.
 *
 * Touch devices never fire hover, so they simply keep the front image, which
 * is the correct fallback rather than something to work around.
 */
export default function ProductCard({
  product,
  priority = false,
  mockupSrc
}: {
  product: Product;
  priority?: boolean;
  mockupSrc?: string;
}) {
  const [hovered, setHovered] = useState(false);
  // Sticky: flips true on first hover and stays true, so leaving and coming
  // back replays the cached clip instead of unmounting and refetching it.
  const [videoMounted, setVideoMounted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { saved, toggle } = useWishlist(product.id);

  const inStock = isProductInStock(product);
  const isNew = isNewArrival(product);
  const colourways = colourwaysOf(product.variants);
  const video = mockupSrc ? null : product.hoverVideoUrl;

  // Playback is driven here rather than in the hover handler because on the
  // very first hover the <video> has not been mounted yet, so the ref is still
  // null at handler time. Running after render means the element always exists.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    if (hovered) {
      void element.play().catch(() => undefined);
    } else {
      element.pause();
      element.currentTime = 0;
    }
  }, [hovered, videoMounted]);

  function handleEnter() {
    setHovered(true);
    if (video) setVideoMounted(true);
  }

  function handleLeave() {
    setHovered(false);
  }

  const sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

  // Photography fills the frame; a line-art mockup has to sit inside it with
  // room to breathe, or it crops into an unreadable detail.
  const fit = mockupSrc ? "object-contain p-6 sm:p-10" : "object-cover";

  return (
    <article className="group flex flex-col">
      <div
        className="relative"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <Link
          href={`/products/${product.slug}`}
          className="block focus:outline-none focus-visible:ring-1 focus-visible:ring-soft-700"
          onFocus={handleEnter}
          onBlur={handleLeave}
        >
          <div className="product-stage aspect-[3/4]">
            <Image
              src={mockupSrc ?? product.frontImageUrl}
              alt={product.name}
              fill
              priority={priority}
              sizes={sizes}
              className={fit}
            />

            {/* Back image — the hover layer when there is no video, and the
                thing that stays visible while a video is still buffering.
                Skipped in mockup mode, where both layers would be the same
                file: one extra request to cross-fade an image into itself. */}
            {!mockupSrc && (
              <Image
                src={product.backImageUrl}
                alt=""
                aria-hidden
                fill
                sizes={sizes}
                className={`media-layer ${fit}`}
                data-active={hovered && !(video && videoReady)}
              />
            )}

            {video && videoMounted && (
              <video
                ref={videoRef}
                src={video}
                poster={product.frontImageUrl}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden
                tabIndex={-1}
                onCanPlay={() => setVideoReady(true)}
                className={`media-layer h-full w-full ${fit}`}
                data-active={hovered && videoReady}
              />
            )}

            {!inStock && (
              <span className="type-micro absolute left-3 top-3 z-10 bg-white/90 px-2 py-1 text-soft-700">
                Sold out
              </span>
            )}
          </div>
        </Link>

        {/* Sibling of the link, not a child of it: a <button> inside an <a> is
            invalid markup, and browsers that tolerate it still make the pair
            impossible to reach separately by keyboard. */}
        <button
          type="button"
          onClick={toggle}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
          className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-soft-700 backdrop-blur-sm transition-colors hover:bg-white focus:outline-none focus-visible:ring-1 focus-visible:ring-soft-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path d="M12 20.5 4.2 12.9a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0l1 1 1-1a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8Z" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {colourways.length > 0 && (
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Available colours">
            {colourways.map((colourway) => (
              <li
                key={colourway.name}
                title={colourway.name}
                aria-label={colourway.name}
                style={{ backgroundColor: colourway.colour }}
                className={`h-3.5 w-3.5 rounded-full ${
                  colourway.needsBorder ? "ring-1 ring-inset ring-soft-300" : ""
                }`}
              />
            ))}
          </ul>
        )}

        {isNew && (
          <span className="type-micro w-fit bg-soft-200 px-1.5 py-0.5 text-soft-600">New</span>
        )}

        <div>
          {product.material && (
            <p className="type-micro text-soft-400">{product.material}</p>
          )}
          <h3 className="mt-1 text-sm text-soft-800 transition-opacity group-hover:opacity-70">
            {product.name}
          </h3>
          <p className="mt-1 text-sm tabular-nums text-soft-600">
            {formatPrice(product.price, product.currency)}
          </p>
        </div>
      </div>
    </article>
  );
}
