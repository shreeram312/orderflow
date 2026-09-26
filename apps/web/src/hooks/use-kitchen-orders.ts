"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, api, type KitchenOrder, type KitchenStatus } from "@/lib/api";

export const kitchenOrderKeys = {
  board: ["kitchen", "orders"] as const,
};

/** What each transition is called on the button and in the toast. */
export const NEXT_ACTION: Record<string, { label: string; status: KitchenStatus }> = {
  CONFIRMED: { label: "Start preparing", status: "PREPARING" },
  PREPARING: { label: "Mark ready", status: "READY" },
  READY: { label: "Hand over", status: "COMPLETED" },
};

export function useKitchenOrders(initialData?: KitchenOrder[]) {
  return useQuery({
    queryKey: kitchenOrderKeys.board,
    queryFn: async () => (await api.listKitchenOrders()).orders,
    initialData,
    // Orders arrive from a worker, not from anything this tab did, so the board
    // has to ask. Ten seconds is the cheap version of a websocket.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useSetOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: KitchenStatus }) =>
      (await api.setOrderStatus(id, status)).order,

    // Optimistic: a chef tapping a ticket should see it move immediately, not
    // after a round trip with their hands full.
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: kitchenOrderKeys.board });
      const previous = queryClient.getQueryData<KitchenOrder[]>(kitchenOrderKeys.board);

      queryClient.setQueryData<KitchenOrder[]>(kitchenOrderKeys.board, (current) =>
        (current ?? []).map((order) => (order.id === id ? { ...order, status } : order)),
      );

      return { previous };
    },

    onError: (error, _vars, context) => {
      // Put the board back exactly as it was, then say why.
      if (context?.previous) {
        queryClient.setQueryData(kitchenOrderKeys.board, context.previous);
      }

      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    },

    onSuccess: (order) => {
      queryClient.setQueryData<KitchenOrder[]>(kitchenOrderKeys.board, (current) =>
        // COMPLETED orders drop off the live board — the server stops returning
        // them, so remove the row rather than leaving a stale card behind.
        (current ?? [])
          .map((row) => (row.id === order.id ? order : row))
          .filter((row) => row.status !== "COMPLETED"),
      );

      toast.success(
        order.status === "COMPLETED"
          ? "Order handed over"
          : `Order marked ${order.status.toLowerCase()}`,
      );
    },
  });
}
