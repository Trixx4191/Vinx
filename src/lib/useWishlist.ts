"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vinx.wishlist";
// Same-tab updates: `storage` only fires in *other* tabs, so without this a
// second card on the same page would not notice the first one's change.
const CHANGE_EVENT = "vinx.wishlist.change";

/**
 * A saved-items list held in the browser.
 *
 * Deliberately local. A heart that lights up and forgets by the next page load
 * is worse than no heart at all, so this persists — but it persists to
 * localStorage, which means it is per-browser: it does not follow a shopper to
 * their phone and it is invisible to you.
 *
 * A real wishlist is a table keyed on userId, and it is a small piece of work
 * once it is wanted. This exists so the control on the product tile is honest
 * about what it does today rather than decorative.
 */
function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    // Private mode, cleared site data, or something else wrote garbage to the
    // key. An unusable wishlist should not take the page down with it.
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Storage full or blocked; the in-memory state below still updates, so the
    // heart responds for this session even though it will not survive a reload.
  }
}

export function useWishlist(productId: string) {
  const [saved, setSaved] = useState(false);

  // Read after mount rather than during render: the server has no localStorage,
  // so initialising from it would make the first client render disagree with
  // the server's HTML and trip a hydration mismatch.
  useEffect(() => {
    const sync = () => setSaved(read().includes(productId));
    sync();

    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [productId]);

  const toggle = useCallback(() => {
    const current = read();
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];

    write(next);
    setSaved(next.includes(productId));
  }, [productId]);

  return { saved, toggle };
}
