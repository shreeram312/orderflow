"use client";

import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Textarea } from "@my-better-t-app/ui/components/textarea";

import { FormError } from "@/components/auth/form-error";
import { Field, VegMark } from "@/components/shell/bits";
import { useCreateMenuItem, useUpdateMenuItem } from "@/hooks/use-kitchen";
import {
  ApiError,
  MENU_CATEGORIES,
  type FieldErrors,
  type MenuCategory,
  type MenuItem,
} from "@/lib/api";
import { titleCase } from "@/lib/format";

/** Add and edit share one form — only the request differs. */
export function MenuItemForm({ item, onDone }: { item?: MenuItem | undefined; onDone: () => void }) {
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const [category, setCategory] = useState<MenuCategory>(item?.category ?? "MAINS");
  const [isVeg, setIsVeg] = useState(item?.isVeg ?? true);
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
      category,
      isVeg,
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
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormError message={formError} />

      <Field label="Name" htmlFor="name" errors={fieldErrors.name}>
        <Input id="name" name="name" defaultValue={item?.name} required autoFocus={!item} placeholder="Paneer butter masala" />
      </Field>

      <Field label="Description" htmlFor="description" hint="Optional" errors={fieldErrors.description}>
        <Textarea
          id="description"
          name="description"
          defaultValue={item?.description ?? ""}
          placeholder="A line or two customers will see under the name"
          className="min-h-16"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price" htmlFor="price" errors={fieldErrors.price}>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              ₹
            </span>
            <Input
              id="price"
              name="price"
              type="number"
              min={1}
              step="0.01"
              inputMode="decimal"
              defaultValue={item?.price}
              required
              className="tabular pl-7"
            />
          </div>
        </Field>

        <Field label="Prep time" htmlFor="prepTimeMinutes" errors={fieldErrors.prepTimeMinutes}>
          <div className="relative">
            <Input
              id="prepTimeMinutes"
              name="prepTimeMinutes"
              type="number"
              min={1}
              max={180}
              inputMode="numeric"
              defaultValue={item?.prepTimeMinutes ?? 10}
              required
              className="tabular pr-12"
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
              min
            </span>
          </div>
        </Field>
      </div>

      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium">Section</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Section">
          {MENU_CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategory(c)}
                className={`h-8 rounded-lg px-3 text-[13px] font-medium ring-1 transition-colors ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-card text-muted-foreground ring-border hover:text-foreground"
                }`}
              >
                {titleCase(c)}
              </button>
            );
          })}
        </div>
        {fieldErrors.category?.length ? (
          <p className="text-destructive text-xs">{fieldErrors.category[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium">Type</span>
        <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup" aria-label="Type">
          {[
            { value: true, label: "Vegetarian" },
            { value: false, label: "Non-vegetarian" },
          ].map((option) => {
            const active = isVeg === option.value;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setIsVeg(option.value)}
                className={`flex h-8 items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-colors ${
                  active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <VegMark isVeg={option.value} className="size-3" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Photo URL" htmlFor="imageUrl" hint="Optional" errors={fieldErrors.imageUrl}>
        <Input
          id="imageUrl"
          name="imageUrl"
          type="url"
          inputMode="url"
          defaultValue={item?.imageUrl ?? ""}
          placeholder="https://…"
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending ? "Saving…" : item ? "Save changes" : "Add to menu"}
      </Button>
    </form>
  );
}
