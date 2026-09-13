"use client";

import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@my-better-t-app/ui/components/alert-dialog";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";

import { useArchiveMenuItem, useSetMenuItemStatus } from "@/hooks/use-kitchen";
import type { MenuItem } from "@/lib/api";

/**
 * Row actions for a menu item, in the same shape as the admin app's
 * RowActions: a ghost icon trigger, right-aligned content, and a destructive
 * final action behind a confirmation.
 */
export function MenuItemActions({
  item,
  onEdit,
}: {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
}) {
  const setStatus = useSetMenuItemStatus();
  const archive = useArchiveMenuItem();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Actions for ${item.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          {item.status === "ACTIVE" ? (
            <DropdownMenuItem onClick={() => setStatus.mutate({ id: item.id, status: "PAUSED" })}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setStatus.mutate({ id: item.id, status: "ACTIVE" })}>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </DropdownMenuItem>
          )}

          {item.status !== "ARCHIVED" ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove from menu
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {item.name} from the menu?</AlertDialogTitle>
            <AlertDialogDescription>
              Customers will stop seeing it immediately. Past orders keep their record of it, and
              you can bring it back from the archived list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archive.mutate(item.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
