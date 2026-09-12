"use client";

import { useMediaQuery } from "@my-better-t-app/ui/hooks/use-media-query";

/** Matches Tailwind `md` (768px). */
export const MD_MIN_WIDTH_MEDIA_QUERY = "(min-width: 768px)" as const;

type SheetSideHorizontal = "left" | "right";
type SheetSideVertical = "top" | "bottom";

export interface UseResponsiveSheetSideOptions {
  /** Side when the viewport is `md` or wider. Default `right`. */
  desktopSide?: SheetSideHorizontal;
  /** Side when the viewport is below `md`. Default `bottom`. */
  mobileSide?: SheetSideVertical;
}

/**
 * Picks a `Sheet` side for mobile vs desktop: a bottom sheet on phones, a side
 * panel on desktop. Pass the result as `key` too, so switching sides remounts
 * the content instead of animating between two different transforms.
 */
export function useResponsiveSheetSide(options?: UseResponsiveSheetSideOptions) {
  const desktopSide = options?.desktopSide ?? "right";
  const mobileSide = options?.mobileSide ?? "bottom";
  const isMdUp = useMediaQuery(MD_MIN_WIDTH_MEDIA_QUERY);

  return { isMdUp, sheetSide: isMdUp ? desktopSide : mobileSide };
}
