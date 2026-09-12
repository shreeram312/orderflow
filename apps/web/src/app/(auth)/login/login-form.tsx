"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell, ScriptLines } from "@/components/auth/auth-shell";
import { FormHeading } from "@/components/auth/brand";
import { FormError } from "@/components/auth/form-error";
import { IconField } from "@/components/auth/icon-field";
import { RoleTabs } from "@/components/auth/role-tabs";
import { SubmitButton } from "@/components/auth/submit-button";
import { ApiError, api, homePathFor, type FieldErrors, type Role } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [signupFor, setSignupFor] = useState<Role>("CUSTOMER");
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
      const { user } = await api.login({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });

      // The server's role decides the destination, not the tab selection above.
      router.replace(homePathFor(user.role));
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
      image="/auth/signin.jpg"
      imageAlt="A colourful salad bowl"
      priority
      aside={<ScriptLines lines={["Fresh", "Meals", "Happier People"]} />}
    >
      <FormHeading title="Welcome Back" subtitle="Sign in to continue to your account" />

      <form onSubmit={onSubmit} className="mt-6 grid gap-5" noValidate>
        <RoleTabs value={signupFor} onChange={setSignupFor} />

        <FormError message={formError} />

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
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          errors={fieldErrors.password}
        />

        <SubmitButton pending={pending}>{pending ? "Signing in…" : "Sign in"}</SubmitButton>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href={signupFor === "KITCHEN" ? "/signup/kitchen" : "/signup"}
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
