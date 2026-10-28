"use client";

import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";

import { Dot, EmptyState } from "@/components/shell/bits";
import type { KitchenOrder, OrderStatus } from "@/lib/api";
import { minutesSince } from "@/lib/format";
import { OrderTicket } from "./order-ticket";

const COLUMNS: { status: OrderStatus; label: string; tone: "info" | "warning" | "success"; hint: string }[] = [
  { status: "CONFIRMED", label: "New", tone: "info", hint: "Accepted, not started" },
  { status: "PREPARING", label: "Preparing", tone: "warning", hint: "On the stove" },
  { status: "READY", label: "Ready", tone: "success", hint: "Waiting at the pass" },
];

/** Re-renders once a minute so the waiting-time colours stay honest. */
function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

export function OrdersBoard({ orders }: { orders: KitchenOrder[] }) {
  useMinuteTick();
  // Phones have no room for three columns, so they become tabs.
  const [tab, setTab] = useState<OrderStatus>("CONFIRMED");

  const byStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);
  const longest = orders.reduce((max, o) => Math.max(max, minutesSince(o.createdAt)), 0);
  const late = orders.filter((o) => minutesSince(o.createdAt) >= 20).length;

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No live orders"
        description="New orders appear here the moment the order worker confirms them."
        className="bg-card ring-border min-h-[360px] rounded-xl ring-1"
      />
    );
  }

  return (
    <div>
      {/* A quiet summary line. Numbers, not charts. */}
      <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
        {COLUMNS.map((column) => (
          <span key={column.status} className="inline-flex items-center gap-1.5">
            <Dot tone={column.tone} />
            <span className="tabular text-foreground font-semibold">{byStatus(column.status).length}</span>
            {column.label.toLowerCase()}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          longest wait <span className="tabular text-foreground font-semibold">{longest}m</span>
        </span>
        {late > 0 ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
            <Dot tone="danger" pulse />
            {late} over 20 min
          </span>
        ) : null}
      </div>

      {/* Tabs: phones and tablets only. */}
      <div className="bg-muted mb-3 flex gap-1 rounded-lg p-1 lg:hidden">
        {COLUMNS.map((column) => {
          const count = byStatus(column.status).length;
          const isActive = tab === column.status;
          return (
            <button
              key={column.status}
              type="button"
              onClick={() => setTab(column.status)}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors ${
                isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Dot tone={column.tone} className="size-1.5" />
              {column.label}
              {count > 0 ? <span className="tabular opacity-60">{count}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="lg:hidden">
        <Column tickets={byStatus(tab)} label={COLUMNS.find((c) => c.status === tab)!.label} />
      </div>

      {/* Columns: desktop. */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const tickets = byStatus(column.status);
          return (
            <div key={column.status} className="min-w-0">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <Dot tone={column.tone} />
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <span className="text-muted-foreground tabular text-sm">{tickets.length}</span>
                <span className="text-muted-foreground/70 ml-auto text-xs">{column.hint}</span>
              </div>
              <Column tickets={tickets} label={column.label} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Column({ tickets, label }: { tickets: KitchenOrder[]; label: string }) {
  if (tickets.length === 0) {
    return (
      <p className="text-muted-foreground/70 border-border rounded-xl border border-dashed py-10 text-center text-[13px]">
        Nothing {label.toLowerCase()}
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {tickets.map((order) => (
        <OrderTicket key={order.id} order={order} />
      ))}
    </ul>
  );
}
