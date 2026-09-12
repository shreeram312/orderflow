"use client";

import { Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell, ScriptLines } from "@/components/auth/auth-shell";
import { FormHeading } from "@/components/auth/brand";
import { FormError } from "@/components/auth/form-error";
import { IconField } from "@/components/auth/icon-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { ApiError, api, type FieldErrors } from "@/lib/api";


export function CustomerSignupForm() {
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
      await api.signupCustomer({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        confirmPassword: String(data.get("confirmPassword") ?? ""),
      });

      // This endpoint always creates a CUSTOMER, so the destination is fixed.
      router.replace("/customer");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("Something went wrong");
      }
      setPending(false);
    }
  }

  return (
    <AuthShell
      image="/auth/pizza.jpg"
      imageAlt="A freshly baked pizza on a wooden board"
      aside={<ScriptLines lines={["Good Food", "Just a", "Tap Away"]} />}
    >
      <FormHeading
        title="Create Customer Account"
        subtitle="Sign up to start ordering your favorite meals."
      />

      <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate>
        <FormError message={formError} />

        <IconField
          label="Full Name"
          name="name"
          icon={User}
          placeholder="John Doe"
          autoComplete="name"
          required
          errors={fieldErrors.name}
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

        <SubmitButton pending={pending}>
          {pending ? "Creating account…" : "Create Account"}
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
