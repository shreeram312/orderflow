import { redirect } from "next/navigation";

import { homePathFor } from "@/lib/api";
import { getSession } from "@/lib/session";

/**
 * The root is only ever a signpost: signed out goes to the auth pages,
 * signed in goes to whichever dashboard the role belongs to.
 */
export default async function RootPage() {
  const user = await getSession();

  redirect(user ? homePathFor(user.role) : "/login");
}
