import { redirect } from "next/navigation";

import { homePathFor } from "@/lib/api";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Already signed in? Skip the form entirely.
  const user = await getSession();
  if (user) redirect(homePathFor(user.role));

  return <LoginForm />;
}
