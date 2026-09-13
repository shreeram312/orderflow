"use client";

import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";

import { Badge } from "@my-better-t-app/ui/components/badge";

import type { MenuItem } from "@/lib/api";
import { MenuItemActions } from "./menu-item-actions";

const STATUS_VARIANT = { ACTIVE: "success", PAUSED: "warning", ARCHIVED: "muted" } as const;

export function VegDot({ isVeg, className = "size-2.5" }: { isVeg: boolean; className?: string }) {
  return (
    <span
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border ${
        isVeg ? "border-emerald-600" : "border-red-600"
      } ${className}`}
    >
      <span className={`block size-[5px] rounded-full ${isVeg ? "bg-emerald-600" : "bg-red-600"}`} />
    </span>
  );
}

export function Thumb({ item, size = 44 }: { item: MenuItem; size?: number }) {
  if (!item.imageUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-lg"
      >
        <UtensilsCrossed className="size-4" />
      </div>
    );
  }

  return (
    <Image
      src={item.imageUrl}
      alt=""
      width={size}
      height={size}
      // Arbitrary external hosts, so optimisation is bypassed rather than
      // requiring every host to be allowlisted in next.config.
      unoptimized
      style={{ width: size, height: size }}
      className="shrink-0 rounded-lg object-cover"
    />
  );
}

export function StatusBadge({ item }: { item: MenuItem }) {
  return (
    <Badge variant={STATUS_VARIANT[item.status]}>
      {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
    </Badge>
  );
}

export function MenuItemRow({ item, onEdit }: { item: MenuItem; onEdit: (item: MenuItem) => void }) {
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-4">
      <Thumb item={item} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          <VegDot isVeg={item.isVeg} />
          {item.name}
        </p>
        <p className="text-muted-foreground text-[11px]">
          ₹{item.price} · {item.category.charAt(0) + item.category.slice(1).toLowerCase()} ·{" "}
          {item.prepTimeMinutes} min
        </p>
      </div>

      <StatusBadge item={item} />
      <MenuItemActions item={item} onEdit={onEdit} />
    </li>
  );
}
