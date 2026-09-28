/**
 * Luxury primitives.
 *
 * These are presentation-only building blocks — layout, type, controls. They
 * deliberately do NOT include a ProductCard: that one needs the real `Product`
 * shape (front/back images, variants, GHS pricing via `formatPrice`) and lives
 * in `src/components/ProductCard.tsx` so there is exactly one definition of
 * what a product tile is.
 *
 * Import: import { Button, Section, Heading } from "@/components/luxury";
 */

"use client";

import React from "react";
import Image from "next/image";
import type { MediaSlot } from "@/types/product";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "link";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
};

// Matched to the .btn-* classes in globals.css rather than restating them. The
// two have to agree, because a Button component and a .btn-primary link sit
// next to each other constantly — a Save button beside a Cancel link — and any
// difference in padding or weight between them is immediately visible.
const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    // Disabled is soft-200, not soft-300. At 300 the warm ramp is still a solid
    // tan and an out-of-stock button read as an enabled beige one — a disabled
    // control has to look inert, and on a warm palette that means going lighter
    // than feels right on a cold one.
    "border border-soft-700 bg-soft-700 text-soft-50 hover:border-soft-800 hover:bg-soft-800 disabled:border-soft-200 disabled:bg-soft-200 disabled:text-soft-400",
  secondary:
    "border border-soft-300 bg-transparent text-soft-700 hover:border-soft-700 hover:bg-soft-700 hover:text-soft-50 disabled:border-soft-200 disabled:text-soft-400",
  link: "border-0 border-b border-soft-400 px-0 text-soft-700 hover:border-soft-800 hover:text-soft-800"
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-4 py-2.5 text-[10px]",
  md: "px-7 py-3.5 text-[11px]",
  lg: "px-9 py-4 text-[11px]"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, loading, disabled, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-none font-medium uppercase tracking-[0.1em]
        transition-colors duration-300
        focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soft-700
        disabled:cursor-not-allowed
        ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

// `Section` and `SectionHeader` were removed with the homepage sections that
// used them: nothing on the storefront has an eyebrow-headline-link header any
// more, and a helper with no callers is an invitation to bring one back.

/**
 * Responsive product grid. Columns are the desktop maximum; it steps down.
 *
 * The horizontal gap is deliberately tight and the vertical one is not. Tiles
 * sitting close together read as a continuous run of photography — the density
 * is the point, it is what makes a collection look like a collection. The
 * vertical gap has to stay generous because each tile carries four lines of
 * detail beneath it, and without that space the swatches of one row crowd the
 * photograph of the next.
 */
export function ProductGrid({
  children,
  columns = 6,
  className = ""
}: {
  children: React.ReactNode;
  /** The widest the grid gets; it steps down to two on a phone. */
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}) {
  const cols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    // Six across on a wide screen, like the reference. With each garment small
    // and centred in its cell, six columns reads as a calm field of objects
    // rather than a crowded shelf — the air is inside the cells.
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
  }[columns];

  // No horizontal gap: the cells' own inset provides the separation, and a
  // gutter on top of it would double the space between garments without
  // adding any above or below them.
  return <div className={`grid gap-y-10 sm:gap-y-14 ${cols} ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * An editorial scale: the top three steps are the fluid `--display-*` tokens,
 * deliberately much larger than the rest, because a collection title and a
 * section label are different kinds of object rather than neighbouring sizes on
 * a ramp.
 *
 * The top steps use clamp() rather than a `text-5xl sm:text-7xl` pair. A
 * breakpoint pair jumps: at 639px the title is one size and at 641px it is a
 * third bigger, and every width in between gets whichever of the two fits worst.
 * clamp() interpolates the whole way.
 */
const HEADING_SIZES: Record<number, string> = {
  1: "type-d1",
  2: "type-d2",
  3: "type-d3",
  4: "text-xl sm:text-2xl",
  5: "text-lg",
  6: "text-base"
};

export function Heading({
  level = 1,
  size,
  children,
  className = ""
}: {
  /** The semantic level — what this heading IS in the document outline. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * The visual step, when it differs from the level.
   *
   * These are separate on purpose. A product page's title has to be the `h1`
   * for the outline and for search results, but display-1 is a
   * full-viewport-width collection headline and would dwarf the product beside
   * it. Without this prop the only way to get the right size was to pass
   * `level={2}`, which quietly leaves the page with no `h1` at all — a change
   * that looks purely visual in a diff and is not.
   */
  size?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}) {
  const Tag = `h${level}` as React.ElementType;
  return (
    <Tag className={`type-display text-soft-800 ${HEADING_SIZES[size ?? level]} ${className}`}>
      {children}
    </Tag>
  );
}

/** The wide-tracked micro-caps eyebrow that sits above a heading. */
export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`type-micro text-soft-400 ${className}`}>{children}</p>;
}

export function Badge({
  children,
  variant = "default"
}: {
  children: React.ReactNode;
  variant?: "default" | "accent" | "muted" | "alert";
}) {
  const variants = {
    default: "bg-soft-800 text-white",
    accent: "bg-clay text-soft-50",
    muted: "bg-white text-soft-800 border border-soft-300",
    alert: "bg-vienna-red text-white"
  };
  return (
    <span className={`type-micro inline-block px-2 py-1 ${variants[variant]}`}>{children}</span>
  );
}

/**
 * A status indicator for the back office: a small coloured marker plus a
 * neutral label.
 *
 * The storefront has no colour by design, but admin is a different problem —
 * someone scanning two hundred orders needs to find the three that need
 * attention without reading every row, and an all-neutral list makes that
 * impossible. The compromise is to keep the semantic signal while dropping
 * the filled pill: colour carries meaning in a 6px square, the text stays
 * near-black, and a long list reads as a list rather than a bag of sweets.
 */
const STATUS_TONES: Record<string, string> = {
  // Needs someone to act
  PENDING: "bg-gold",
  FAILED: "bg-vienna-red",
  // Settled, healthy
  PAID: "bg-vienna-green",
  DELIVERED: "bg-vienna-green",
  PUBLISHED: "bg-vienna-green",
  // In motion or inert
  SHIPPED: "bg-soft-500",
  REFUNDED: "bg-soft-400",
  CANCELLED: "bg-soft-300",
  DRAFT: "bg-soft-300",
  // Generic tones, for states that are not order statuses. Without these a
  // caller has to borrow an unrelated status — passing "PAID" to mean "2FA is
  // on" would render correctly today and mislead whoever reads it next.
  ACTIVE: "bg-vienna-green",
  ATTENTION: "bg-gold",
  INACTIVE: "bg-soft-300"
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone = STATUS_TONES[status.toUpperCase()] ?? "bg-soft-300";

  return (
    <span className="type-micro inline-flex items-center gap-2 whitespace-nowrap text-soft-700">
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 ${tone}`} />
      {label ?? status}
    </span>
  );
}

/**
 * Money. Takes minor units plus an ISO currency code and formats through Intl,
 * matching `formatPrice` in types/product — no hardcoded currency symbols, so
 * GHS renders correctly rather than as a dollar amount.
 */
export function Price({
  amount,
  currency,
  compareAt,
  className = ""
}: {
  amount: number;
  currency: string;
  compareAt?: number;
  className?: string;
}) {
  const format = (minorUnits: number) =>
    new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(minorUnits / 100);

  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span>{format(amount)}</span>
      {typeof compareAt === "number" && compareAt > amount && (
        <span className="text-soft-400 line-through">{format(compareAt)}</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function FieldShell({
  label,
  htmlFor,
  required,
  error,
  hint,
  children
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-soft-400">
          {label}
          {required && (
            <span className="ml-1 text-vienna-red" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-soft-400">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-vienna-red">
          {error}
        </p>
      )}
    </div>
  );
}

const FIELD_BASE =
  "w-full rounded-none border-0 border-b bg-transparent px-1 py-3 text-sm text-soft-700 transition-colors duration-300 placeholder:text-soft-400 focus:outline-none focus:ring-0";

type FieldExtras = { label?: string; error?: string; hint?: string };

export const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & FieldExtras>(
  function FormInput({ label, error, hint, className = "", id, required, ...props }, ref) {
    const fieldId = id ?? props.name;
    return (
      <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={`${FIELD_BASE} ${error ? "border-vienna-red" : "border-soft-300 focus:border-soft-700"} ${className}`}
          {...props}
        />
      </FieldShell>
    );
  }
);

export const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldExtras
>(function FormTextarea({ label, error, hint, className = "", id, required, ...props }, ref) {
  const fieldId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`${FIELD_BASE} min-h-[7rem] resize-y ${error ? "border-vienna-red" : "border-soft-300 focus:border-soft-700"} ${className}`}
        {...props}
      />
    </FieldShell>
  );
});

export const FormSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & FieldExtras & { options: Array<{ value: string; label: string }> }
>(function FormSelect({ label, error, hint, options, className = "", id, required, ...props }, ref) {
  const fieldId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={fieldId} required={required} error={error} hint={hint}>
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`${FIELD_BASE} cursor-pointer ${error ? "border-vienna-red" : "border-soft-300 focus:border-soft-700"} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton-loading ${className}`} />;
}

/** Matches ProductCard's footprint so the grid doesn't reflow when data lands. */
/** Mirrors ProductCard: a square cell with a small inset block, one line. */
export function ProductCardSkeleton() {
  return (
    <div>
      <div className="aspect-square zoom-tile">
        <Skeleton className="h-full w-full" />
      </div>
      <Skeleton className="mx-auto mt-3 h-3 w-1/2" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Media gallery
// ---------------------------------------------------------------------------

/**
 * Product media viewer: one image, centred, with arrows at the edges and dots
 * beneath. No thumbnail strip — a row of small framed copies of the photograph
 * is the loudest thing on a page that is meant to hold one object.
 *
 * Takes the ordered `MediaSlot[]` from `productMedia()`, so photographs, the
 * model shot and the clip share one index.
 *
 * Moves by arrow buttons, keyboard arrows while the gallery has focus, dots, or
 * a horizontal swipe. It wraps: past the last slot is the first, because on a
 * gallery of three a dead end is friction for no gain.
 */
export function ImageGallery({
  media,
  priority = false,
  className = "",
  fit = "contain"
}: {
  media: MediaSlot[];
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [active, setActive] = React.useState(0);
  const swipeStart = React.useRef<number | null>(null);

  // Media can change when navigating between products without a remount;
  // clamp rather than pointing at a slot that no longer exists.
  React.useEffect(() => {
    setActive((current) => (current < media.length ? current : 0));
  }, [media]);

  if (media.length === 0) return null;

  const count = media.length;
  const current = media[active] ?? media[0];
  const multiple = count > 1;
  const go = (step: number) => setActive((index) => (index + step + count) % count);
  const fitClass = fit === "cover" ? "object-cover" : "object-contain zoom-stage";

  return (
    <div
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label="Product images"
      // Focusable so the arrow keys work once a keyboard user has tabbed here,
      // without hijacking the arrow keys for the whole page.
      tabIndex={multiple ? 0 : undefined}
      onKeyDown={(event) => {
        if (!multiple) return;
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
    >
      <div
        className="relative h-[58svh] min-h-[320px] max-h-[760px] touch-pan-y select-none"
        onPointerDown={(event) => {
          swipeStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (swipeStart.current === null || !multiple) return;
          const delta = event.clientX - swipeStart.current;
          swipeStart.current = null;
          // 40px: enough that a tap is never read as a swipe.
          if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
        }}
      >
        {/* Keyed on the source, so each change remounts and fades in. Only the
            visible slot is rendered — stacking every slot to crossfade would
            download every image up front. */}
        <div key={current.src} className="page-enter absolute inset-0">
          {current.kind === "video" ? (
            <video
              src={current.src}
              poster={current.poster}
              autoPlay
              muted
              loop
              playsInline
              aria-label={current.alt}
              className={`absolute inset-0 h-full w-full ${fitClass}`}
            />
          ) : (
            <Image
              src={current.src}
              alt={current.alt}
              fill
              priority={priority && active === 0}
              sizes="(max-width: 768px) 100vw, 60vw"
              className={fitClass}
              draggable={false}
            />
          )}
        </div>

        {multiple && (
          <>
            <GalleryArrow direction="previous" onClick={() => go(-1)} />
            <GalleryArrow direction="next" onClick={() => go(1)} />
          </>
        )}
      </div>

      {multiple && (
        <div className="mt-4 flex justify-center gap-2">
          {media.map((slot, index) => (
            <button
              key={`${slot.kind}-${slot.src}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1} of ${count}`}
              aria-current={index === active}
              // The visible dot is 4px; the button around it is 20px, because a
              // 4px target is not something a thumb can hit.
              className="flex h-5 w-5 items-center justify-center"
            >
              <span
                className={`block h-1 w-1 rounded-full transition-colors duration-300 ${
                  index === active ? "bg-black" : "bg-black/20"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* The model shot's caption — who is wearing it, how tall, what size.
          Only reserved when some slot has one, so products without a model
          view carry no empty line. */}
      {media.some((slot) => slot.caption) && (
        <p aria-live="polite" className="type-micro mt-2 min-h-[1rem] text-center text-[var(--muted)]">
          {current.caption ?? ""}
        </p>
      )}
    </div>
  );
}

function GalleryArrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  const next = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={next ? "Next image" : "Previous image"}
      className={`absolute top-1/2 -translate-y-1/2 p-3 transition-opacity hover:opacity-40 ${
        next ? "right-0 sm:right-[6%]" : "left-0 sm:left-[6%]"
      }`}
    >
      <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden className={next ? "" : "rotate-180"}>
        <path d="M1 1l7 7-7 7" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </button>
  );
}
