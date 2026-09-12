"use client";

import { ChefHat, User } from "lucide-react";

import type { Role } from "@/lib/api";

/**
 * Switches which account type the sign-up link points at, and nothing else.
 *
 * It deliberately does NOT affect the login request: the server reads the
 * role from the user's row, so a kitchen account signs in correctly even with
 * "Customer" selected here. Sending a role from the client would either be
 * ignored or, if honoured, let anyone promote themselves.
 */
export function RoleTabs({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  const tabs = [
    { role: "CUSTOMER" as const, label: "Customer", Icon: User },
    { role: "KITCHEN" as const, label: "Kitchen Staff", Icon: ChefHat },
  ];

  return (
    <div className="bg-muted/60 grid grid-cols-2 gap-1 rounded-xl p-1">
      {tabs.map(({ role, label, Icon }) => {
        const active = value === role;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            aria-pressed={active}
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={
              active
                ? { background: "var(--brand-orange-soft)", color: "var(--brand-orange)" }
                : undefined
            }
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
