import { Button } from "@my-better-t-app/ui/components/button";

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
    <Button type="submit" size="lg" disabled={pending} className={`mt-1 w-full ${className ?? ""}`}>
      {children}
    </Button>
  );
}
