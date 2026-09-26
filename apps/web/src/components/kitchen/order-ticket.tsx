"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";

import { NEXT_ACTION, useSetOrderStatus } from "@/hooks/use-kitchen-orders";
import type { KitchenOrder, OrderStatus } from "@/lib/api";

const STATUS_VARIANT: Partial<
  Record<OrderStatus, "default" | "success" | "warning" | "muted">
> = {
  CONFIRMED: "default",
  PREPARING: "warning",
  READY: "success",
};

function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** Ticks once a minute so "12m" does not sit frozen on a wall-mounted screen. */
function useWaitingMinutes(createdAt: string) {
  const [minutes, setMinutes] = useState(() => minutesSince(createdAt));

  useEffect(() => {
    setMinutes(minutesSince(createdAt));
    const id = setInterval(() => setMinutes(minutesSince(createdAt)), 60_000);
    return () => clearInterval(id);
  }, [createdAt]);

  return minutes;
}

export function OrderTicket({ order }: { order: KitchenOrder }) {
  const waiting = useWaitingMinutes(order.createdAt);
  const setStatus = useSetOrderStatus();
  const action = NEXT_ACTION[order.status];

  // Disable only the ticket being changed, so two staff can work in parallel.
  const isBusy = setStatus.isPending && setStatus.variables?.id === order.id;

  return (
    <article className="bg-card ring-border/60 rounded-lg p-3 shadow-sm ring-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{order.customerName}</p>
          <p className="text-muted-foreground font-mono text-[11px]">
            #{order.id.slice(0, 8)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status] ?? "muted"}>
          {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
        </Badge>
      </div>

      <ul className="mt-2.5 grid gap-1">
        {order.items.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-2 text-[12px]">
            <span className="min-w-0 truncate">
              <span className="text-muted-foreground tabular-nums">{line.quantity}×</span>{" "}
              {line.name}
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              ₹{line.unitPrice * line.quantity}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-border/60 mt-2.5 flex items-center justify-between gap-2 border-t pt-2.5">
        <span
          className={`inline-flex items-center gap-1 text-[11px] tabular-nums ${
            waiting >= 20 ? "text-destructive font-semibold" : "text-muted-foreground"
          }`}
        >
          <Clock className="size-3" />
          {waiting}m
        </span>
        <span className="text-[13px] font-semibold tabular-nums">₹{order.totalAmount}</span>
      </div>

      {action ? (
        <Button
          type="button"
          size="sm"
          // Solid only on the last step, so the eye lands on tickets ready
          // to leave the pass rather than on every card at once.
          variant={order.status === "READY" ? "default" : "outline"}
          className="mt-2.5 w-full"
          disabled={isBusy}
          onClick={() => setStatus.mutate({ id: order.id, status: action.status })}
        >
          {isBusy ? "Saving…" : action.label}
        </Button>
      ) : null}
    </article>
  );
}
