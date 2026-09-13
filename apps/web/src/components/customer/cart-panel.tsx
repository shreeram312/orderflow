"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@my-better-t-app/ui/components/button";

import type { MenuItem } from "@/lib/api";

export type CartLine = { item: MenuItem; quantity: number };

/**
 * Presentational only — there is deliberately no cart state, no add/remove
 * handlers and no checkout call yet.
 *
 * The row markup is written against a `lines` array rather than hardcoded, so
 * when cart state does arrive it only has to be passed in; nothing here has to
 * be rebuilt. Today it always renders the empty state.
 */
export function CartPanel({ lines = [] }: { lines?: CartLine[] }) {
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  return (
    <section className="bg-card ring-border/60 rounded-xl p-4 shadow-sm ring-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Your Cart{lines.length > 0 ? ` (${lines.length})` : ""}</h2>
        {lines.length > 0 ? (
          <Button type="button" variant="link" size="sm" disabled className="h-auto p-0">
            Clear All
          </Button>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <ShoppingBag className="text-muted-foreground/40 size-7" />
          <p className="mt-2.5 text-sm font-semibold">Your cart is empty</p>
          <p className="text-muted-foreground mt-1 max-w-[26ch] text-xs">
            Ordering arrives with the next phase — the menu is browsable now.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-border/60 mt-3 divide-y">
            {lines.map(({ item, quantity }) => (
              <li key={item.id} className="flex items-center gap-2.5 py-2.5">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="bg-muted size-10 shrink-0 rounded-lg" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{item.name}</p>
                  <p className="text-muted-foreground text-[11px]">₹{item.price}</p>
                </div>

                <div className="bg-muted/60 flex items-center gap-1 rounded-full px-1">
                  <Button type="button" variant="ghost" size="icon" disabled className="size-7">
                    <Minus />
                  </Button>
                  <span className="w-4 text-center text-xs font-semibold">{quantity}</span>
                  <Button type="button" variant="ghost" size="icon" disabled className="size-7">
                    <Plus />
                  </Button>
                </div>

                <p className="w-12 text-right text-[13px] font-bold">
                  ₹{(item.price * quantity).toLocaleString()}
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled
                  className="text-destructive size-7"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>

          <div className="border-border/60 mt-3 flex items-center justify-between border-t pt-3">
            <p className="text-base font-bold">Total</p>
            <p className="text-base font-extrabold">₹{total.toLocaleString()}</p>
          </div>
        </>
      )}

      <Button
        type="button"
        disabled
        className="mt-3 w-full text-white"
        style={{ background: "var(--brand-orange)" }}
      >
        Place Order
        <ArrowRight />
      </Button>
    </section>
  );
}
