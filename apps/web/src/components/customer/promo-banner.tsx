export function PromoBanner() {
  return (
    <section
      className="relative flex items-center justify-between gap-4 overflow-hidden rounded-xl p-5 shadow-sm sm:p-6"
      style={{
        background: "linear-gradient(120deg, var(--brand-orange-soft), var(--brand-tint))",
      }}
    >
      <div>
        <p className="text-xl leading-tight font-extrabold sm:text-2xl">
          Good Food
          <br />
          Brighter Mood
        </p>
        <p className="text-muted-foreground mt-1.5 text-sm">Fresh ingredients. Faster service.</p>
      </div>

      <p
        className="shrink-0 text-2xl leading-tight sm:text-3xl"
        style={{ fontFamily: "var(--font-script)" }}
      >
        Freshly
        <br />
        Made
      </p>
    </section>
  );
}
