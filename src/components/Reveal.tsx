"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades and lifts its children into place as they scroll into view.
 *
 * Three things make this safe to wrap large parts of a page in:
 *
 * **It fails visible.** The hidden state is applied by this component after it
 * mounts, not by the server-rendered markup. If JavaScript never runs, never
 * loads, or throws before hydration, the content is simply on the page. A
 * reveal that starts at `opacity: 0` in the HTML is a blank site waiting for a
 * bad connection.
 *
 * **It reveals once and stops watching.** The observer disconnects on first
 * intersection, so scrolling back up does not replay the animation — content
 * that re-fades every time it passes the fold reads as a glitch — and the page
 * is not left holding an observer per section.
 *
 * **It defers to the reader.** `prefers-reduced-motion` skips the hidden state
 * entirely rather than shortening it, so nothing depends on a scroll event
 * firing. (The stylesheet forces the same thing, belt and braces, because this
 * is the failure mode where a reader sees nothing at all.)
 */
export default function Reveal({
  children,
  /** Milliseconds to stagger this element behind its neighbours. */
  delay = 0,
  className = "",
  as: Tag = "div"
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "shown">("idle");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Asked not to move: leave the resting (visible) state alone.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Anything already on screen at mount — the hero, the first section — is
    // shown without animating. Hiding it only to fade it back in one frame
    // later is a flash on every page load, and it is the part of the page a
    // visitor is already looking at.
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      setState("shown");
      return;
    }

    setState("pending");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setState("shown");
          observer.disconnect();
        }
      },
      // A negative bottom margin means the reveal fires when the element is
      // properly into view rather than the instant its first pixel appears,
      // which otherwise animates things the reader cannot see yet.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      // `idle` renders no attribute at all, which is the visible resting state.
      data-reveal={state === "idle" ? undefined : state}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
