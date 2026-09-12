export function FormError({ message, className }: { message: string | null; className?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className={`border-destructive/30 bg-destructive/8 text-destructive rounded-lg border px-3 py-1.5 text-xs leading-tight ${className ?? ""}`}
    >
      {message}
    </p>
  );
}
