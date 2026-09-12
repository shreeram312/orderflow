import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";

/**
 * Split auth layout: photo-backed branding on the left, form on the right.
 *
 * The two-column shape exists so the tallest screen (kitchen sign-up, seven
 * fields) fits in one viewport without scrolling. Below `md` the panel
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
    <div className="bg-card ring-border/60 grid w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl ring-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <aside className="relative flex min-h-[190px] flex-col justify-between gap-8 px-8 py-8 md:min-h-0">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 360px"
          className="object-cover"
        />
        {/* Scrim: dark at both ends so the brand mark and the handwritten line
            stay readable, deliberately light through the middle so the food is
            still the thing you see. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.16) 26%, rgba(0,0,0,0.58) 58%, rgba(0,0,0,0.9) 100%)",
          }}
        />

        <div className="relative flex items-center gap-2">
          <UtensilsCrossed className="size-6 text-white" strokeWidth={2.25} />
          <div>
            <p className="text-lg leading-none font-extrabold tracking-tight text-white">
              OrderFlow
            </p>
            <p className="mt-1 text-[11px] text-white/85">Good Food. Better Experience.</p>
          </div>
        </div>

        <div className="relative">{aside}</div>
      </aside>

      <div className="px-8 py-8">{children}</div>
    </div>
  );
}

/** Handwritten accent used on the login and staff sign-up panels. */
export function ScriptLines({ lines }: { lines: string[] }) {
  return (
    <p
      className="text-[28px] leading-[1.15] font-medium text-white drop-shadow-sm"
      style={{ fontFamily: "var(--font-script)" }}
    >
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}
