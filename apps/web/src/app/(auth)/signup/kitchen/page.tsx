import { redirect } from "next/navigation";

import { homePathFor } from "@/lib/api";
import { getSession } from "@/lib/session";
import { KitchenSignupForm } from "./kitchen-signup-form";

/**
 * Deliberately unlisted: nothing in the customer UI links here. Staff are
 * given the URL and the signup code by whoever runs the restaurant.
 */
export default async function KitchenSignupPage() {
  const user = await getSession();
  if (user) redirect(homePathFor(user.role));

  return <KitchenSignupForm />;
}
