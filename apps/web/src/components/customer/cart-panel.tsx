"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@my-better-t-app/ui/components/button";

import { usePlaceOrder } from "@/hooks/use-customer";
import { useCart } from "./cart-context";

export function CartPanel() {
  const { lines, count, total, add, decrement, remove, clear } = useCart();
  const placeOrder = usePlaceOrder();

  function submit() {
    placeOrder.mutate(
      lines.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })),
      {
        onSuccess: (order) => {
          clear();
          toast.success(`Order placed — ₹${order.totalAmount.toLocaleString()}`);
        },
      },
    );
  }

  return (
    <section className="bg-card ring-border/60 rounded-xl p-4 shadow-sm ring-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Your Cart{count > 0 ? ` (${count})` : ""}</h2>
        {count > 0 ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={clear}
            className="text-destructive h-auto p-0"
          >
            Clear All
          </Button>
        ) : null}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <ShoppingBag className="text-muted-foreground/40 size-7" />
          <p className="mt-2.5 text-sm font-semibold">Your cart is empty</p>
          <p className="text-muted-foreground mt-1 max-w-[26ch] text-xs">
            Add a dish from the menu to get started.
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

                <div className="bg-muted/60 flex items-center gap-0.5 rounded-full px-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => decrement(item.id)}
                    aria-label={`Remove one ${item.name}`}
                    className="size-7"
                  >
                    <Minus />
                  </Button>
                  <span className="w-4 text-center text-xs font-semibold">{quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => add(item)}
                    aria-label={`Add one more ${item.name}`}
                    className="size-7"
                  >
                    <Plus />
                  </Button>
                </div>

                <p className="w-14 text-right text-[13px] font-bold">
                  ₹{(item.price * quantity).toLocaleString()}
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(item.id)}
                  aria-label={`Remove ${item.name} from cart`}
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
        onClick={submit}
        disabled={count === 0 || placeOrder.isPending}
        className="mt-3 w-full text-white"
        style={{ background: "var(--brand-orange)" }}
      >
        {placeOrder.isPending ? "Placing…" : "Place Order"}
        {placeOrder.isPending ? null : <ArrowRight />}
      </Button>
    </section>
  );
}
