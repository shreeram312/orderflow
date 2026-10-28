"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";

import { api, type PublicUser } from "@/lib/api";
import { initials } from "@/lib/format";

/** Avatar button with the account menu. Shared by both dashboards. */
export function UserMenu({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await api.logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="bg-muted text-foreground ring-border hover:ring-foreground/25 focus-visible:ring-ring/40 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 transition-shadow outline-none focus-visible:ring-2"
        >
          {initials(user.name)}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          {user.role === "KITCHEN" && user.restaurantName ? (
            <p className="text-muted-foreground mt-1 truncate text-xs">{user.restaurantName}</p>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} onSelect={() => void signOut()}>
          <LogOut className="mr-2 size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
