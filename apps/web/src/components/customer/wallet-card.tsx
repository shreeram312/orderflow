"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";

import { useTopUpWallet, useWallet } from "@/hooks/use-customer";
import type { WalletSummary } from "@/lib/api";
import { AddMoneySheet } from "./add-money-sheet";

const QUICK_AMOUNTS = [100, 500, 1000];

export function WalletCard({ initial }: { initial: WalletSummary }) {
  const { data: wallet = initial } = useWallet(initial);
  const topUp = useTopUpWallet();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section className="bg-card ring-border/60 rounded-xl p-4 shadow-sm ring-1 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--brand-orange)" }}
          >
            <Wallet className="size-6" />
          </span>
          <div>
            <p className="text-[13px] font-semibold">Wallet Balance</p>
            <p className="text-3xl leading-tight font-extrabold">
              ₹{wallet.balance.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-xs">Quick top up to place orders</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="outline"
              size="sm"
              disabled={topUp.isPending}
              onClick={() => topUp.mutate(amount)}
            >
              + ₹{amount.toLocaleString()}
            </Button>
          ))}
          <Button
            type="button"
            onClick={() => setSheetOpen(true)}
            style={{ background: "var(--brand-orange)" }}
            className="text-white hover:opacity-90"
          >
            Add Money
          </Button>
        </div>
      </div>

      <AddMoneySheet open={sheetOpen} onOpenChange={setSheetOpen} wallet={wallet} />
    </section>
  );
}
