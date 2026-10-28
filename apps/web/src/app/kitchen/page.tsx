import { KitchenHeader } from "@/components/kitchen/kitchen-header";
import { KitchenWorkspace } from "@/components/kitchen/kitchen-workspace";
import { getKitchenMenu, getKitchenOrders, getRestaurantSettings } from "@/lib/kitchen-data";
import { getSession } from "@/lib/session";

export default async function KitchenDashboardPage() {
  // Fetched on the server so the first paint has data; TanStack Query takes
  // over from there and keeps it fresh through mutations and polling.
  const [user, { settings }, { items }, { orders }] = await Promise.all([
    getSession(),
    getRestaurantSettings(),
    getKitchenMenu(),
    getKitchenOrders(),
  ]);

  return (
    <>
      <KitchenHeader user={user!} initialSettings={settings} />
      <KitchenWorkspace initialOrders={orders} initialMenu={items} />
    </>
  );
}
