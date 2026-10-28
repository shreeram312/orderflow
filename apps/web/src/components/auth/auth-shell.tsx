import Image from "next/image";

import { BrandMark } from "@/components/shell/brand";

/**
 * Split auth layout: photo on the left, form on the right.
 *
 * The two-column shape exists so the tallest screen (kitchen sign-up, seven
 * fields) fits in one viewport without scrolling. Below `md` the photo
 * collapses to a short banner and the form stacks beneath it.
 */
export function AuthShell({
  image,
  imageAlt,
  priority = false,
  aside,
  children,
}: {
  image: string;
  imageAlt: string;
  /** Set on the screen most likely to be the entry point, for LCP. */
  priority?: boolean;
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card ring-border grid w-full max-w-4xl overflow-hidden rounded-2xl ring-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <aside className="relative flex min-h-[180px] flex-col justify-between gap-8 p-7 md:min-h-0">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 360px"
          className="object-cover"
        />
        {/* One scrim, dark at the foot where the words sit, so the food stays
            the thing you see. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <BrandMark className="size-8 bg-white text-black" />
          <p className="text-[15px] font-semibold tracking-tight text-white">OrderFlow</p>
        </div>

        <div className="relative">{aside}</div>
      </aside>

      <div className="px-6 py-8 sm:px-10">{children}</div>
    </div>
  );
}

/** Two or three short lines over the photo. */
export function Tagline({ lines }: { lines: string[] }) {
  return (
    <p className="text-[26px] leading-[1.15] font-semibold tracking-tight text-white">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}
