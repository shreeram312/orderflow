"use client";

import { useEffect, useState } from "react";

function matchesNow(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(query).matches;
}

/**
 * Seeded from `matchMedia` during the first render rather than in an effect.
 * Starting at `false` reports *mobile* for one frame on every mount, which
 * paints the mobile arrangement and then snaps to desktop — a visible flicker.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchesNow(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia(query);
    // Re-sync in case `query` changed or the viewport moved between render and commit.
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
