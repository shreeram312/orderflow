"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@my-better-t-app/ui/components/button";

import { api } from "@/lib/api";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await api.logout();
    } finally {
      router.replace("/login");
      // Forces the server components to re-read the now-cleared cookie.
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
