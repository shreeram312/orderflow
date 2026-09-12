export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4 py-8">
      {children}
    </div>
  );
}
