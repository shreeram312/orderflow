import { redirect } from "next/navigation";

import { homePathFor } from "@/lib/api";
import { getSession } from "@/lib/session";
import { CustomerSignupForm } from "./signup-form";

export default async function SignupPage() {
  const user = await getSession();
  if (user) redirect(homePathFor(user.role));

  return <CustomerSignupForm />;
}
