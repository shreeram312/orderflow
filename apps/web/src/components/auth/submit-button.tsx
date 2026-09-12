export function SubmitButton({
  pending,
  className,
  children,
}: {
  pending: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`bg-primary text-primary-foreground hover:bg-primary/90 mt-1 h-11 w-full rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
