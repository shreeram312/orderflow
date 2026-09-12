"use client";

import { Power, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { Button } from "@my-better-t-app/ui/components/button";

import { SignOutButton } from "@/components/sign-out-button";
import { useRestaurantSettings, useUpdateSettings } from "@/hooks/use-kitchen";
import type { PublicUser, RestaurantSettings } from "@/lib/api";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function KitchenHeader({
  user,
  initialSettings,
}: {
  user: PublicUser;
  initialSettings: RestaurantSettings;
}) {
  // Shares the cache with the sidebar card, so the pill and the switch can
  // never disagree.
  const { data: settings = initialSettings } = useRestaurantSettings(initialSettings);
  const updateSettings = useUpdateSettings();

  const open = settings.isOpen;

  return (
    <header className="border-border/60 bg-card sticky top-0 z-40 border-b">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <UtensilsCrossed className="size-5" style={{ color: "var(--brand-orange)" }} />
            <span className="font-extrabold tracking-tight">OrderFlow</span>
          </Link>
          <span className="text-muted-foreground hidden text-sm sm:inline">Kitchen</span>

          {/* Full pill on desktop; a bare status dot on phones, where the row
              would otherwise wrap or clip. */}
          <span
            className={`ml-1 hidden items-center gap-2 rounded-lg px-3 py-1.5 md:flex ${
              open ? "bg-emerald-500/10" : "bg-muted"
            }`}
          >
            <span
              aria-hidden
              className={`size-2 rounded-full ${open ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
            />
            <span className="leading-tight">
              <span
                className={`block text-[13px] font-bold ${open ? "text-emerald-700" : "text-muted-foreground"}`}
              >
                {open ? "Restaurant Open" : "Restaurant Closed"}
              </span>
              <span className="text-muted-foreground block text-[10px]">
                {open ? "Accepting orders" : "Not accepting orders"}
              </span>
            </span>
          </span>

          <span
            aria-label={open ? "Restaurant open" : "Restaurant closed"}
            className={`size-2.5 shrink-0 rounded-full md:hidden ${
              open ? "bg-emerald-500" : "bg-muted-foreground/50"
            }`}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 lg:flex">
            <span className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-bold">
              {initials(user.name)}
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-semibold">{user.name}</span>
              <span className="text-muted-foreground block text-[11px]">Kitchen Staff</span>
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={updateSettings.isPending}
            onClick={() => updateSettings.mutate({ isOpen: !open })}
            className={
              open
                ? "border-destructive/40 text-destructive hover:bg-destructive/5"
                : "border-emerald-600/40 text-emerald-700 hover:bg-emerald-500/5"
            }
          >
            <Power />
            {/* Label collapses on phones; the icon plus colour carries it. */}
            <span className="hidden sm:inline">{open ? "Close Restaurant" : "Open Restaurant"}</span>
          </Button>

          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
