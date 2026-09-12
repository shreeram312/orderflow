"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState } from "react";

type IconFieldProps = Omit<React.ComponentProps<"input">, "type" | "prefix"> & {
  label: string;
  name: string;
  icon: LucideIcon;
  /** Password fields get a show/hide toggle instead of a plain input. */
  type?: "text" | "email" | "tel" | "password";
  /** Fixed, non-editable leading segment — e.g. a "+91" dial code. */
  prefix?: string;
  /** Silently strips anything that is not a digit as the user types or pastes. */
  digitsOnly?: boolean;
  /** Caps the digit count. Use this rather than maxLength, which truncates the
   *  raw string before non-digits are stripped and so eats real digits. */
  maxDigits?: number;
  errors?: string[] | undefined;
  /** Lets a field span both columns of the form grid. */
  wrapperClassName?: string;
};

export function IconField({
  label,
  name,
  icon: Icon,
  type = "text",
  prefix,
  digitsOnly,
  maxDigits,
  errors,
  wrapperClassName,
  ...props
}: IconFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const hasError = Boolean(errors?.length);
  const errorId = `${name}-error`;

  return (
    <div className={`grid content-start gap-2 ${wrapperClassName ?? ""}`}>
      <label htmlFor={name} className="text-[13px] font-semibold">
        {label}
      </label>

      <div
        className={[
          "bg-card flex h-11 items-center overflow-hidden rounded-lg border",
          "focus-within:ring-primary/25 focus-within:border-primary focus-within:ring-[3px]",
          hasError ? "border-destructive" : "border-input",
        ].join(" ")}
      >
        <Icon className="text-muted-foreground ml-3 size-4 shrink-0" />

        {prefix ? (
          <span className="border-input text-foreground ml-2 border-r pr-2.5 text-sm select-none">
            {prefix}
          </span>
        ) : null}

        <input
          id={name}
          name={name}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          onInput={
            digitsOnly
              ? (event) => {
                  // Covers typing, pasting and autofill in one place.
                  const input = event.currentTarget;
                  let cleaned = input.value.replace(/\D/g, "");

                  // Someone pasting a full "+91 98765 43210" would otherwise
                  // end up with the dial code occupying the first two slots.
                  const prefixDigits = prefix?.replace(/\D/g, "") ?? "";
                  if (
                    prefixDigits &&
                    maxDigits &&
                    cleaned.length > maxDigits &&
                    cleaned.startsWith(prefixDigits)
                  ) {
                    cleaned = cleaned.slice(prefixDigits.length);
                  }

                  if (maxDigits) cleaned = cleaned.slice(0, maxDigits);
                  if (cleaned !== input.value) input.value = cleaned;
                }
              : undefined
          }
          className="placeholder:text-muted-foreground/60 h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            // Not a tab stop: keyboard users move straight from the field to
            // the next one rather than through a purely visual control.
            tabIndex={-1}
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            className="text-muted-foreground hover:text-foreground mr-3 shrink-0"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>

      {hasError ? (
        <p id={errorId} className="text-destructive text-xs leading-tight">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}
