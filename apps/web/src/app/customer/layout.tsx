import { redirect } from "next/navigation";

import { CustomerHeader } from "@/components/customer/customer-header";
import { getSession } from "@/lib/session";

/**
 * Guards every page under /customer.
 *
 * This is convenience, not security: it stops the wrong role from seeing a
 * broken page. The real enforcement is requireRole() on the API, because
 * anyone can call the server directly with curl.
 */
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  if (!user) redirect("/login");
  if (user.role !== "CUSTOMER") redirect("/kitchen");

  return (
    <div className="bg-background min-h-svh">
      <CustomerHeader user={user} />
      {children}
    </div>
  );
}
