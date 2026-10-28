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
    { role: "KITCHEN" as const, label: "Kitchen staff", Icon: ChefHat },
  ];

  return (
    <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup">
      {tabs.map(({ role, label, Icon }) => {
        const active = value === role;

        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(role)}
            className={`flex h-9 items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-colors ${
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
