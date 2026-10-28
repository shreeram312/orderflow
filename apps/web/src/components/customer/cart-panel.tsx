"use client";

import { ArrowRight, ShoppingBag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@my-better-t-app/ui/components/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@my-better-t-app/ui/components/sheet";

import { EmptyState, Panel, PanelHeader, Stepper } from "@/components/shell/bits";
import { useCustomerMenu, usePlaceOrder, useWallet } from "@/hooks/use-customer";
import { money } from "@/lib/format";
import { useCart } from "./cart-context";
import { useWalletSheet } from "./wallet-sheet";

/** Lines, totals and the place-order button. Rendered in the desktop rail
 *  and inside the phone sheet, so it owns no container styling. */
function CartContents({ onPlaced }: { onPlaced?: () => void }) {
  const { lines, units, total, add, decrement, remove, clear } = useCart();
  const { data: wallet } = useWallet();
  const { data: menu } = useCustomerMenu();
  const { openWallet } = useWalletSheet();
  const placeOrder = usePlaceOrder();

  const balance = wallet?.balance ?? 0;
  const short = Math.max(0, total - balance);
  const closed = menu ? !menu.isOpen : false;

  function submit() {
    placeOrder.mutate(
      lines.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })),
      {
        onSuccess: (order) => {
          clear();
          onPlaced?.();
          toast.success(`Order placed · ${money(order.totalAmount)}`, {
            description: "Waiting for the kitchen to confirm.",
          });
        },
      },
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Pick something from the menu to get started."
        className="py-10"
      />
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="divide-border divide-y px-4">
        {lines.map(({ item, quantity }) => (
          <li key={item.id} className="group flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{item.name}</p>
              <p className="text-muted-foreground tabular text-xs">{money(item.price)} each</p>
            </div>

            <Stepper
              size="sm"
              value={quantity}
              onDecrement={() => decrement(item.id)}
              onIncrement={() => add(item)}
              label={item.name}
            />

            <p className="tabular w-16 text-right text-[13px] font-semibold">
              {money(item.price * quantity)}
            </p>

            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Remove ${item.name}`}
              // Hover-revealed on desktop; always visible where there is no hover.
              className="text-muted-foreground hover:text-destructive -mr-1 p-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="border-border mx-4 mt-1 border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {units} item{units === 1 ? "" : "s"}
          </span>
          <span className="tabular text-base font-semibold">{money(total)}</span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">Paid from your wallet when you order.</p>
      </div>

      <div className="grid gap-2 p-4">
        {short > 0 ? (
          <div className="bg-amber-50 text-amber-900 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px]">
            <span>
              Wallet is short by <span className="tabular font-semibold">{money(short)}</span>
            </span>
            <button type="button" onClick={openWallet} className="shrink-0 font-semibold underline-offset-2 hover:underline">
              Add money
            </button>
          </div>
        ) : closed ? (
          <p className="bg-amber-50 text-amber-900 rounded-lg px-3 py-2 text-[13px]">
            The kitchen is closed. An order placed now will be declined and refunded.
          </p>
        ) : null}

        <Button
          type="button"
          size="lg"
          onClick={submit}
          disabled={placeOrder.isPending || short > 0}
          className="w-full justify-between"
        >
          <span>{placeOrder.isPending ? "Placing order…" : "Place order"}</span>
          <span className="tabular flex items-center gap-2 font-semibold">
            {money(total)}
            <ArrowRight className="size-4" />
          </span>
        </Button>
      </div>
    </div>
  );
}

/** Desktop rail card. */
export function CartPanel() {
  const { count, clear } = useCart();

  return (
    <Panel>
      <PanelHeader
        title="Your order"
        meta={count > 0 ? `${count} dish${count === 1 ? "" : "es"}` : undefined}
        action={
          count > 0 ? (
            <Button type="button" variant="ghost" size="xs" onClick={clear} className="text-muted-foreground -mr-2">
              Clear
            </Button>
          ) : undefined
        }
      />
      <CartContents />
    </Panel>
  );
}

/** Phones: a floating bar with the running total, opening a bottom sheet. */
export function MobileCartBar() {
  const { count, units, total } = useCart();
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <>
      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-foreground text-background shadow-lg flex h-14 w-full items-center justify-between rounded-xl px-5 text-sm font-medium active:scale-[0.99]"
        >
          <span className="flex items-center gap-2">
            <span className="bg-background/15 tabular rounded-md px-2 py-0.5 text-xs">{units}</span>
            {units === 1 ? "item" : "items"}
          </span>
          <span className="tabular flex items-center gap-2 text-[15px] font-semibold">
            {money(total)}
            <ArrowRight className="size-4" />
          </span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" closeButton={null} className="max-h-[90vh] overflow-y-auto rounded-t-2xl p-0">
          <SheetTitle className="sr-only">Your order</SheetTitle>
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-base font-semibold">Your order</p>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                <X />
              </Button>
            </SheetClose>
          </div>
          <CartContents onPlaced={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
