import { redirect } from "next/navigation";

import { KitchenHeader } from "@/components/kitchen/kitchen-header";
import { getSession } from "@/lib/session";

/**
 * Guards every page under /kitchen.
 *
 * This is convenience, not security: it stops the wrong role from seeing a
 * broken page. The real enforcement is requireRole() on the API, because
 * anyone can call the server directly with curl.
 */
export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  if (!user) redirect("/login");
  if (user.role !== "KITCHEN") redirect("/customer");

  return (
    <div className="bg-background min-h-svh">
      <KitchenHeader user={user} />
      {children}
    </div>
  );
}
