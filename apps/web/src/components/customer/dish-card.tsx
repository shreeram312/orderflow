"use client";

import { Clock, Plus, UtensilsCrossed } from "lucide-react";
import Image from "next/image";

import { Stepper, VegMark } from "@/components/shell/bits";
import type { MenuItem } from "@/lib/api";
import { money } from "@/lib/format";
import { useCart } from "./cart-context";

/**
 * Text on the left, picture on the right, the add control hanging off the
 * bottom of the picture. The shape works whether or not a dish has a photo,
 * and it keeps the grid dense enough that a 20-item menu fits on one screen.
 */
export function DishCard({ item }: { item: MenuItem }) {
  const { add, decrement, quantityOf } = useCart();
  const quantity = quantityOf(item.id);

  return (
    <li
      className={`bg-card ring-border flex gap-4 rounded-xl p-4 ring-1 transition-shadow ${
        quantity > 0 ? "ring-primary/40 ring-2" : "hover:ring-foreground/20"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <VegMark isVeg={item.isVeg} className="mt-1 size-3.5" />
          <h3 className="line-clamp-2 text-[15px] leading-snug font-medium">{item.name}</h3>
        </div>
        <p className="tabular mt-1 text-sm font-semibold">{money(item.price)}</p>

        {item.description ? (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-[13px] leading-relaxed">
            {item.description}
          </p>
        ) : null}

        <p className="text-muted-foreground mt-auto flex items-center gap-1 pt-3 text-xs">
          <Clock className="size-3.5" strokeWidth={1.75} />
          {item.prepTimeMinutes} min
        </p>
      </div>

      <div className="flex w-24 shrink-0 flex-col items-center">
        <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt="" fill unoptimized sizes="96px" className="object-cover" />
          ) : (
            <div className="text-muted-foreground/50 flex h-full items-center justify-center">
              <UtensilsCrossed className="size-6" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="relative z-10 -mt-4">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => add(item)}
              className="bg-card text-primary ring-border hover:bg-primary-soft flex h-8 w-[88px] items-center justify-center gap-1 rounded-lg text-[13px] font-semibold tracking-wide ring-1 shadow-sm transition-colors active:scale-[0.98]"
            >
              ADD
              <Plus className="size-3.5" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="shadow-sm">
              <Stepper
                value={quantity}
                onDecrement={() => decrement(item.id)}
                onIncrement={() => add(item)}
                label={item.name}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
