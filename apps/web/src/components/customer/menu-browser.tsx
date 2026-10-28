"use client";

import { Search, UtensilsCrossed, X } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shell/bits";
import { useCustomerMenu } from "@/hooks/use-customer";
import { MENU_CATEGORIES, type MenuCategory, type MenuItem } from "@/lib/api";
import { titleCase } from "@/lib/format";
import { DishCard } from "./dish-card";

type Filter = MenuCategory | "ALL";

export function MenuBrowser({ initial }: { initial: { isOpen: boolean; items: MenuItem[] } }) {
  const { data = initial } = useCustomerMenu(initial);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  // Only offer tabs for sections that actually have dishes.
  const sections = useMemo(
    () =>
      MENU_CATEGORIES.map((category) => ({
        category,
        items: data.items.filter((item) => item.category === category),
      })).filter((section) => section.items.length > 0),
    [data.items],
  );

  const term = search.trim().toLowerCase();
  const matches = (item: MenuItem) =>
    term.length === 0 ||
    item.name.toLowerCase().includes(term) ||
    (item.description ?? "").toLowerCase().includes(term);

  const visibleSections = sections
    .filter((section) => filter === "ALL" || section.category === filter)
    .map((section) => ({ ...section, items: section.items.filter(matches) }))
    .filter((section) => section.items.length > 0);

  const total = visibleSections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div>
      {/* Sticky under the header so the tabs stay reachable on a long menu. */}
      <div className="bg-background/95 sticky top-14 z-30 -mx-4 mb-5 px-4 pt-1 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="border-border flex items-center gap-4 border-b">
          <nav
            aria-label="Menu sections"
            className="scrollbar-none -mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto"
          >
            <Tab active={filter === "ALL"} onClick={() => setFilter("ALL")} count={data.items.length}>
              All
            </Tab>
            {sections.map((section) => (
              <Tab
                key={section.category}
                active={filter === section.category}
                onClick={() => setFilter(section.category)}
                count={section.items.length}
              >
                {titleCase(section.category)}
              </Tab>
            ))}
          </nav>

          <label className="relative hidden shrink-0 sm:block">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              aria-label="Search dishes"
              className="placeholder:text-muted-foreground/70 focus-visible:bg-card focus-visible:ring-border h-8 w-44 rounded-lg bg-transparent pr-7 pl-8 text-sm transition-[width,background-color] outline-none focus-visible:w-56 focus-visible:ring-1"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 -translate-y-1/2 p-1"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
        </div>

        {/* Phones get the search on its own row. */}
        <label className="relative mt-3 block pb-1 sm:hidden">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-[calc(50%+2px)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes"
            aria-label="Search dishes"
            className="bg-card ring-border placeholder:text-muted-foreground/70 focus-visible:ring-ring/40 h-10 w-full rounded-lg pr-3 pl-9 text-sm ring-1 outline-none focus-visible:ring-2"
          />
        </label>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={data.items.length === 0 ? "Nothing on the menu yet" : "No dishes match"}
          description={
            data.items.length === 0
              ? "The kitchen has not added any dishes. Check back soon."
              : "Try a different word, or clear the search."
          }
          className="bg-card ring-border rounded-xl ring-1"
        />
      ) : (
        <div className="grid gap-8">
          {visibleSections.map((section) => (
            <section key={section.category} aria-labelledby={`section-${section.category}`}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 id={`section-${section.category}`} className="text-lg font-semibold tracking-tight">
                  {titleCase(section.category)}
                </h2>
                <span className="text-muted-foreground tabular text-sm">{section.items.length}</span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {section.items.map((item) => (
                  <DishCard key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition-colors ${
        active
          ? "border-foreground text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground border-transparent"
      }`}
    >
      {children}
      <span
        className={`tabular rounded-md px-1.5 py-px text-[11px] ${
          active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
