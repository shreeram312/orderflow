"use client";

import { Plus, Wallet } from "lucide-react";

import { Brand } from "@/components/shell/brand";
import { Dot } from "@/components/shell/bits";
import { UserMenu } from "@/components/shell/user-menu";
import { useCustomerMenu, useWallet } from "@/hooks/use-customer";
import type { MenuItem, PublicUser, WalletSummary } from "@/lib/api";
import { money } from "@/lib/format";
import { useWalletSheet } from "./wallet-sheet";

export function CustomerHeader({
  user,
  initialWallet,
  initialMenu,
}: {
  user: PublicUser;
  initialWallet: WalletSummary;
  initialMenu: { isOpen: boolean; items: MenuItem[] };
}) {
  const { data: wallet = initialWallet } = useWallet(initialWallet);
  const { data: menu = initialMenu } = useCustomerMenu(initialMenu);
  const { openWallet } = useWalletSheet();

  return (
    <header className="bg-background/85 border-border sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Brand />

        <span className="text-muted-foreground ml-1 hidden items-center gap-1.5 text-[13px] sm:inline-flex">
          <Dot tone={menu.isOpen ? "success" : "muted"} pulse={menu.isOpen} />
          {menu.isOpen ? "Open now" : "Closed"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openWallet}
            className="bg-card ring-border hover:ring-foreground/25 focus-visible:ring-ring/40 flex h-9 items-center gap-2 rounded-lg pr-1 pl-3 text-sm ring-1 transition-shadow outline-none focus-visible:ring-2"
          >
            <Wallet className="text-muted-foreground size-4" strokeWidth={1.75} />
            <span className="tabular font-semibold">{money(wallet.balance)}</span>
            <span className="bg-primary text-primary-foreground ml-1 flex size-7 items-center justify-center rounded-md">
              <Plus className="size-4" strokeWidth={2.5} />
            </span>
          </button>

          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
