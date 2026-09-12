import { ClipboardList } from "lucide-react";

import { MenuManagementCard } from "@/components/kitchen/menu-management-card";
import { RestaurantStatusCard } from "@/components/kitchen/restaurant-status-card";
import { TodaysOverview } from "@/components/kitchen/todays-overview";
import { getKitchenMenu, getRestaurantSettings } from "@/lib/kitchen-data";

export default async function KitchenDashboardPage() {
  // Fetched on the server so the first paint has data; TanStack Query takes
  // over from there and keeps it fresh through mutations.
  const [{ settings }, { items }] = await Promise.all([
    getRestaurantSettings(),
    getKitchenMenu(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
      {/* Three columns as designed. The first two hold the order queue and the
          order detail panel, which arrive with the orders module. */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]">
        <section className="bg-card ring-border/60 order-2 flex min-h-[220px] flex-col items-center justify-center rounded-xl p-8 text-center shadow-sm ring-1 xl:order-1 xl:min-h-[420px]">
          <ClipboardList className="text-muted-foreground/40 size-8" />
          <p className="mt-3 text-sm font-semibold">Order queue</p>
          <p className="text-muted-foreground mt-1 max-w-[24ch] text-xs">
            New, Preparing, Ready and Completed tabs land here with the orders module.
          </p>
        </section>

        <section className="bg-card ring-border/60 order-3 hidden min-h-[420px] flex-col items-center justify-center rounded-xl p-8 text-center shadow-sm ring-1 xl:order-2 xl:flex">
          <p className="text-muted-foreground text-xs">Select an order to see its details</p>
        </section>

        <div className="order-1 grid gap-4 xl:order-3">
          <RestaurantStatusCard initial={settings} />
          <TodaysOverview />
          <MenuManagementCard initial={items} />
        </div>
      </div>
    </div>
  );
}
