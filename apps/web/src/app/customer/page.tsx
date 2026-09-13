import { Badge } from "@my-better-t-app/ui/components/badge";

import { CartPanel } from "@/components/customer/cart-panel";
import { MenuBrowser } from "@/components/customer/menu-browser";
import { OrderStatusPanel } from "@/components/customer/order-status-panel";
import { PromoBanner } from "@/components/customer/promo-banner";
import { WalletCard } from "@/components/customer/wallet-card";
import { getCustomerMenu, getWallet } from "@/lib/kitchen-data";

export default async function CustomerHomePage() {
  // Fetched on the server so the first paint has data; TanStack Query takes
  // over from there.
  const [menu, { wallet }] = await Promise.all([getCustomerMenu(), getWallet()]);

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <WalletCard initial={wallet} />
            <PromoBanner />
          </div>

          {!menu.isOpen ? (
            <p className="bg-muted/60 text-muted-foreground rounded-lg px-4 py-3 text-sm">
              The kitchen is closed right now. You can still browse the menu.
            </p>
          ) : null}

          <MenuBrowser initial={menu} />
        </div>

        <div className="grid content-start gap-4">
          <div className="flex items-center justify-end">
            <Badge variant={menu.isOpen ? "success" : "muted"}>
              {menu.isOpen ? "Open — accepting orders" : "Closed"}
            </Badge>
          </div>
          <CartPanel />
          <OrderStatusPanel />
        </div>
      </div>
    </div>
  );
}
