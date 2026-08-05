import type { ActivityDoc, UserDoc } from "@/lib/models";
import { refId } from "@/lib/utils";

/**
 * Who may open an activity: the CSR team, the NGO running it, and any Bata
 * employee who was invited to it (i.e. follows the project).
 */
export function canViewActivity(user: UserDoc, activity: ActivityDoc): boolean {
  if (user.role === "director") return true;
  const id = user._id.toString();
  if (user.role === "ngo") return refId(activity.ngo) === id;
  return (
    refId(activity.createdBy) === id ||
    activity.attendees.some((a) => refId(a.user) === id)
  );
}

/**
 * Who may edit, cancel, or record attendance for an activity: the NGO that
 * runs it, and the CSR team. Employees never can.
 */
export function canManageActivity(
  user: { _id: { toString(): string }; role: string },
  activity: ActivityDoc
): boolean {
  if (user.role === "director") return true;
  return user.role === "ngo" && refId(activity.ngo) === user._id.toString();
}

/** Only the CSR team creates, edits, suspends or deletes projects. */
export function canManageProject(user: { role: string }): boolean {
  return user.role === "director";
}
