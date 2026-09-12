"use client";

import { KeyRound, Lock, Mail, Phone, Store, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell, ScriptLines } from "@/components/auth/auth-shell";
import { FormHeading } from "@/components/auth/brand";
import { FormError } from "@/components/auth/form-error";
import { IconField } from "@/components/auth/icon-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { ApiError, api, type FieldErrors } from "@/lib/api";

export function KitchenSignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    const data = new FormData(event.currentTarget);

    try {
      await api.signupKitchen({
        name: String(data.get("name") ?? ""),
        restaurantName: String(data.get("restaurantName") ?? ""),
        phone: `+91${String(data.get("phone") ?? "")}`,
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        confirmPassword: String(data.get("confirmPassword") ?? ""),
        code: String(data.get("code") ?? ""),
      });

      router.replace("/kitchen");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        // A wrong code comes back as 403 with no field errors, so surface it
        // on the code input where the user can actually act on it.
        if (error.code === "FORBIDDEN") {
          setFieldErrors({ code: [error.message] });
          setFormError(null);
        } else {
          setFormError(error.message);
          setFieldErrors(error.fieldErrors);
        }
      } else {
        setFormError("Something went wrong");
      }
      setPending(false);
    }
  }

  return (
    <AuthShell
      image="/auth/kitchen.jpg"
      imageAlt="Two people cooking together in a kitchen"
      aside={<ScriptLines lines={["Great Food", "Starts with", "Great People"]} />}
    >
      <FormHeading
        title="Staff Sign Up"
        subtitle="For kitchen staff only. You will need the signup code."
      />

      <form
        onSubmit={onSubmit}
        className="mt-6 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2"
        noValidate
      >
        <FormError message={formError} className="sm:col-span-2" />

        <IconField
          label="Restaurant Name"
          name="restaurantName"
          icon={Store}
          placeholder="Awesome Kitchen"
          autoComplete="organization"
          required
          errors={fieldErrors.restaurantName}
        />
        <IconField
          label="Your Name"
          name="name"
          icon={User}
          placeholder="Suresh Kumar"
          autoComplete="name"
          required
          errors={fieldErrors.name}
        />
        <IconField
          label="Phone"
          name="phone"
          type="tel"
          icon={Phone}
          prefix="+91"
          digitsOnly
          maxDigits={10}
          inputMode="numeric"
          placeholder="98765 43210"
          autoComplete="tel-national"
          required
          errors={fieldErrors.phone}
        />
        <IconField
          label="Email"
          name="email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          required
          errors={fieldErrors.email}
        />
        <IconField
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          placeholder="Create a password"
          autoComplete="new-password"
          required
          errors={fieldErrors.password}
        />
        <IconField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          icon={Lock}
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
          errors={fieldErrors.confirmPassword}
        />
        <IconField
          label="Staff Signup Code"
          name="code"
          type="password"
          icon={KeyRound}
          placeholder="Enter the signup code"
          autoComplete="off"
          required
          errors={fieldErrors.code}
          wrapperClassName="sm:col-span-2"
        />

        <SubmitButton pending={pending} className="sm:col-span-2">
          {pending ? "Creating account…" : "Create Staff Account"}
        </SubmitButton>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-semibold underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
