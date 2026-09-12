import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import type { PublicUser } from "@/lib/api";
import { SignOutButton } from "./sign-out-button";

/**
 * Shown on the signed-in dashboards only. The auth screens render their own
 * branding inside the card, so the root layout deliberately has no header.
 */
export default function Header({ user }: { user: PublicUser }) {
  return (
    <header className="border-border/60 bg-card border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <UtensilsCrossed className="size-5" style={{ color: "var(--brand-orange)" }} />
          <span className="font-extrabold tracking-tight">OrderFlow</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {user.name} · {user.role === "KITCHEN" ? "Kitchen" : "Customer"}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
