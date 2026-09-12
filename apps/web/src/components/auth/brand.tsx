export function FormHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
    </div>
  );
}
