import Link from "next/link";

/**
 * The wordmark. A small solid square with a bowl mark — it reads at 20px and
 * does not depend on a photo or a gradient.
 */
export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`bg-foreground text-background inline-flex shrink-0 items-center justify-center rounded-lg ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[62%]" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11h16a8 8 0 0 1-16 0Z" />
        <path d="M9 11V7" />
        <path d="M15 11V5" />
      </svg>
    </span>
  );
}

export function Brand({ href = "/", caption }: { href?: string; caption?: string }) {
  return (
    <Link href={href} className="flex min-w-0 shrink-0 items-center gap-2.5">
      <BrandMark />
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="text-[15px] font-semibold tracking-tight">OrderFlow</span>
        {caption ? (
          <span className="text-muted-foreground hidden text-sm sm:inline">{caption}</span>
        ) : null}
      </span>
    </Link>
  );
}
