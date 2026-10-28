"use client";

import { ArrowDownLeft, ArrowUpRight, RotateCcw, X } from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@my-better-t-app/ui/components/sheet";
import { useResponsiveSheetSide } from "@my-better-t-app/ui/hooks/use-responsive-sheet-side";

import { FormError } from "@/components/auth/form-error";
import { EmptyState, Field } from "@/components/shell/bits";
import { useTopUpWallet, useWallet, useWalletTransactions } from "@/hooks/use-customer";
import { ApiError, type WalletTransaction } from "@/lib/api";
import { money, when } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* One sheet, opened from anywhere: the header pill, the cart's short-  */
/* balance notice.                                                      */
/* ------------------------------------------------------------------ */

const WalletSheetContext = createContext<{ openWallet: () => void } | null>(null);

export function WalletSheetProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openWallet: () => setOpen(true) }), []);

  return (
    <WalletSheetContext.Provider value={value}>
      {children}
      <WalletSheet open={open} onOpenChange={setOpen} />
    </WalletSheetContext.Provider>
  );
}

export function useWalletSheet() {
  const value = useContext(WalletSheetContext);
  if (!value) throw new Error("useWalletSheet must be used inside WalletSheetProvider");
  return value;
}

/* ------------------------------------------------------------------ */

const PRESETS = [200, 500, 1000, 2000];

const TX_META: Record<
  WalletTransaction["type"],
  { label: string; icon: typeof ArrowUpRight; tone: string; sign: string }
> = {
  TOPUP: { label: "Added money", icon: ArrowDownLeft, tone: "text-emerald-700", sign: "+" },
  REFUND: { label: "Refund", icon: RotateCcw, tone: "text-emerald-700", sign: "+" },
  DEBIT: { label: "Order", icon: ArrowUpRight, tone: "text-foreground", sign: "−" },
};

function WalletSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { sheetSide } = useResponsiveSheetSide();
  const { data: wallet } = useWallet();
  const topUp = useTopUpWallet();
  // Only fetch the ledger while the sheet is actually open.
  const { data: transactions = [], isLoading } = useWalletTransactions(open);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!valid) {
      setError("Enter an amount greater than zero");
      return;
    }

    topUp.mutate(parsed, {
      onSuccess: () => setAmount(""),
      onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add money"),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        key={sheetSide}
        side={sheetSide}
        closeButton={null}
        className={
          sheetSide === "bottom"
            ? "flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl p-0"
            : "flex flex-col overflow-hidden p-0 sm:max-w-md"
        }
      >
        <SheetTitle className="sr-only">Wallet</SheetTitle>

        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            <p className="text-muted-foreground text-[13px]">Wallet balance</p>
            <p className="tabular mt-0.5 text-[32px] leading-none font-semibold tracking-tight">
              {wallet ? money(wallet.balance) : "—"}
            </p>
          </div>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
              <X />
            </Button>
          </SheetClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <form onSubmit={submit} className="grid gap-3" noValidate>
            <FormError message={error} />

            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((preset) => {
                const active = amount === String(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`tabular h-9 rounded-lg text-[13px] font-medium ring-1 transition-colors ${
                      active
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-card ring-border hover:ring-foreground/25"
                    }`}
                  >
                    +{money(preset)}
                  </button>
                );
              })}
            </div>

            <Field label="Amount" htmlFor="amount">
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  ₹
                </span>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min={1}
                  step="1"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  className="tabular h-11 pl-7 text-base"
                />
              </div>
            </Field>

            <Button type="submit" size="lg" disabled={topUp.isPending || !valid} className="w-full">
              {topUp.isPending ? "Adding…" : valid ? `Add ${money(parsed)}` : "Add money"}
            </Button>

            {/* No payment gateway sits behind this; say so rather than implying one. */}
            <p className="text-muted-foreground text-center text-xs">
              Top-ups are simulated. No real payment is taken.
            </p>
          </form>

          <div className="mt-8">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Activity
            </p>

            {isLoading ? (
              <div className="grid gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-muted h-12 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState icon={ArrowDownLeft} title="Nothing yet" className="py-8" />
            ) : (
              <ul className="divide-border ring-border divide-y rounded-xl ring-1">
                {transactions.map((tx) => {
                  const meta = TX_META[tx.type];
                  const Icon = meta.icon;
                  return (
                    <li key={tx.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{tx.note ?? meta.label}</p>
                        <p className="text-muted-foreground text-xs">{when(tx.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`tabular text-[13px] font-semibold ${meta.tone}`}>
                          {meta.sign}
                          {money(tx.amount)}
                        </p>
                        <p className="text-muted-foreground tabular text-xs">
                          {money(tx.balanceAfter)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
