/** ₹1,250 — Indian grouping, no decimals unless there are paise. */
export function money(amount: number): string {
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** "23:00" -> "11:00 PM" */
export function clock(value: string): string {
  const [h, m] = value.split(":").map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h)) return value;

  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "12 Oct, 7:42 PM" */
export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "7:42 PM" */
export function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** "Pending" from "PENDING". */
export function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Short, readable order reference: the first 6 chars of the uuid, upper-cased. */
export function orderRef(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
