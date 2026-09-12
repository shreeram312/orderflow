"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ApiError,
  api,
  type MenuItem,
  type MenuItemInput,
  type MenuItemStatus,
  type RestaurantSettings,
} from "@/lib/api";

export const kitchenKeys = {
  menu: ["kitchen", "menu"] as const,
  settings: ["kitchen", "settings"] as const,
};

function reportError(error: unknown) {
  toast.error(error instanceof ApiError ? error.message : "Something went wrong");
}

export function useKitchenMenu(initialData?: MenuItem[]) {
  return useQuery({
    queryKey: kitchenKeys.menu,
    queryFn: async () => (await api.listKitchenMenu({ includeArchived: true })).items,
    initialData,
  });
}

export function useRestaurantSettings(initialData?: RestaurantSettings) {
  return useQuery({
    queryKey: kitchenKeys.settings,
    queryFn: async () => (await api.getSettings()).settings,
    initialData,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<RestaurantSettings>) =>
      (await api.updateSettings(input)).settings,

    // Optimistic: the open/closed switch must feel instant.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: kitchenKeys.settings });
      const previous = queryClient.getQueryData<RestaurantSettings>(kitchenKeys.settings);

      if (previous) {
        queryClient.setQueryData<RestaurantSettings>(kitchenKeys.settings, {
          ...previous,
          ...input,
        });
      }

      return { previous };
    },

    onError: (error, _input, context) => {
      // Roll back to the snapshot taken in onMutate.
      if (context?.previous) queryClient.setQueryData(kitchenKeys.settings, context.previous);
      reportError(error);
    },

    onSuccess: (settings) => {
      queryClient.setQueryData(kitchenKeys.settings, settings);
      toast.success(settings.isOpen ? "Restaurant is open" : "Restaurant is closed");
    },
  });
}

/** Shared cache write so every menu mutation lands the same way. */
function useMenuMutation<TVariables>(
  mutationFn: (vars: TVariables) => Promise<MenuItem>,
  successMessage: (item: MenuItem) => string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onError: reportError,
    onSuccess: (item) => {
      queryClient.setQueryData<MenuItem[]>(kitchenKeys.menu, (current) => {
        const list = current ?? [];
        const exists = list.some((i) => i.id === item.id);
        const next = exists ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item];

        return next.sort(
          (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
        );
      });

      // The customer menu derives from the same rows, so its cache is stale now.
      void queryClient.invalidateQueries({ queryKey: ["customer", "menu"] });
      toast.success(successMessage(item));
    },
  });
}

export function useCreateMenuItem() {
  return useMenuMutation(
    async (input: MenuItemInput) => (await api.createMenuItem(input)).item,
    (item) => `${item.name} added`,
  );
}

export function useUpdateMenuItem() {
  return useMenuMutation(
    async ({ id, input }: { id: string; input: Partial<MenuItemInput> }) =>
      (await api.updateMenuItem(id, input)).item,
    (item) => `${item.name} updated`,
  );
}

export function useSetMenuItemStatus() {
  return useMenuMutation(
    async ({ id, status }: { id: string; status: MenuItemStatus }) =>
      (await api.setMenuItemStatus(id, status)).item,
    (item) => (item.status === "ACTIVE" ? `${item.name} is back on` : `${item.name} paused`),
  );
}

export function useArchiveMenuItem() {
  return useMenuMutation(
    async (id: string) => (await api.archiveMenuItem(id)).item,
    (item) => `${item.name} archived`,
  );
}
