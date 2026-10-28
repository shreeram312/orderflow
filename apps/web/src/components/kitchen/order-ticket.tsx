"use client";

import { ArrowRight, Clock } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@my-better-t-app/ui/components/alert-dialog";
import { Button } from "@my-better-t-app/ui/components/button";
import { Textarea } from "@my-better-t-app/ui/components/textarea";

import { NEXT_ACTION, useRejectOrder, useSetOrderStatus } from "@/hooks/use-kitchen-orders";
import type { KitchenOrder } from "@/lib/api";
import { minutesSince, money, orderRef, timeOnly } from "@/lib/format";

/** Waiting-time colour: calm, then amber at 10, then red at 20. */
function waitTone(minutes: number) {
  if (minutes >= 20) return "bg-red-50 text-red-700";
  if (minutes >= 10) return "bg-amber-50 text-amber-700";
  return "bg-muted text-muted-foreground";
}

export function OrderTicket({ order }: { order: KitchenOrder }) {
  const waiting = minutesSince(order.createdAt);
  const setStatus = useSetOrderStatus();
  const reject = useRejectOrder();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const action = NEXT_ACTION[order.status];

  // Disable only the ticket being changed, so two staff can work in parallel.
  const isBusy = setStatus.isPending && setStatus.variables?.id === order.id;
  const units = order.items.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <li className="bg-card ring-border rounded-xl ring-1">
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{order.customerName}</p>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            <span className="font-mono">#{orderRef(order.id)}</span>
            <span aria-hidden>·</span>
            <span className="tabular">{timeOnly(order.createdAt)}</span>
            <span aria-hidden>·</span>
            <span className="tabular">
              {units} item{units === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <span
          className={`tabular inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs font-semibold ${waitTone(waiting)}`}
        >
          <Clock className="size-3" strokeWidth={2.25} />
          {waiting}m
        </span>
      </div>

      <ul className="mt-3 grid gap-1.5 px-4">
        {order.items.map((line) => (
          <li key={line.id} className="flex items-baseline gap-2.5 text-sm">
            <span className="tabular bg-muted text-foreground inline-flex h-5 min-w-6 shrink-0 items-center justify-center rounded px-1 text-xs font-semibold">
              {line.quantity}
            </span>
            <span className="min-w-0 flex-1 truncate">{line.name}</span>
          </li>
        ))}
      </ul>

      <div className="border-border mt-3.5 flex items-center gap-2 border-t px-4 py-3">
        <span className="tabular text-sm font-semibold">{money(order.totalAmount)}</span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Rejection is only possible before cooking starts. */}
          {order.status === "CONFIRMED" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={isBusy || reject.isPending}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          ) : null}

          {action ? (
            <Button
              type="button"
              size="sm"
              // Solid accent only on the last step, so the eye lands on tickets
              // ready to leave the pass rather than on every card at once.
              variant={order.status === "READY" ? "default" : "contrast"}
              disabled={isBusy || reject.isPending}
              onClick={() => setStatus.mutate({ id: order.id, status: action.status })}
            >
              {isBusy ? "Saving…" : action.label}
              {isBusy ? null : <ArrowRight />}
            </Button>
          ) : null}
        </div>
      </div>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {order.customerName}&apos;s order?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be refunded {money(order.totalAmount)} automatically. The reason below is
              shown to them as written.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="e.g. We've run out of paneer"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reject.mutate({ id: order.id, reason: reason.trim() || undefined })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject and refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
