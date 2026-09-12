"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";

import { FormError } from "@/components/auth/form-error";
import { useCreateMenuItem, useUpdateMenuItem } from "@/hooks/use-kitchen";
import { ApiError, MENU_CATEGORIES, type FieldErrors, type MenuCategory, type MenuItem } from "@/lib/api";

const inputClass =
  "border-input bg-card focus-visible:border-primary focus-visible:ring-primary/25 h-10 w-full rounded-lg border px-3 text-sm focus-visible:ring-[3px] focus-visible:outline-none";

function Field({
  label,
  htmlFor,
  errors,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[] | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {errors?.length ? <p className="text-destructive text-xs leading-tight">{errors[0]}</p> : null}
    </div>
  );
}

/** Add and edit share one form — only the request differs. */
export function MenuItemForm({
  item,
  onDone,
}: {
  item?: MenuItem | undefined;
  onDone: () => void;
}) {
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const pending = createItem.isPending || updateItem.isPending;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const data = new FormData(event.currentTarget);
    const imageUrl = String(data.get("imageUrl") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();

    const input = {
      name: String(data.get("name") ?? "").trim(),
      price: Number(data.get("price")),
      category: String(data.get("category")) as MenuCategory,
      isVeg: data.get("isVeg") === "on",
      prepTimeMinutes: Number(data.get("prepTimeMinutes")),
      // Omit rather than send "" — the server validates these as a URL and a
      // non-empty string, and "" fails both.
      ...(imageUrl ? { imageUrl } : {}),
      ...(description ? { description } : {}),
    };

    const onError = (error: unknown) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("Something went wrong");
      }
    };

    if (item) {
      updateItem.mutate({ id: item.id, input }, { onSuccess: onDone, onError });
    } else {
      createItem.mutate(input, { onSuccess: onDone, onError });
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5" noValidate>
      <FormError message={formError} />

      <Field label="Name" htmlFor="name" errors={fieldErrors.name}>
        <input id="name" name="name" defaultValue={item?.name} required className={inputClass} />
      </Field>

      <Field label="Description" htmlFor="description" errors={fieldErrors.description}>
        <input
          id="description"
          name="description"
          defaultValue={item?.description ?? ""}
          placeholder="Optional"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Price (₹)" htmlFor="price" errors={fieldErrors.price}>
          <input
            id="price"
            name="price"
            type="number"
            min={1}
            step="0.01"
            defaultValue={item?.price}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Prep time (min)" htmlFor="prepTimeMinutes" errors={fieldErrors.prepTimeMinutes}>
          <input
            id="prepTimeMinutes"
            name="prepTimeMinutes"
            type="number"
            min={1}
            max={180}
            defaultValue={item?.prepTimeMinutes ?? 10}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Category" htmlFor="category" errors={fieldErrors.category}>
        <select
          id="category"
          name="category"
          defaultValue={item?.category ?? "MAINS"}
          className={inputClass}
        >
          {MENU_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Image URL" htmlFor="imageUrl" errors={fieldErrors.imageUrl}>
        <input
          id="imageUrl"
          name="imageUrl"
          defaultValue={item?.imageUrl ?? ""}
          placeholder="Optional — https://…"
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isVeg"
          defaultChecked={item?.isVeg ?? true}
          className="accent-primary size-4"
        />
        Vegetarian
      </label>

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Saving…" : item ? "Save changes" : "Add item"}
      </Button>
    </form>
  );
}
