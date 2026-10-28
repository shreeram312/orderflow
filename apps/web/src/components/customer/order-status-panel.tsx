"use client";

import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";

import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";

import { isRefundPending, useCancelOrder, useOrders } from "@/hooks/use-customer";
import type { OrderStatus } from "@/lib/api";

/** The happy path in order; terminal states are rendered separately. */
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Order Placed" },
  { status: "CONFIRMED", label: "Confirmed by Restaurant" },
  { status: "PREPARING", label: "Preparing" },
  { status: "READY", label: "Ready" },
  { status: "COMPLETED", label: "Completed" },
];

const STATUS_VARIANT: Record<OrderStatus, "success" | "warning" | "muted" | "destructive"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  PREPARING: "warning",
  READY: "success",
  COMPLETED: "muted",
  CANCELLED: "muted",
  REJECTED: "destructive",
};

export function OrderStatusPanel() {
  const { data: orders = [] } = useOrders();
  const cancel = useCancelOrder();
  const latest = orders[0];

  return (
    <section className="bg-card ring-border/60 rounded-xl p-4 shadow-sm ring-1">
      <h2 className="text-sm font-bold">Order Status</h2>

      {!latest ? (
        <div className="flex flex-col items-center py-8 text-center">
          <ClipboardList className="text-muted-foreground/40 size-7" />
          <p className="mt-2.5 text-sm font-semibold">No orders yet</p>
          <p className="text-muted-foreground mt-1 max-w-[28ch] text-xs">
            Once you place an order, its progress shows up here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold">#{latest.id.slice(0, 8)}</p>
              <p className="text-muted-foreground text-[11px]">
                {latest.items.length} item{latest.items.length === 1 ? "" : "s"} · ₹
                {latest.totalAmount.toLocaleString()}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[latest.status]}>
              {latest.status.charAt(0) + latest.status.slice(1).toLowerCase()}
            </Badge>
          </div>

          {latest.status === "REJECTED" || latest.status === "CANCELLED" ? (
            <div className="mt-3 grid gap-1.5 text-xs">
              <p className="text-muted-foreground">
                {latest.status === "CANCELLED"
                  ? "You cancelled this order."
                  : (latest.failureReason ?? "The restaurant could not take this order.")}
              </p>
              {/* Two moments, not one: the status flips first, the payment
                  worker returns the money a beat later. Show both honestly. */}
              {isRefundPending(latest) ? (
                <p className="inline-flex items-center gap-1.5 font-medium text-orange-600">
                  <Loader2 className="size-3 animate-spin" />
                  Refund of ₹{latest.totalAmount.toLocaleString()} on its way…
                </p>
              ) : (
                <p className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <CheckCircle2 className="size-3" />₹{latest.totalAmount.toLocaleString()} refunded
                  to your wallet
                </p>
              )}
            </div>
          ) : (
            <ol className="mt-4 grid gap-2.5">
              {STEPS.map((step, index) => {
                const currentIndex = STEPS.findIndex((s) => s.status === latest.status);
                const done = index < currentIndex;
                const active = index === currentIndex;

                return (
                  <li key={step.status} className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={`size-4 shrink-0 rounded-full border-2 ${
                        done
                          ? "border-emerald-500 bg-emerald-500"
                          : active
                            ? "border-orange-500"
                            : "border-muted-foreground/25"
                      }`}
                    />
                    <span
                      className={`text-xs ${active ? "font-semibold" : done ? "" : "text-muted-foreground"}`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Until a worker consumes order.created, PENDING is where it stops. */}
          {latest.status === "PENDING" ? (
            <p className="text-muted-foreground mt-3 text-[11px] leading-tight">
              Waiting on the kitchen to pick this up.
            </p>
          ) : null}

          {/* Cancellable until cooking starts. The server re-checks — this
              button can be stale by up to one poll. */}
          {latest.status === "PENDING" || latest.status === "CONFIRMED" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(latest.id)}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel order"}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
