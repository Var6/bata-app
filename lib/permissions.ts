import type { ActivityDoc, UserDoc } from "@/lib/models";

/** Extracts the id from a ref field whether or not it has been populated. */
function refId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

/** Director and the assigned NGO / participants / creator may open an activity. */
export function canViewActivity(user: UserDoc, activity: ActivityDoc): boolean {
  if (user.role === "director") return true;
  const id = user._id.toString();
  if (user.role === "ngo") return refId(activity.ngo) === id;
  return (
    refId(activity.createdBy) === id ||
    activity.participants.some((p) => refId(p) === id)
  );
}

export function canEditActivity(user: UserDoc, activity: ActivityDoc): boolean {
  return (
    user.role === "director" ||
    (user.role === "employee" && refId(activity.createdBy) === user._id.toString())
  );
}
