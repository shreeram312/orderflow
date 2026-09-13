"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, api, type MenuItem, type WalletSummary } from "@/lib/api";

export const customerKeys = {
  menu: ["customer", "menu"] as const,
  wallet: ["customer", "wallet"] as const,
  walletTransactions: ["customer", "wallet", "transactions"] as const,
};

export function useCustomerMenu(initialData?: { isOpen: boolean; items: MenuItem[] }) {
  return useQuery({
    queryKey: customerKeys.menu,
    queryFn: () => api.getMenu(),
    initialData,
  });
}

export function useWallet(initialData?: WalletSummary) {
  return useQuery({
    queryKey: customerKeys.wallet,
    queryFn: async () => (await api.getWallet()).wallet,
    initialData,
  });
}

export function useWalletTransactions(enabled = true) {
  return useQuery({
    queryKey: customerKeys.walletTransactions,
    queryFn: async () => (await api.listWalletTransactions()).transactions,
    enabled,
  });
}

export function useTopUpWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => (await api.topUpWallet(amount)).wallet,

    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Could not add money");
    },

    onSuccess: (wallet, amount) => {
      queryClient.setQueryData(customerKeys.wallet, wallet);
      // The ledger gained a row; its cache no longer matches.
      void queryClient.invalidateQueries({ queryKey: customerKeys.walletTransactions });
      toast.success(`₹${amount} added to your wallet`);
    },
  });
}
