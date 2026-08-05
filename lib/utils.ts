/**
 * Reads the id from a Mongoose ref field whether or not it has been populated.
 * `String(doc)` on a populated document yields "[object Object]", so never rely
 * on toString() directly for refs.
 */
export function refId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * How each role is named in the UI. The database keeps `director` as the
 * role key; Bata call that team the "CSR Team", so only the label changes.
 */
export function roleLabel(role: string): string {
  switch (role) {
    case "director":
      return "CSR Team";
    case "employee":
      return "Bata Employee";
    case "ngo":
      return "NGO Partner";
    default:
      return labelize(role);
  }
}

/** Accepts a pasted Google Maps link, or builds a search link from an address. */
export function mapsLink(loc?: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  mapsUrl?: string | null;
} | null): string | null {
  if (!loc) return null;
  if (loc.mapsUrl) return loc.mapsUrl;
  const query = [loc.name, loc.address, loc.city, loc.state].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function locationText(loc?: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
} | null): string {
  if (!loc) return "";
  return [loc.name, loc.address, loc.city, loc.state].filter(Boolean).join(", ");
}

export function labelize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) pw += chars[b % chars.length];
  return pw;
}

/** Start of the current week (Monday, local time). */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - day);
  return d;
}

export function startOfMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
