"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice, isProductInStock } from "@/types/product";

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
  priority = false
}: {
  product: Product;
  priority?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  // Sticky: flips true on first hover and stays true, so leaving and coming
  // back replays the cached clip instead of unmounting and refetching it.
  const [videoMounted, setVideoMounted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const inStock = isProductInStock(product);
  const video = product.hoverVideoUrl;

  // Playback is driven here rather than in the hover handler because on the
  // very first hover the <video> has not been mounted yet, so the ref is still
  // null at handler time. Running after render means the element always exists.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    if (hovered) {
      // play() rejects if the browser blocks it or the pointer left before the
      // clip was ready. Neither is worth surfacing — the still image stays on
      // screen, which is a perfectly good outcome.
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

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block focus:outline-none"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <div className="product-stage aspect-[3/4] transition-colors duration-500 group-hover:border-soft-500 group-focus-visible:border-soft-700">
        <Image
          src={product.frontImageUrl}
          alt={product.name}
          fill
          priority={priority}
          sizes={sizes}
          className="object-contain p-4 sm:p-7"
        />

        {/* Back image — the hover layer when there is no video, and the thing
            that stays visible while a video is still buffering. */}
        <Image
          src={product.backImageUrl}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          className="media-layer object-contain p-4 sm:p-7"
          data-active={hovered && !(video && videoReady)}
        />

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
            className="media-layer h-full w-full object-contain p-4 sm:p-7"
            data-active={hovered && videoReady}
          />
        )}

        {!inStock && (
          <span className="absolute left-3 top-3 z-10 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-soft-700">
            Out of stock
          </span>
        )}

        {video && (
          <span
            className="absolute bottom-3 right-3 z-10 text-[9px] uppercase tracking-[0.16em] text-soft-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden
          >
            Motion
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2 px-0.5">
        <span className="truncate text-sm font-medium text-soft-700 transition-colors duration-300 group-hover:text-soft-900">
          {product.name}
        </span>
        <span className="shrink-0 text-sm text-soft-500">{formatPrice(product.price, product.currency)}</span>
      </div>
    </Link>
  );
}
