"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice, isProductInStock } from "@/types/product";

/**
 * A product tile: the garment, and one line of text beneath it.
 *
 * Removed from what this used to carry: colour swatches, a "New" flag, a fabric
 * eyebrow, a wishlist heart, a separate price line, and a boxed "Sold out" chip.
 * Each was information; together they were a label stuck to every photograph.
 * The detail page has all of it for anyone who clicks.
 *
 * The one line shows the name at rest and the price on hover or keyboard focus,
 * in the same place. Both are always in the DOM — the swap is opacity only — so
 * a screen reader gets name and price together regardless of hover, and on a
 * touch device (no hover) the tile simply shows the name, with the price one tap
 * away on the product page.
 *
 * Hover also crossfades to the back image, or plays the product's clip if it
 * has one. The <video> is mounted only after the first hover, so a grid of
 * thirty products does not start thirty downloads on load.
 */
export default function ProductCard({
  product,
  priority = false,
  access = "open"
}: {
  product: Product;
  priority?: boolean;
  /**
   * Whether this viewer can buy it right now. During a drop's VIP window a
   * non-member's hover says so instead of showing a price they cannot pay.
   */
  access?: "open" | "early-vip" | "early-locked";
}) {
  const [hovered, setHovered] = useState(false);
  // Sticky: flips true on first hover and stays, so leaving and returning
  // replays the cached clip instead of unmounting and refetching it.
  const [videoMounted, setVideoMounted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const inStock = isProductInStock(product);
  const video = product.hoverVideoUrl;

  // Driven after render rather than in the handler: on the very first hover
  // the <video> has not been mounted yet, so the ref is still null there.
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

  function enter() {
    setHovered(true);
    if (video) setVideoMounted(true);
  }

  const sizes = "(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 17vw";
  const fit = "object-contain zoom-tile";

  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseEnter={enter}
      onMouseLeave={() => setHovered(false)}
      onFocus={enter}
      onBlur={() => setHovered(false)}
      className="group block focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-black"
    >
      <div className="product-stage aspect-square">
        <Image
          src={product.frontImageUrl}
          // Empty on purpose. The link's text below already says the name, and
          // an alt repeating it makes a screen reader announce every tile's
          // name twice.
          alt=""
          fill
          priority={priority}
          sizes={sizes}
          className={`${fit} ${inStock ? "" : "opacity-40"}`}
        />

        <Image
          src={product.backImageUrl}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          className={`media-layer ${fit}`}
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
            className={`media-layer h-full w-full ${fit}`}
            data-active={hovered && videoReady}
          />
        )}
      </div>

      {/* Name and price stacked in one grid cell, so swapping them cannot
          shift the grid by a pixel. */}
      <p className="type-label mt-3 grid text-center">
        <span
          className={`col-start-1 row-start-1 transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0 ${
            inStock ? "" : "text-[var(--muted)]"
          }`}
        >
          {product.name}
        </span>
        <span className="col-start-1 row-start-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          {access === "early-locked"
            ? "VIP early access"
            : !inStock
              ? "Sold out"
              : access === "early-vip"
                ? `Early · ${formatPrice(product.price, product.currency)}`
                : formatPrice(product.price, product.currency)}
        </span>
      </p>
    </Link>
  );
}
