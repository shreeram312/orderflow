import type { LucideIcon } from "lucide-react";

/** The Indian veg / non-veg marker. Square outline, dot inside. */
export function VegMark({ isVeg, className = "size-3.5" }: { isVeg: boolean; className?: string }) {
  const tone = isVeg ? "border-emerald-600" : "border-red-600";
  const dot = isVeg ? "bg-emerald-600" : "bg-red-600";

  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border-[1.5px] ${tone} ${className}`}
    >
      <span className={`block size-[45%] rounded-full ${dot}`} />
    </span>
  );
}

/** A coloured dot, for "open", "live", column headers. */
export function Dot({
  tone = "muted",
  pulse = false,
  className = "size-2",
}: {
  tone?: "success" | "warning" | "danger" | "muted" | "info" | "primary";
  pulse?: boolean;
  className?: string;
}) {
  const colour = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-sky-500",
    primary: "bg-primary",
    muted: "bg-muted-foreground/40",
  }[tone];

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} aria-hidden>
      {pulse ? (
        <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${colour}`} />
      ) : null}
      <span className={`relative inline-flex size-full rounded-full ${colour}`} />
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-[30ch] text-[13px] leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** A white card with a hairline border. The only surface the app uses. */
export function Panel({
  className = "",
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={`bg-card ring-border rounded-xl ring-1 ${className}`} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  meta,
  action,
  className = "",
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 pt-4 ${className}`}>
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {meta ? <span className="text-muted-foreground text-xs tabular">{meta}</span> : null}
      </div>
      {action}
    </div>
  );
}

/** Small form field wrapper: label, control, first error. */
export function Field({
  label,
  htmlFor,
  hint,
  errors,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  errors?: string[] | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-[13px] font-medium">
          {label}
        </label>
        {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
      </div>
      {children}
      {errors?.length ? <p className="text-destructive text-xs leading-tight">{errors[0]}</p> : null}
    </div>
  );
}

/** Stepper used for cart quantities. */
export function Stepper({
  value,
  onDecrement,
  onIncrement,
  label,
  size = "md",
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-7" : "h-8";
  const w = size === "sm" ? "w-7" : "w-8";

  return (
    <div
      className={`bg-primary text-primary-foreground inline-flex ${h} items-center rounded-lg font-medium`}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label={`Remove one ${label}`}
        className={`${w} ${h} flex items-center justify-center rounded-l-lg text-lg leading-none hover:bg-white/15 active:bg-white/25`}
      >
        −
      </button>
      <span className="tabular min-w-5 text-center text-[13px]">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Add one more ${label}`}
        className={`${w} ${h} flex items-center justify-center rounded-r-lg text-lg leading-none hover:bg-white/15 active:bg-white/25`}
      >
        +
      </button>
    </div>
  );
}
