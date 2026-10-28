"use client";

import { Check, ChevronDown, ClipboardList } from "lucide-react";
import { useState } from "react";

import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";

import { Dot, EmptyState, Panel, PanelHeader } from "@/components/shell/bits";
import { isRefundPending, useCancelOrder, useOrders } from "@/hooks/use-customer";
import type { CustomerOrder, OrderStatus } from "@/lib/api";
import { money, orderRef, timeOnly, titleCase, when } from "@/lib/format";

/** The happy path in order. Terminal states are rendered separately. */
const STEPS: { status: OrderStatus; label: string; caption: string }[] = [
  { status: "PENDING", label: "Order placed", caption: "Waiting for the kitchen to confirm" },
  { status: "CONFIRMED", label: "Confirmed", caption: "The kitchen has accepted your order" },
  { status: "PREPARING", label: "Preparing", caption: "Your food is being cooked" },
  { status: "READY", label: "Ready", caption: "Pick it up at the counter" },
  { status: "COMPLETED", label: "Collected", caption: "Enjoy your meal" },
];

const BADGE: Record<OrderStatus, "success" | "warning" | "muted" | "destructive" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PREPARING: "warning",
  READY: "success",
  COMPLETED: "muted",
  CANCELLED: "muted",
  REJECTED: "destructive",
};

const LIVE = new Set<OrderStatus>(["PENDING", "CONFIRMED", "PREPARING", "READY"]);

export function OrderTracker({ hideWhenIdle = false }: { hideWhenIdle?: boolean }) {
  const { data: orders = [] } = useOrders();
  const cancel = useCancelOrder();
  const [showPast, setShowPast] = useState(false);

  const latest = orders[0];
  const past = orders.slice(1);

  // On phones the tracker only earns its space while something is happening.
  if (hideWhenIdle && (!latest || (!LIVE.has(latest.status) && !isRefundPending(latest)))) {
    return null;
  }

  return (
    <Panel>
      <PanelHeader
        title={latest && LIVE.has(latest.status) ? "Live order" : "Your orders"}
        meta={latest ? `#${orderRef(latest.id)} · ${timeOnly(latest.createdAt)}` : undefined}
        action={
          latest ? <Badge variant={BADGE[latest.status]}>{titleCase(latest.status)}</Badge> : undefined
        }
      />

      {!latest ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          description="Once you place an order, you can follow it here as the kitchen works on it."
          className="py-10"
        />
      ) : (
        <div className="px-4 pt-4 pb-4">
          {latest.status === "REJECTED" || latest.status === "CANCELLED" ? (
            <Terminal order={latest} />
          ) : (
            <Timeline status={latest.status} />
          )}

          <Items order={latest} />

          {latest.status === "PENDING" || latest.status === "CONFIRMED" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(latest.id)}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel order"}
            </Button>
          ) : null}
        </div>
      )}

      {past.length > 0 ? (
        <div className="border-border border-t">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium"
          >
            Past orders
            <span className="flex items-center gap-1.5">
              <span className="tabular">{past.length}</span>
              <ChevronDown className={`size-4 transition-transform ${showPast ? "rotate-180" : ""}`} />
            </span>
          </button>

          {showPast ? (
            <ul className="divide-border border-border divide-y border-t">
              {past.slice(0, 8).map((order) => (
                <li key={order.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span className="text-muted-foreground font-mono text-xs">#{orderRef(order.id)}</span>{" "}
                      {order.items.map((i) => i.name).join(", ")}
                    </p>
                    <p className="text-muted-foreground text-xs">{when(order.createdAt)}</p>
                  </div>
                  <Badge variant={BADGE[order.status]}>{titleCase(order.status)}</Badge>
                  <span className="tabular w-14 text-right font-semibold">{money(order.totalAmount)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

function Timeline({ status }: { status: OrderStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="relative">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const last = index === STEPS.length - 1;

        return (
          <li key={step.status} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Connector to the next step, coloured once this one is done. */}
            {!last ? (
              <span
                aria-hidden
                className={`absolute top-5 left-[9px] h-[calc(100%-6px)] w-px ${
                  done ? "bg-emerald-500" : "bg-border"
                }`}
              />
            ) : null}

            <span
              className={`relative z-10 mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-card ring-primary ring-2"
                    : "bg-card ring-border ring-1"
              }`}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : null}
              {active ? <Dot tone="primary" pulse className="size-2" /> : null}
            </span>

            <div className="min-w-0 pt-px">
              <p
                className={`text-[13px] leading-5 ${
                  active ? "font-semibold" : done ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {active ? <p className="text-muted-foreground text-xs">{step.caption}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Terminal({ order }: { order: CustomerOrder }) {
  const pending = isRefundPending(order);

  return (
    <div className="grid gap-2 text-[13px]">
      <p className="text-muted-foreground">
        {order.status === "CANCELLED"
          ? "You cancelled this order."
          : (order.failureReason ?? "The restaurant could not take this order.")}
      </p>
      {/* Two moments, not one: the status flips first, the payment worker
          returns the money a beat later. Show both honestly. */}
      <p className={`flex items-center gap-2 font-medium ${pending ? "text-amber-700" : "text-emerald-700"}`}>
        {pending ? <Dot tone="warning" pulse /> : <Check className="size-4" strokeWidth={2.5} />}
        {pending
          ? `Refund of ${money(order.totalAmount)} on its way`
          : `${money(order.totalAmount)} refunded to your wallet`}
      </p>
    </div>
  );
}

function Items({ order }: { order: CustomerOrder }) {
  return (
    <ul className="border-border mt-4 grid gap-1 border-t pt-3">
      {order.items.map((line) => (
        <li key={line.id} className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="min-w-0 truncate">
            <span className="text-muted-foreground tabular mr-1.5">{line.quantity}×</span>
            {line.name}
          </span>
          <span className="tabular text-muted-foreground shrink-0">{money(line.unitPrice * line.quantity)}</span>
        </li>
      ))}
      <li className="flex items-baseline justify-between pt-1 text-[13px] font-semibold">
        <span>Total</span>
        <span className="tabular">{money(order.totalAmount)}</span>
      </li>
    </ul>
  );
}
