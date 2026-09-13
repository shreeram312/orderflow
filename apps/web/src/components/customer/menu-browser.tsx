"use client";

import { Plus, Search, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";

import { useCustomerMenu } from "@/hooks/use-customer";
import { type MenuCategory, type MenuItem } from "@/lib/api";

const CATEGORY_ORDER: MenuCategory[] = ["STARTERS", "MAINS", "SIDES", "DESSERTS", "BEVERAGES"];

function label(category: MenuCategory) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={`inline-flex size-3 shrink-0 items-center justify-center rounded-[3px] border ${
        isVeg ? "border-emerald-600" : "border-red-600"
      }`}
    >
      <span className={`block size-[6px] rounded-full ${isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
    </span>
  );
}

function DishCard({ item }: { item: MenuItem }) {
  return (
    <li className="bg-card ring-border/60 flex flex-col overflow-hidden rounded-xl shadow-sm ring-1">
      <div className="bg-muted relative aspect-[4/3] w-full">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <UtensilsCrossed className="size-7" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <VegDot isVeg={item.isVeg} />
          <span className="truncate">{item.name}</span>
        </p>
        <p className="text-muted-foreground mt-1 line-clamp-2 min-h-[2.2rem] text-xs">
          {item.description ?? `Ready in about ${item.prepTimeMinutes} min`}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-base font-extrabold">₹{item.price.toLocaleString()}</p>
          {/* Visual only until the cart exists — see CartPanel. */}
          <Button
            type="button"
            size="sm"
            disabled
            title="Ordering arrives with the cart"
            style={{ background: "var(--brand-orange-soft)", color: "var(--brand-orange)" }}
          >
            Add
            <Plus />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function MenuBrowser({ initial }: { initial: { isOpen: boolean; items: MenuItem[] } }) {
  const { data = initial } = useCustomerMenu(initial);
  const [category, setCategory] = useState<MenuCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");

  // Only offer tabs for sections that actually have dishes.
  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => data.items.some((i) => i.category === c)),
    [data.items],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return data.items.filter((item) => {
      const matchesCategory = category === "ALL" || item.category === category;
      const matchesSearch =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        (item.description ?? "").toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [data.items, category, search]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Button
            type="button"
            size="sm"
            variant={category === "ALL" ? "default" : "outline"}
            onClick={() => setCategory("ALL")}
            className={
              category === "ALL"
                ? "shrink-0 text-white"
                : "bg-card shrink-0"
            }
            style={category === "ALL" ? { background: "var(--brand-orange)" } : undefined}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={category === c ? "default" : "outline"}
              onClick={() => setCategory(c)}
              className={category === c ? "shrink-0 text-white" : "bg-card shrink-0"}
              style={category === c ? { background: "var(--brand-orange)" } : undefined}
            >
              {label(c)}
            </Button>
          ))}
        </div>

        <div className="relative lg:w-72">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for dishes..."
            aria-label="Search dishes"
            className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary/25 h-10 w-full rounded-lg border pr-3 pl-9 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground bg-card ring-border/60 rounded-xl py-16 text-center text-sm shadow-sm ring-1">
          {data.items.length === 0
            ? "Nothing on the menu yet. Check back soon."
            : "No dishes match that search."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
