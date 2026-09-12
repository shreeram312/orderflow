import { CheckCircle2, ChefHat, ClipboardList, PackageCheck } from "lucide-react";

/**
 * Counts are hardcoded to zero because the orders table does not exist yet —
 * which makes them accurate today, not placeholder data. Replace with a real
 * query against /kitchen/orders when orders land.
 */
const TILES = [
  { label: "New Orders", count: 0, Icon: ClipboardList, tint: "bg-orange-500/10", fg: "text-orange-600" },
  { label: "Preparing", count: 0, Icon: ChefHat, tint: "bg-blue-500/10", fg: "text-blue-600" },
  { label: "Ready", count: 0, Icon: CheckCircle2, tint: "bg-emerald-500/10", fg: "text-emerald-600" },
  { label: "Completed", count: 0, Icon: PackageCheck, tint: "bg-muted", fg: "text-muted-foreground" },
];

export function TodaysOverview() {
  return (
    <section className="bg-card ring-border/60 rounded-xl p-5 shadow-sm ring-1">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Today&apos;s Overview</h2>
        <span className="text-muted-foreground text-[11px]">Orders arrive next phase</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {TILES.map(({ label, count, Icon, tint, fg }) => (
          <div key={label} className={`${tint} flex items-center gap-2.5 rounded-lg p-3`}>
            <span className={`${fg} bg-card/70 flex size-8 items-center justify-center rounded-full`}>
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-lg leading-none font-extrabold">{count}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
