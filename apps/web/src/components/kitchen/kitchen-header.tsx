"use client";

import { Clock, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@my-better-t-app/ui/components/sheet";
import { Switch } from "@my-better-t-app/ui/components/switch";

import { Dot, Field } from "@/components/shell/bits";
import { Brand } from "@/components/shell/brand";
import { UserMenu } from "@/components/shell/user-menu";
import { useRestaurantSettings, useUpdateSettings } from "@/hooks/use-kitchen";
import type { PublicUser, RestaurantSettings } from "@/lib/api";
import { clock } from "@/lib/format";

/**
 * Brand, the open/closed switch, and the account menu. The switch lives here
 * because it is the one control staff reach for all day, and this is the only
 * place it exists.
 */
export function KitchenHeader({
  user,
  initialSettings,
}: {
  user: PublicUser;
  initialSettings: RestaurantSettings;
}) {
  const { data: settings = initialSettings } = useRestaurantSettings(initialSettings);
  const update = useUpdateSettings();
  const [hoursOpen, setHoursOpen] = useState(false);

  return (
    <header className="bg-background/85 border-border sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <Brand href="/kitchen" />

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setHoursOpen(true)}
            className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-[13px] md:inline-flex"
          >
            <Clock className="size-3.5" strokeWidth={1.75} />
            <span className="tabular">
              {clock(settings.opensAt)} – {clock(settings.closesAt)}
            </span>
          </button>

          <label
            className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-lg pr-2 pl-3 text-sm font-medium ring-1 transition-colors select-none ${
              settings.isOpen
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-muted text-muted-foreground ring-border"
            }`}
          >
            <Dot tone={settings.isOpen ? "success" : "muted"} pulse={settings.isOpen} />
            <span className="w-11">{settings.isOpen ? "Open" : "Closed"}</span>
            <Switch
              checked={settings.isOpen}
              disabled={update.isPending}
              onCheckedChange={(checked) => update.mutate({ isOpen: checked })}
              aria-label={settings.isOpen ? "Close the restaurant" : "Open the restaurant"}
              className="data-[state=checked]:bg-emerald-600"
            />
          </label>

          <UserMenu user={user} />
        </div>
      </div>

      <HoursSheet open={hoursOpen} onOpenChange={setHoursOpen} settings={settings} />
    </header>
  );
}

function HoursSheet({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: RestaurantSettings;
}) {
  const update = useUpdateSettings();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    update.mutate(
      {
        name: String(data.get("name") ?? "").trim() || settings.name,
        opensAt: String(data.get("opensAt") ?? ""),
        closesAt: String(data.get("closesAt") ?? ""),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeButton={null} className="p-0 sm:max-w-sm">
        <SheetTitle className="sr-only">Restaurant details</SheetTitle>
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <p className="text-base font-semibold">Restaurant details</p>
            <p className="text-muted-foreground text-[13px]">
              Hours are shown to customers. The switch in the header decides whether orders are
              taken.
            </p>
          </div>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
              <X />
            </Button>
          </SheetClose>
        </div>

        <form onSubmit={submit} className="grid gap-4 px-5 pt-5">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" defaultValue={settings.name} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opens" htmlFor="opensAt">
              <Input id="opensAt" name="opensAt" type="time" defaultValue={settings.opensAt} required className="tabular" />
            </Field>
            <Field label="Closes" htmlFor="closesAt">
              <Input id="closesAt" name="closesAt" type="time" defaultValue={settings.closesAt} required className="tabular" />
            </Field>
          </div>
          <Button type="submit" disabled={update.isPending} className="mt-1">
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
