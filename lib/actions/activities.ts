"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import {
  Activity,
  Project,
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
  type ActivityCategory,
  type ActivityDoc,
  type ProjectDoc,
} from "@/lib/models";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import { canManageActivity, canViewActivity } from "@/lib/permissions";
import { notify } from "@/lib/notify";
import { formatDate, formatTime, locationText } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/auth";

interface ActivityFields {
  title: string;
  category: ActivityCategory;
  project: Types.ObjectId;
  ngo: Types.ObjectId;
  date: Date;
  startTime: string;
  durationMinutes: number;
  description?: string;
  location: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    mapsUrl?: string;
  };
}

/**
 * Validates the submitted activity and resolves its project. The NGO is always
 * taken from the project, and the caller must be that project's NGO (or CSR).
 */
async function readActivityFields(
  formData: FormData,
  me: { _id: Types.ObjectId; role: string }
): Promise<{ error: string } | { fields: ActivityFields; project: ProjectDoc }> {
  const title = String(formData.get("title") ?? "").trim();
  const projectId = String(formData.get("project") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes"));
  const category = String(formData.get("category") ?? "other");
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim();

  if (!title) return { error: "Activity title is required." };
  if (!Types.ObjectId.isValid(projectId)) return { error: "Please select a project." };
  if (!dateStr || !/^\d{2}:\d{2}$/.test(startTime)) {
    return { error: "Date and start time are required." };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
    return { error: "Duration must be at least 15 minutes." };
  }
  if (!(ACTIVITY_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Invalid category." };
  }
  if (mapsUrl && !/^https?:\/\//i.test(mapsUrl)) {
    return { error: "The map link must start with http:// or https://" };
  }

  await dbConnect();
  const project = await Project.findById(projectId).lean<ProjectDoc>();
  if (!project) return { error: "Selected project no longer exists." };
  if (!project.ngo) {
    return { error: "This project has no NGO partner assigned. Ask the CSR team to assign one." };
  }

  // An NGO may only schedule under its own projects.
  if (me.role === "ngo" && project.ngo.toString() !== me._id.toString()) {
    return { error: "You can only schedule activities under projects assigned to your organisation." };
  }
  if (project.status === "suspended") {
    return { error: "This project is suspended. The CSR team must reactivate it before scheduling." };
  }
  if (project.status === "completed") {
    return { error: "This project is completed, so new activities cannot be scheduled." };
  }

  return {
    project,
    fields: {
      title,
      category: category as ActivityCategory,
      project: project._id,
      ngo: project.ngo,
      date: new Date(`${dateStr}T00:00:00`),
      startTime,
      durationMinutes,
      description: String(formData.get("description") ?? "").trim() || undefined,
      location: {
        name: String(formData.get("locName") ?? "").trim() || undefined,
        address: String(formData.get("address") ?? "").trim() || undefined,
        city: String(formData.get("city") ?? "").trim() || undefined,
        state: String(formData.get("state") ?? "").trim() || undefined,
        mapsUrl: mapsUrl || undefined,
      },
    },
  };
}

function parsePoints(formData: FormData): { text: string }[] {
  return String(formData.get("points") ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

/** Only the Bata admin (CSR team) schedules activities. */
export async function createActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["director"]);
  const result = await readActivityFields(formData, me);
  if ("error" in result) return { error: result.error };
  const { fields, project } = result;

  // Everyone who registered interest in the project is invited.
  const interested = (project.interested ?? []).map((u) => u.toString());
  const activity = await Activity.create({
    ...fields,
    points: parsePoints(formData),
    attendees: interested.map((user) => ({ user, status: "invited" })),
    status: "scheduled",
    createdBy: me._id,
  });

  const where = locationText(fields.location);
  await notify(
    interested.map((user) => ({
      user,
      type: "activity-invite" as const,
      title: `New activity in ${project.name}: ${fields.title}`,
      body: `${formatDate(fields.date)} at ${formatTime(fields.startTime)}${where ? ` · ${where}` : ""}. You follow this project — confirm if you can join.`,
      link: `/dashboard/activities/${activity._id.toString()}`,
      email: true,
    }))
  );

  revalidatePath("/dashboard/activities");
  redirect(`/dashboard/activities/${activity._id.toString()}`);
}

export async function updateActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["ngo", "director"]);
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity) return { error: "Activity not found." };
  if (!canManageActivity(me, activity.toObject())) {
    return { error: "Only the NGO running this activity or the CSR team can edit it." };
  }

  const result = await readActivityFields(formData, me);
  if ("error" in result) return { error: result.error };

  // Keep done/remark state for points whose text is unchanged.
  const oldPoints = new Map(activity.points.map((p) => [p.text, p]));
  const newPoints = parsePoints(formData).map((p) => {
    const prev = oldPoints.get(p.text);
    return prev ? { text: p.text, done: prev.done, remark: prev.remark } : p;
  });

  Object.assign(activity, result.fields, { points: newPoints });
  await activity.save();

  // Tell people who already said yes that the details moved.
  const confirmed = activity.attendees.filter((a) => a.status === "confirmed");
  const where = locationText(result.fields.location);
  await notify(
    confirmed.map((a) => ({
      user: a.user,
      type: "general" as const,
      title: `Updated: ${activity.title}`,
      body: `The activity you confirmed has changed — now ${formatDate(activity.date)} at ${formatTime(activity.startTime)}${where ? ` · ${where}` : ""}.`,
      link: `/dashboard/activities/${activity._id.toString()}`,
      email: true,
    }))
  );

  revalidatePath("/dashboard/activities");
  redirect(`/dashboard/activities/${activity._id.toString()}`);
}

/** Employee accepts or declines the invitation. Only that activity's NGO is told. */
export async function respondToActivity(formData: FormData) {
  const me = await requireUser(["employee", "director"]);
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity) return;

  const going = String(formData.get("response")) === "yes";
  const existing = activity.attendees.find((a) => a.user.toString() === me._id.toString());

  if (existing) {
    if (existing.status === (going ? "confirmed" : "declined")) return; // no change
    existing.status = going ? "confirmed" : "declined";
    existing.respondedAt = new Date();
  } else {
    activity.attendees.push({
      user: me._id,
      status: going ? "confirmed" : "declined",
      respondedAt: new Date(),
      present: null,
    });
  }
  await activity.save();

  const where = locationText(activity.location);
  await notify([
    {
      user: activity.ngo, // only the NGO running this activity
      type: going ? "attendance-confirmed" : "attendance-declined",
      title: going
        ? `${me.name} (Bata) is coming to ${activity.title}`
        : `${me.name} (Bata) can no longer attend ${activity.title}`,
      body: going
        ? `${me.name} will join on ${formatDate(activity.date)} at ${formatTime(activity.startTime)}${where ? ` · ${where}` : ""}.`
        : `${me.name} has withdrawn from ${activity.title} on ${formatDate(activity.date)}.`,
      link: `/dashboard/activities/${activity._id.toString()}`,
      email: true,
    },
  ]);

  revalidatePath(`/dashboard/activities/${activity._id.toString()}`);
}

/** The NGO records who actually turned up, after the activity. */
export async function markAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["ngo", "director"]);
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity) return { error: "Activity not found." };
  if (!canManageActivity(me, activity.toObject())) {
    return { error: "Only the NGO running this activity or the CSR team can record attendance." };
  }

  const present = new Set(formData.getAll("present").map(String));
  for (const a of activity.attendees) {
    if (a.status === "declined") continue;
    a.present = present.has(a.user.toString());
    a.markedAt = new Date();
  }
  activity.attendanceRequested = false;
  if (activity.status !== "completed") activity.status = "completed";
  await activity.save();

  revalidatePath(`/dashboard/activities/${activity._id.toString()}`);
  revalidatePath("/dashboard/reports");
  return { success: "Attendance recorded. These hours now count towards employee engagement." };
}

export async function updateActivityStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity || !canViewActivity(me, activity.toObject())) return { error: "Activity not found." };
  if (!canManageActivity(me, activity.toObject())) {
    return { error: "Only the NGO running this activity or the CSR team can change its status." };
  }

  const status = String(formData.get("status"));
  if (!(ACTIVITY_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };

  activity.status = status as ActivityDoc["status"];
  const note = String(formData.get("completionNote") ?? "").trim();
  if (note) activity.completionNote = note;

  // Completing an activity prompts the NGO to record who attended.
  if (status === "completed") {
    activity.attendanceRequested = activity.attendees.some((a) => a.present === null && a.status !== "declined");
    if (activity.attendanceRequested && me.role !== "ngo") {
      await notify([
        {
          user: activity.ngo,
          type: "attendance-review",
          title: `Please confirm attendance for ${activity.title}`,
          body: `${activity.title} on ${formatDate(activity.date)} is marked completed. Record which Bata employees were present.`,
          link: `/dashboard/activities/${activity._id.toString()}`,
          email: true,
        },
      ]);
    }
  }
  await activity.save();

  revalidatePath("/dashboard/activities");
  revalidatePath(`/dashboard/activities/${activity._id.toString()}`);
  return {
    success:
      status === "completed" && activity.attendanceRequested
        ? "Marked completed — now record who attended below."
        : `Status updated to ${status}.`,
  };
}

export async function togglePoint(formData: FormData) {
  const me = await requireUser();
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity || !canViewActivity(me, activity.toObject())) return;

  const point = activity.points.id(String(formData.get("pointId")));
  if (!point) return;
  if (formData.get("toggle")) point.done = !point.done;
  const remark = formData.get("remark");
  if (remark !== null) point.remark = String(remark).trim() || undefined;
  await activity.save();
  revalidatePath(`/dashboard/activities/${activity._id.toString()}`);
}

export async function addActivityPhotos(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity || !canViewActivity(me, activity.toObject())) return { error: "Activity not found." };

  const files = formData.getAll("photos");
  const keys: string[] = [];
  try {
    for (const file of files.slice(0, 6)) {
      const key = await uploadImage(file, "activities");
      if (key) keys.push(key);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
  if (keys.length === 0) {
    return { error: "No photos uploaded. Check that R2 storage is configured." };
  }

  activity.photoKeys.push(...keys);
  await activity.save();
  revalidatePath(`/dashboard/activities/${activity._id.toString()}`);
  return { success: `${keys.length} photo(s) uploaded.` };
}

export async function deleteActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["ngo", "director"]);
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity) return { error: "Activity not found." };
  if (!canManageActivity(me, activity.toObject())) {
    return { error: "Only the NGO running this activity or the CSR team can delete it." };
  }

  const confirmed = activity.attendees.filter((a) => a.status === "confirmed");
  await notify(
    confirmed.map((a) => ({
      user: a.user,
      type: "general" as const,
      title: `Cancelled: ${activity.title}`,
      body: `The activity on ${formatDate(activity.date)} you confirmed for has been cancelled.`,
      link: "/dashboard/activities",
      email: true,
    }))
  );

  await activity.deleteOne();
  revalidatePath("/dashboard/activities");
  redirect("/dashboard/activities");
}
