"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  size: string;
  color: string;
  price: number; // minor units, snapshot at add-time
  currency: string;
  quantity: number;
  maxQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

// Cart contents only — no personal or payment data ever goes here. This is
// client-only storage, readable by anyone with access to the browser, so it
// must never hold anything sensitive (tokens, addresses, card info).
const STORAGE_KEY = "vinx:cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (client-only — localStorage doesn't exist during SSR)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Corrupt or blocked storage — start with an empty cart rather than crash.
    }
    setHydrated(true);
  }, []);

  // Persist on every change, after initial hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or disabled — fail silently, cart still works for this session.
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        const newQty = Math.min(existing.quantity + item.quantity, existing.maxQuantity);
        return prev.map((i) => (i.variantId === item.variantId ? { ...i, quantity: newQty } : i));
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clear, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
