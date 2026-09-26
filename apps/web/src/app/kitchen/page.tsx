import { MenuManagementCard } from "@/components/kitchen/menu-management-card";
import { OrdersBoard } from "@/components/kitchen/orders-board";
import { RestaurantStatusCard } from "@/components/kitchen/restaurant-status-card";
import { getKitchenMenu, getKitchenOrders, getRestaurantSettings } from "@/lib/kitchen-data";

export default async function KitchenDashboardPage() {
  // Fetched on the server so the first paint has data; TanStack Query takes
  // over from there and keeps it fresh through mutations and polling.
  const [{ settings }, { items }, { orders }] = await Promise.all([
    getRestaurantSettings(),
    getKitchenMenu(),
    getKitchenOrders(),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2.3fr)_minmax(0,0.9fr)]">
        {/* Orders lead on every width: on a kitchen phone the queue is the job,
            and the settings/menu cards are things you visit occasionally. */}
        <div className="min-w-0">
          <OrdersBoard initial={orders} />
        </div>

        <div className="grid gap-4">
          <RestaurantStatusCard initial={settings} />
          <MenuManagementCard initial={items} />
        </div>
      </div>
    </div>
  );
}
