"use client";

import { useEffect, useState } from "react";

import { greeting } from "@/lib/format";

/**
 * "Good evening, Shreeram". The time of day is the visitor's, not the
 * server's, so it is settled after mount — the server renders a neutral
 * "Hello" that does not depend on a clock.
 */
export function Greeting({ name, isOpen }: { name: string; isOpen: boolean }) {
  const [salutation, setSalutation] = useState("Hello");
  useEffect(() => setSalutation(greeting()), []);

  const firstName = name.split(" ")[0] ?? name;

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
        {salutation}, {firstName}
      </h1>
      <p className="text-muted-foreground mt-1 text-[15px]">
        {isOpen
          ? "The kitchen is open. Order now and they will start on it straight away."
          : "The kitchen is closed right now. Browse the menu and come back when it reopens."}
      </p>
    </div>
  );
}
