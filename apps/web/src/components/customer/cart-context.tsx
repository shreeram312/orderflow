"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { MenuItem } from "@/lib/api";

export type CartLine = { item: MenuItem; quantity: number };

type CartValue = {
  lines: CartLine[];
  /** Distinct dishes, not total units — matches the "Your Cart (3)" label. */
  count: number;
  total: number;
  quantityOf: (menuItemId: string) => number;
  add: (item: MenuItem) => void;
  decrement: (menuItemId: string) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

/**
 * Cart state lives in memory only. It is not persisted and never hits the API
 * until Place Order — the server has no concept of a cart, just the order that
 * comes out of it.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((item: MenuItem) => {
    setLines((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (!existing) return [...current, { item, quantity: 1 }];

      return current.map((line) =>
        line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });
  }, []);

  const decrement = useCallback((menuItemId: string) => {
    setLines((current) =>
      current
        .map((line) =>
          line.item.id === menuItemId ? { ...line, quantity: line.quantity - 1 } : line,
        )
        // Dropping to zero removes the line rather than leaving a 0-quantity row.
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const remove = useCallback((menuItemId: string) => {
    setLines((current) => current.filter((line) => line.item.id !== menuItemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const quantities = new Map(lines.map((line) => [line.item.id, line.quantity]));

    return {
      lines,
      count: lines.length,
      total: lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
      quantityOf: (menuItemId) => quantities.get(menuItemId) ?? 0,
      add,
      decrement,
      remove,
      clear,
    };
  }, [lines, add, decrement, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside a CartProvider");

  return value;
}
