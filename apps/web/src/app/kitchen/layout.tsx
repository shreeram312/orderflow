import { redirect } from "next/navigation";

import Header from "@/components/header";
import { getSession } from "@/lib/session";

/** Guards every page under /kitchen. See the note in the customer layout. */
export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  if (!user) redirect("/login");
  if (user.role !== "KITCHEN") redirect("/customer");

  return (
    <div className="min-h-svh">
      <Header user={user} />
      {children}
    </div>
  );
}
