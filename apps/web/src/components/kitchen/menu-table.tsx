"use client";

import { Plus, Search, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";
import { Switch } from "@my-better-t-app/ui/components/switch";

import { EmptyState, VegMark } from "@/components/shell/bits";
import { useSetMenuItemStatus } from "@/hooks/use-kitchen";
import { MENU_CATEGORIES, type MenuItem, type MenuItemStatus } from "@/lib/api";
import { money, titleCase } from "@/lib/format";
import { MenuItemActions } from "./menu-item-actions";
import { MenuItemSheet, type MenuSheetState } from "./menu-item-sheet";

type Filter = "LISTED" | MenuItemStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "LISTED", label: "On the menu" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

const STATUS_BADGE = { ACTIVE: "success", PAUSED: "warning", ARCHIVED: "muted" } as const;

/**
 * The whole menu on one screen, grouped by section. Pausing is a switch on
 * the row because "we've run out" is the thing staff do most; everything else
 * sits behind the row menu.
 */
export function MenuTable({ items }: { items: MenuItem[] }) {
  const [filter, setFilter] = useState<Filter>("LISTED");
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState<MenuSheetState>({ open: false });

  const counts = useMemo(
    () => ({
      LISTED: items.filter((i) => i.status !== "ARCHIVED").length,
      ACTIVE: items.filter((i) => i.status === "ACTIVE").length,
      PAUSED: items.filter((i) => i.status === "PAUSED").length,
      ARCHIVED: items.filter((i) => i.status === "ARCHIVED").length,
    }),
    [items],
  );

  const term = search.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      (filter === "LISTED" ? item.status !== "ARCHIVED" : item.status === filter) &&
      (term.length === 0 || item.name.toLowerCase().includes(term)),
  );

  const sections = MENU_CATEGORIES.map((category) => ({
    category,
    items: visible.filter((item) => item.category === category),
  })).filter((section) => section.items.length > 0);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium ring-1 transition-colors ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-card text-muted-foreground ring-border hover:text-foreground"
                }`}
              >
                {f.label}
                <span className={`tabular text-xs ${active ? "opacity-70" : "opacity-60"}`}>
                  {counts[f.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label className="relative flex-1 sm:flex-none">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search menu"
              className="bg-card ring-border placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 h-9 w-full rounded-lg pr-3 pl-8 text-sm ring-1 outline-none focus-visible:ring-2 sm:w-48"
            />
          </label>
          <Button type="button" size="sm" className="h-9" onClick={() => setSheet({ open: true, view: "create" })}>
            <Plus />
            Add dish
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={items.length === 0 ? "No dishes yet" : "Nothing here"}
          description={
            items.length === 0
              ? "Add your first dish and it will show up on the customer menu straight away."
              : "No dishes match this filter."
          }
          action={
            items.length === 0 ? (
              <Button type="button" size="sm" onClick={() => setSheet({ open: true, view: "create" })}>
                <Plus />
                Add dish
              </Button>
            ) : undefined
          }
          className="bg-card ring-border rounded-xl ring-1"
        />
      ) : (
        <div className="grid gap-6">
          {sections.map((section) => (
            <section key={section.category}>
              <div className="mb-2 flex items-baseline gap-2 px-1">
                <h3 className="text-sm font-semibold">{titleCase(section.category)}</h3>
                <span className="text-muted-foreground tabular text-xs">{section.items.length}</span>
              </div>
              <ul className="bg-card ring-border divide-border divide-y overflow-hidden rounded-xl ring-1">
                {section.items.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    onEdit={(target) => setSheet({ open: true, view: "edit", item: target })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <MenuItemSheet state={sheet} onStateChange={setSheet} />
    </div>
  );
}

function Row({ item, onEdit }: { item: MenuItem; onEdit: (item: MenuItem) => void }) {
  const setStatus = useSetMenuItemStatus();
  const archived = item.status === "ARCHIVED";
  const busy = setStatus.isPending && setStatus.variables?.id === item.id;

  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 ${archived ? "opacity-60" : ""}`}>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4"
      >
        <Thumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <VegMark isVeg={item.isVeg} className="size-3" />
            <span className="truncate">{item.name}</span>
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {item.description || `${item.prepTimeMinutes} min prep`}
          </p>
        </div>
      </button>

      <span className="text-muted-foreground tabular hidden w-14 text-right text-xs md:block">
        {item.prepTimeMinutes} min
      </span>
      <span className="tabular w-16 text-right text-sm font-semibold">{money(item.price)}</span>

      <span className="hidden w-20 justify-end sm:flex">
        <Badge variant={STATUS_BADGE[item.status]}>{titleCase(item.status)}</Badge>
      </span>

      {!archived ? (
        <Switch
          checked={item.status === "ACTIVE"}
          disabled={busy}
          onCheckedChange={(checked) =>
            setStatus.mutate({ id: item.id, status: checked ? "ACTIVE" : "PAUSED" })
          }
          aria-label={item.status === "ACTIVE" ? `Pause ${item.name}` : `Resume ${item.name}`}
          className="data-[state=checked]:bg-emerald-600"
        />
      ) : (
        <span className="w-11" aria-hidden />
      )}

      <MenuItemActions item={item} onEdit={onEdit} />
    </li>
  );
}

function Thumb({ item }: { item: MenuItem }) {
  return (
    <span className="bg-muted relative block size-11 shrink-0 overflow-hidden rounded-lg">
      {item.imageUrl ? (
        <Image src={item.imageUrl} alt="" fill unoptimized sizes="44px" className="object-cover" />
      ) : (
        <span className="text-muted-foreground/50 flex h-full items-center justify-center">
          <UtensilsCrossed className="size-4" strokeWidth={1.5} />
        </span>
      )}
    </span>
  );
}
