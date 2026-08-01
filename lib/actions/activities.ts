"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import {
  Activity,
  Project,
  School,
  User,
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
  type ActivityCategory,
  type ActivityDoc,
} from "@/lib/models";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import { canViewActivity } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth";

async function readActivityFields(formData: FormData): Promise<
  | { error: string }
  | {
      title: string;
      category: ActivityCategory;
      project: string;
      school: string;
      ngo: string;
      participants: string[];
      date: Date;
      startTime: string;
      durationMinutes: number;
      venue?: string;
      description?: string;
    }
> {
  const title = String(formData.get("title") ?? "").trim();
  const project = String(formData.get("project") ?? "");
  const school = String(formData.get("school") ?? "");
  const ngo = String(formData.get("ngo") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes"));
  const category = String(formData.get("category") ?? "other");
  const participants = formData.getAll("participants").map(String).filter(Boolean);

  if (!title) return { error: "Activity title is required." };
  if (!Types.ObjectId.isValid(project)) return { error: "Please select a project." };
  if (!Types.ObjectId.isValid(school)) return { error: "Please select a school." };
  if (!Types.ObjectId.isValid(ngo)) return { error: "Please select an NGO partner." };
  if (!dateStr || !/^\d{2}:\d{2}$/.test(startTime)) return { error: "Date and start time are required." };
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
    return { error: "Duration must be at least 15 minutes." };
  }
  if (!(ACTIVITY_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Invalid category." };
  }
  if (participants.length === 0) {
    return { error: "Select at least one Bata employee to participate." };
  }

  await dbConnect();
  const [projectOk, schoolOk, ngoOk, employeeCount] = await Promise.all([
    Project.exists({ _id: project }),
    School.exists({ _id: school }),
    User.exists({ _id: ngo, role: "ngo", active: true }),
    User.countDocuments({ _id: { $in: participants }, role: { $in: ["employee", "director"] }, active: true }),
  ]);
  if (!projectOk) return { error: "Selected project no longer exists." };
  if (!schoolOk) return { error: "Selected school no longer exists." };
  if (!ngoOk) return { error: "Selected NGO no longer exists or is inactive." };
  if (employeeCount !== participants.length) return { error: "One of the selected employees is invalid." };

  return {
    title,
    category: category as ActivityCategory,
    project,
    school,
    ngo,
    participants,
    date: new Date(`${dateStr}T00:00:00`),
    startTime,
    durationMinutes,
    venue: String(formData.get("venue") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || undefined,
  };
}

function parsePoints(formData: FormData): { text: string }[] {
  return String(formData.get("points") ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((text) => ({ text }));
}

export async function createActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["director", "employee"]);
  const fields = await readActivityFields(formData);
  if ("error" in fields) return { error: fields.error };

  const activity = await Activity.create({
    ...fields,
    points: parsePoints(formData),
    status: "scheduled",
    createdBy: me._id,
  });
  revalidatePath("/dashboard/activities");
  redirect(`/dashboard/activities/${activity._id.toString()}`);
}

export async function updateActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["director", "employee"]);
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity) return { error: "Activity not found." };
  if (me.role !== "director" && activity.createdBy?.toString() !== me._id.toString()) {
    return { error: "Only the director or the creator can edit this activity." };
  }

  const fields = await readActivityFields(formData);
  if ("error" in fields) return { error: fields.error };

  // Keep done/remark state for points whose text is unchanged.
  const oldPoints = new Map(activity.points.map((p) => [p.text, p]));
  const newPoints = parsePoints(formData).map((p) => {
    const prev = oldPoints.get(p.text);
    return prev ? { text: p.text, done: prev.done, remark: prev.remark } : p;
  });

  Object.assign(activity, fields, { points: newPoints });
  await activity.save();
  revalidatePath("/dashboard/activities");
  revalidatePath(`/dashboard/activities/${activity._id.toString()}`);
  redirect(`/dashboard/activities/${activity._id.toString()}`);
}

export async function updateActivityStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity || !canViewActivity(me, activity)) return { error: "Activity not found." };

  const status = String(formData.get("status"));
  if (!(ACTIVITY_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };
  // NGOs can only move a session to in-progress or completed, not cancel it.
  if (me.role === "ngo" && status === "cancelled") {
    return { error: "Please ask Bata to cancel an activity." };
  }

  activity.status = status as ActivityDoc["status"];
  const note = String(formData.get("completionNote") ?? "").trim();
  if (note) activity.completionNote = note;
  await activity.save();
  revalidatePath("/dashboard/activities");
  revalidatePath(`/dashboard/activities/${activity._id.toString()}`);
  return { success: `Status updated to ${status}.` };
}

export async function togglePoint(formData: FormData) {
  const me = await requireUser();
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity || !canViewActivity(me, activity)) return;

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
  if (!activity || !canViewActivity(me, activity)) return { error: "Activity not found." };

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
  const me = await requireUser(["director", "employee"]);
  await dbConnect();
  const activity = await Activity.findById(String(formData.get("id")));
  if (!activity) return { error: "Activity not found." };
  if (me.role !== "director" && activity.createdBy?.toString() !== me._id.toString()) {
    return { error: "Only the director or the creator can delete this activity." };
  }
  await activity.deleteOne();
  revalidatePath("/dashboard/activities");
  redirect("/dashboard/activities");
}
