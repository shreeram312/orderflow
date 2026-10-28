import { CartPanel, MobileCartBar } from "@/components/customer/cart-panel";
import { CustomerHeader } from "@/components/customer/customer-header";
import { Greeting } from "@/components/customer/greeting";
import { MenuBrowser } from "@/components/customer/menu-browser";
import { OrderTracker } from "@/components/customer/order-tracker";
import { getCustomerMenu, getWallet } from "@/lib/kitchen-data";
import { getSession } from "@/lib/session";

export default async function CustomerHomePage() {
  // Fetched on the server so the first paint has data; TanStack Query takes
  // over from there. The layout already proved there is a session.
  const [user, menu, { wallet }] = await Promise.all([getSession(), getCustomerMenu(), getWallet()]);

  return (
    <>
      <CustomerHeader user={user!} initialWallet={wallet} initialMenu={menu} />

      <main className="mx-auto max-w-[1440px] px-4 pt-6 pb-28 sm:px-6 lg:pb-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-10">
          <div className="min-w-0">
            <Greeting name={user!.name} isOpen={menu.isOpen} />

            {/* Phones: the live order sits above the menu, out of the way
                when there is nothing to track. */}
            <div className="mb-6 lg:hidden">
              <OrderTracker hideWhenIdle />
            </div>

            <MenuBrowser initial={menu} />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20 grid gap-4">
              <CartPanel />
              <OrderTracker />
            </div>
          </aside>
        </div>
      </main>

      <MobileCartBar />
    </>
  );
}
