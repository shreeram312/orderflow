import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";

import { Badge } from "@my-better-t-app/ui/components/badge";

import type { MenuItem } from "@/lib/api";
import { getCustomerMenu } from "@/lib/kitchen-data";
import { getSession } from "@/lib/session";

const CATEGORY_ORDER = ["STARTERS", "MAINS", "SIDES", "DESSERTS", "BEVERAGES"] as const;

function label(category: string) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={`inline-block size-3 shrink-0 rounded-[3px] border ${
        isVeg ? "border-emerald-600" : "border-red-600"
      }`}
    >
      <span
        className={`m-[2px] block size-[6px] rounded-full ${isVeg ? "bg-emerald-600" : "bg-red-600"}`}
      />
    </span>
  );
}

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <li className="bg-card ring-border/60 flex gap-3 rounded-xl p-3 shadow-sm ring-1">
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt=""
          width={72}
          height={72}
          unoptimized
          className="size-18 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-18 shrink-0 items-center justify-center rounded-lg">
          <UtensilsCrossed className="size-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <VegDot isVeg={item.isVeg} />
          {item.name}
        </p>
        {item.description ? (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{item.description}</p>
        ) : null}
        <p className="mt-1.5 text-sm font-bold">₹{item.price}</p>
        <p className="text-muted-foreground text-[11px]">~{item.prepTimeMinutes} min</p>
      </div>
    </li>
  );
}

export default async function CustomerMenuPage() {
  const [user, { isOpen, items }] = await Promise.all([getSession(), getCustomerMenu()]);

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <header className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Menu</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Welcome back, {user?.name}</p>
        </div>
        <Badge variant={isOpen ? "success" : "muted"}>
          {isOpen ? "Open — accepting orders" : "Closed"}
        </Badge>
      </header>

      {/* A closed restaurant still shows the menu: browsing is allowed, ordering is not. */}
      {!isOpen ? (
        <p className="bg-muted/60 text-muted-foreground mb-6 rounded-lg px-4 py-3 text-sm">
          The kitchen is closed right now. You can still browse — ordering opens again later.
        </p>
      ) : null}

      {grouped.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">
          Nothing on the menu yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-7">
          {grouped.map((group) => (
            <section key={group.category}>
              <h2 className="text-muted-foreground mb-2.5 text-xs font-bold tracking-wide uppercase">
                {label(group.category)}
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
