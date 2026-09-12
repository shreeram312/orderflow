"use client";

import { Archive, MoreVertical, Pause, Pencil, Play, UtensilsCrossed } from "lucide-react";
import Image from "next/image";

import { Badge } from "@my-better-t-app/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";

import { useArchiveMenuItem, useSetMenuItemStatus } from "@/hooks/use-kitchen";
import type { MenuItem } from "@/lib/api";

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
      <span
        className={`block size-[5px] rounded-full ${isVeg ? "bg-emerald-600" : "bg-red-600"}`}
      />
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

export function MenuItemRow({ item, onEdit }: { item: MenuItem; onEdit: (item: MenuItem) => void }) {
  const setStatus = useSetMenuItemStatus();
  const archive = useArchiveMenuItem();

  return (
    <li className="flex items-center gap-3 px-5 py-3">
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

      <Badge variant={STATUS_VARIANT[item.status]}>
        {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${item.name}`}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>

          {item.status === "ACTIVE" ? (
            <DropdownMenuItem onClick={() => setStatus.mutate({ id: item.id, status: "PAUSED" })}>
              <Pause className="size-4" />
              Pause
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setStatus.mutate({ id: item.id, status: "ACTIVE" })}>
              <Play className="size-4" />
              Resume
            </DropdownMenuItem>
          )}

          {item.status !== "ARCHIVED" ? (
            <DropdownMenuItem onClick={() => archive.mutate(item.id)}>
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
