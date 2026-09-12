import { getSession } from "@/lib/session";

/** Placeholder home. Replaced by the order queue and menu tabs in Phase 3. */
export default async function KitchenHomePage() {
  const user = await getSession();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-medium">{user?.restaurantName}</h1>
      <p className="text-muted-foreground mt-1">
        Signed in as {user?.name} — kitchen staff. The order queue and menu management arrive in
        Phase 3.
      </p>
    </div>
  );
}
