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

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border border-soft-700 bg-soft-700 text-white hover:border-black hover:bg-black disabled:border-soft-300 disabled:bg-soft-300",
  secondary:
    "border border-soft-300 bg-transparent text-soft-700 hover:border-soft-700 hover:bg-soft-700 hover:text-white disabled:border-soft-200 disabled:text-soft-400",
  link: "border-0 border-b border-soft-700 px-0 text-soft-700 hover:opacity-60"
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-4 py-2 text-[10px]",
  md: "px-6 py-3 text-xs",
  lg: "px-8 py-4 text-xs"
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
      className={`inline-flex items-center justify-center gap-2 rounded-none font-medium uppercase tracking-[0.14em]
        transition-colors duration-300
        focus:outline-none focus-visible:ring-1 focus-visible:ring-soft-700 focus-visible:ring-offset-2
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

/**
 * A vertical rhythm block. The app's root layout already provides the page
 * gutter and max width, so this only owns spacing between major sections.
 */
export function Section({
  children,
  className = "",
  as: Tag = "section"
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return <Tag className={`py-10 sm:py-14 ${className}`}>{children}</Tag>;
}

/** Responsive product grid. Columns are the desktop maximum; it steps down. */
export function ProductGrid({
  children,
  columns = 4,
  className = ""
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
  }[columns];

  return <div className={`grid gap-x-4 gap-y-10 sm:gap-x-6 ${cols} ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

// An editorial scale: the top two steps are deliberately much larger than the
// rest, because a collection title and a section label are different kinds of
// object, not neighbouring sizes on a ramp.
const HEADING_SIZES: Record<number, string> = {
  1: "text-5xl sm:text-7xl",
  2: "text-3xl sm:text-5xl",
  3: "text-2xl sm:text-3xl",
  4: "text-xl sm:text-2xl",
  5: "text-lg",
  6: "text-base"
};

export function Heading({
  level = 1,
  children,
  className = ""
}: {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}) {
  const Tag = `h${level}` as React.ElementType;
  return (
    <Tag className={`type-display text-soft-800 ${HEADING_SIZES[level]} ${className}`}>
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
    default: "bg-soft-700 text-white",
    accent: "bg-celadon text-soft-700",
    muted: "bg-white text-soft-700 border border-soft-300",
    alert: "bg-vienna-red text-white"
  };
  return (
    <span
      className={`inline-block px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${variants[variant]}`}
    >
      {children}
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
export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-12" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Media gallery
// ---------------------------------------------------------------------------

/**
 * Product media viewer. Takes the ordered `MediaSlot[]` from `productMedia()`
 * so images and video share one index — the selected thumbnail is always the
 * thing on the stage, whether it's a photo or a clip.
 */
export function ImageGallery({
  media,
  priority = false,
  className = ""
}: {
  media: MediaSlot[];
  priority?: boolean;
  className?: string;
}) {
  const [active, setActive] = React.useState(0);

  // Media can change when the viewer navigates between products without a
  // full remount; clamp rather than pointing at a slot that no longer exists.
  React.useEffect(() => {
    setActive((current) => (current < media.length ? current : 0));
  }, [media]);

  if (media.length === 0) return null;
  const current = media[active] ?? media[0];

  return (
    <div className={className}>
      <div className="product-stage relative aspect-[3/4]">
        {current.kind === "video" ? (
          <video
            key={current.src}
            src={current.src}
            poster={current.poster}
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            aria-label={current.alt}
            className="absolute inset-0 h-full w-full object-contain p-5 sm:p-12"
          />
        ) : (
          <Image
            src={current.src}
            alt={current.alt}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-5 transition-opacity duration-500 ease-apple sm:p-12"
          />
        )}
      </div>

      {media.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {media.map((slot, index) => (
            <button
              key={`${slot.kind}-${slot.src}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={slot.alt}
              aria-current={index === active}
              className={`relative h-16 w-14 shrink-0 overflow-hidden border bg-white transition-colors duration-300 sm:h-20 sm:w-16 ${
                index === active ? "border-soft-700" : "border-soft-200 hover:border-soft-400"
              }`}
            >
              <Image
                src={slot.kind === "video" ? slot.poster : slot.src}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-1.5"
              />
              {slot.kind === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
