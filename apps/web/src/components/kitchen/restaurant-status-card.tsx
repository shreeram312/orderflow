"use client";

import { Clock } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import { Switch } from "@my-better-t-app/ui/components/switch";

import { useRestaurantSettings, useUpdateSettings } from "@/hooks/use-kitchen";
import type { RestaurantSettings } from "@/lib/api";

/** "23:00" -> "11:00 PM" */
function formatTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (h === undefined || m === undefined) return value;

  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function RestaurantStatusCard({ initial }: { initial: RestaurantSettings }) {
  const { data: settings = initial } = useRestaurantSettings(initial);
  const updateSettings = useUpdateSettings();
  const [editingHours, setEditingHours] = useState(false);

  function onHoursSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    updateSettings.mutate(
      { opensAt: String(data.get("opensAt") ?? ""), closesAt: String(data.get("closesAt") ?? "") },
      { onSuccess: () => setEditingHours(false) },
    );
  }

  return (
    <section className="bg-card ring-border/60 rounded-xl p-5 shadow-sm ring-1">
      <h2 className="text-sm font-bold">Restaurant Status</h2>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-2xl font-extrabold">
            <span
              aria-hidden
              className={`size-2.5 rounded-full ${settings.isOpen ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
            />
            {settings.isOpen ? "Open" : "Closed"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {settings.isOpen ? "Currently accepting orders" : "Not accepting orders"}
          </p>
        </div>

        <Switch
          checked={settings.isOpen}
          disabled={updateSettings.isPending}
          onCheckedChange={(checked) => updateSettings.mutate({ isOpen: checked })}
          aria-label={settings.isOpen ? "Close restaurant" : "Open restaurant"}
        />
      </div>

      <div className="bg-muted/50 mt-4 rounded-lg p-3">
        {editingHours ? (
          <form onSubmit={onHoursSubmit} className="grid gap-2">
            <p className="text-xs font-semibold">Today&apos;s Hours</p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                name="opensAt"
                defaultValue={settings.opensAt}
                required
                className="border-input bg-card h-9 flex-1 rounded-md border px-2 text-sm"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="time"
                name="closesAt"
                defaultValue={settings.closesAt}
                required
                className="border-input bg-card h-9 flex-1 rounded-md border px-2 text-sm"
              />
            </div>
            <div className="mt-1 flex gap-2">
              <Button type="submit" size="sm" disabled={updateSettings.isPending} className="flex-1">
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingHours(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="text-muted-foreground size-4" />
              <div>
                <p className="text-muted-foreground text-[11px]">Today&apos;s Hours</p>
                <p className="text-sm font-semibold">
                  {formatTime(settings.opensAt)} – {formatTime(settings.closesAt)}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingHours(true)}>
              Edit Hours
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
