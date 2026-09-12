import { getSession } from "@/lib/session";

/** Placeholder home. Replaced by the menu and cart in Phase 3. */
export default async function CustomerHomePage() {
  const user = await getSession();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-medium">Welcome, {user?.name}</h1>
      <p className="text-muted-foreground mt-1">
        Signed in as a customer. The menu and cart arrive in Phase 3.
      </p>
    </div>
  );
}
