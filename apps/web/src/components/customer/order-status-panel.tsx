import { ClipboardList } from "lucide-react";

/** Placeholder until orders exist. No fabricated order is shown. */
export function OrderStatusPanel() {
  return (
    <section className="bg-card ring-border/60 rounded-xl p-4 shadow-sm ring-1">
      <h2 className="text-sm font-bold">Order Status</h2>

      <div className="flex flex-col items-center py-8 text-center">
        <ClipboardList className="text-muted-foreground/40 size-7" />
        <p className="mt-2.5 text-sm font-semibold">No orders yet</p>
        <p className="text-muted-foreground mt-1 max-w-[28ch] text-xs">
          Once you place an order, its progress from Placed to Ready shows up here.
        </p>
      </div>
    </section>
  );
}
