"use client";

import { ClipboardList } from "lucide-react";

import { Badge } from "@my-better-t-app/ui/components/badge";

import { useOrders } from "@/hooks/use-customer";
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
            <p className="text-muted-foreground mt-3 text-xs">
              {latest.failureReason ?? "This order did not go through. Your wallet was refunded."}
            </p>
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
        </>
      )}
    </section>
  );
}
