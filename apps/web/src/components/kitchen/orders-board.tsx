"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";

import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import type { KitchenOrder, OrderStatus } from "@/lib/api";
import { OrderTicket } from "./order-ticket";

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "CONFIRMED", label: "New" },
  { status: "PREPARING", label: "Preparing" },
  { status: "READY", label: "Ready" },
];

function Empty({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground/70 rounded-lg border border-dashed py-6 text-center text-[11px]">
      Nothing {label.toLowerCase()}
    </p>
  );
}

export function OrdersBoard({ initial }: { initial: KitchenOrder[] }) {
  const { data: orders = initial } = useKitchenOrders(initial);
  // Mobile has no room for three columns, so they become tabs.
  const [tab, setTab] = useState<OrderStatus>("CONFIRMED");

  const byStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);

  if (orders.length === 0) {
    return (
      <section className="bg-card ring-border/60 flex min-h-[220px] flex-col items-center justify-center rounded-xl p-8 text-center shadow-sm ring-1 xl:min-h-[420px]">
        <ClipboardList className="text-muted-foreground/40 size-8" />
        <p className="mt-3 text-sm font-semibold">No live orders</p>
        <p className="text-muted-foreground mt-1 max-w-[26ch] text-xs">
          Confirmed orders appear here the moment the order worker accepts them.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-card ring-border/60 rounded-xl p-4 shadow-sm ring-1 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Order Queue</h2>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {orders.length} live
        </span>
      </div>

      {/* Tabs: phones and tablets only. */}
      <div className="bg-muted/60 mt-3 flex gap-1 rounded-lg p-1 lg:hidden">
        {COLUMNS.map((column) => {
          const count = byStatus(column.status).length;
          const isActive = tab === column.status;

          return (
            <button
              key={column.status}
              type="button"
              onClick={() => setTab(column.status)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {column.label}
              {count > 0 ? <span className="ml-1 tabular-nums opacity-60">{count}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 lg:hidden">
        <div className="grid gap-2">
          {byStatus(tab).length === 0 ? (
            <Empty label={COLUMNS.find((c) => c.status === tab)!.label} />
          ) : (
            byStatus(tab).map((order) => <OrderTicket key={order.id} order={order} />)
          )}
        </div>
      </div>

      {/* Columns: desktop. */}
      <div className="mt-3 hidden gap-3 lg:grid lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const tickets = byStatus(column.status);

          return (
            <div key={column.status} className="min-w-0">
              <div className="mb-2 flex items-baseline gap-1.5">
                <h3 className="text-muted-foreground text-[11px] font-bold tracking-wide uppercase">
                  {column.label}
                </h3>
                <span className="text-muted-foreground/60 text-[11px] tabular-nums">
                  {tickets.length}
                </span>
              </div>

              <div className="grid gap-2">
                {tickets.length === 0 ? (
                  <Empty label={column.label} />
                ) : (
                  tickets.map((order) => <OrderTicket key={order.id} order={order} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
