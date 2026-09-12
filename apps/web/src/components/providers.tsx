"use client";

import { Toaster } from "@my-better-t-app/ui/components/sonner";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // The OrderFlow visual design is light-only for now. Switch back to
    // defaultTheme="system" + enableSystem once the dark palette is designed.
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" disableTransitionOnChange>
      {children}
      <Toaster richColors />
    </ThemeProvider>
  );
}
