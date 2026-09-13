"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@my-better-t-app/ui/components/sheet";
import { useResponsiveSheetSide } from "@my-better-t-app/ui/hooks/use-responsive-sheet-side";

import { FormError } from "@/components/auth/form-error";
import { useTopUpWallet, useWalletTransactions } from "@/hooks/use-customer";
import { ApiError, type WalletSummary } from "@/lib/api";

const PRESETS = [100, 500, 1000, 2000];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AddMoneySheet({
  open,
  onOpenChange,
  wallet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletSummary;
}) {
  const { sheetSide } = useResponsiveSheetSide();
  const topUp = useTopUpWallet();
  // Only fetch the ledger while the sheet is actually open.
  const { data: transactions = [] } = useWalletTransactions(open);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }

    topUp.mutate(value, {
      onSuccess: () => setAmount(""),
      onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add money"),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        key={sheetSide}
        side={sheetSide}
        className={
          sheetSide === "bottom"
            ? "flex max-h-[90vh] flex-col overflow-hidden rounded-t-xl p-0"
            : "flex flex-col overflow-hidden p-0 sm:max-w-md"
        }
        closeButton={null}
      >
        <SheetTitle className="sr-only">Add money to wallet</SheetTitle>

        <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
          <div>
            <p className="text-base font-semibold">Add Money</p>
            <p className="text-muted-foreground text-xs">Balance ₹{wallet.balance.toLocaleString()}</p>
          </div>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form onSubmit={submit} className="grid gap-3" noValidate>
            <FormError message={error} />

            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(String(preset))}
                >
                  +₹{preset}
                </Button>
              ))}
            </div>

            <label htmlFor="amount" className="text-[13px] font-semibold">
              Amount
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step="1"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary/25 h-11 w-full rounded-lg border px-3 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
            />

            <Button type="submit" disabled={topUp.isPending || !amount} className="mt-1 w-full">
              {topUp.isPending ? "Adding…" : `Add ₹${Number(amount || 0).toLocaleString()}`}
            </Button>

            {/* No payment gateway sits behind this; say so rather than implying one. */}
            <p className="text-muted-foreground text-center text-[11px]">
              Top-ups are simulated — no real payment is taken.
            </p>
          </form>

          <div className="mt-6">
            <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wide uppercase">
              Recent activity
            </p>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Nothing yet.</p>
            ) : (
              <ul className="divide-border/60 ring-border/60 divide-y rounded-lg ring-1">
                {transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {tx.note ?? tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}
                      </p>
                      <p className="text-muted-foreground text-[11px]">{formatWhen(tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[13px] font-bold ${
                          tx.type === "DEBIT" ? "text-destructive" : "text-emerald-600"
                        }`}
                      >
                        {tx.type === "DEBIT" ? "−" : "+"}₹{tx.amount.toLocaleString()}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        ₹{tx.balanceAfter.toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
