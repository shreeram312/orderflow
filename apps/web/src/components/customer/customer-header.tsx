"use client";

import { LogOut, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";

import { api, type PublicUser } from "@/lib/api";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function CustomerHeader({ user }: { user: PublicUser }) {
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
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 md:h-16">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <UtensilsCrossed className="size-5" style={{ color: "var(--brand-orange)" }} />
          <span className="text-[15px] font-extrabold tracking-tight">OrderFlow</span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground hidden text-sm sm:inline">{user.name}</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted size-9 rounded-full p-0"
                aria-label="Account menu"
              >
                <span className="bg-muted text-foreground flex size-8 items-center justify-center rounded-full text-[11px] font-bold">
                  {initials(user.name)}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">{user.email}</p>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem disabled={signingOut} onSelect={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
