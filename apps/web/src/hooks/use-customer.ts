"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ApiError,
  api,
  type CustomerOrder,
  type MenuItem,
  type WalletSummary,
} from "@/lib/api";

export const customerKeys = {
  menu: ["customer", "menu"] as const,
  wallet: ["customer", "wallet"] as const,
  walletTransactions: ["customer", "wallet", "transactions"] as const,
  orders: ["customer", "orders"] as const,
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

/** Statuses that a worker or the kitchen will still move on their own. */
const IN_PROGRESS = new Set(["PENDING", "CONFIRMED", "PREPARING", "READY"]);

/** Rejected or cancelled, but the payment worker has not refunded it yet. */
export const isRefundPending = (order: CustomerOrder) =>
  (order.status === "REJECTED" || order.status === "CANCELLED") && !order.refundedAt;

export function useOrders() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: customerKeys.orders,
    queryFn: async () => {
      const orders = (await api.listOrders()).orders;
      const latest = orders[0];
      const previous = queryClient
        .getQueryData<CustomerOrder[]>(customerKeys.orders)
        ?.find((o) => o.id === latest?.id);

      // The refund just landed: the balance moved without this tab doing
      // anything, so re-read the wallet.
      if (latest?.refundedAt && !previous?.refundedAt) {
        void queryClient.invalidateQueries({ queryKey: customerKeys.wallet });
        void queryClient.invalidateQueries({ queryKey: customerKeys.walletTransactions });
      }

      return orders;
    },
    // Workers move the order, not this tab, so the page has to ask. Poll
    // while something is still in flight — including a refund on its way —
    // and stop once everything has settled.
    refetchInterval: (query) => {
      const latest = query.state.data?.[0];
      if (!latest) return false;
      return IN_PROGRESS.has(latest.status) || isRefundPending(latest) ? 3_000 : false;
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.cancelOrder(id)).order,

    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Could not cancel the order");
      // A 409 means the order moved on; show where it actually is.
      void queryClient.invalidateQueries({ queryKey: customerKeys.orders });
    },

    onSuccess: () => {
      toast.success("Order cancelled. Your refund is on its way");
      // The refund itself arrives a moment later via the payment worker, so
      // the wallet is re-read by useOrders once it sees CANCELLED.
      void queryClient.invalidateQueries({ queryKey: customerKeys.orders });
    },
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { menuItemId: string; quantity: number }[]) =>
      (await api.createOrder(items)).order,

    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Could not place the order");
    },

    onSuccess: () => {
      // The order was paid for, so both the balance and the ledger moved.
      void queryClient.invalidateQueries({ queryKey: customerKeys.wallet });
      void queryClient.invalidateQueries({ queryKey: customerKeys.walletTransactions });
      void queryClient.invalidateQueries({ queryKey: customerKeys.orders });
    },
  });
}
