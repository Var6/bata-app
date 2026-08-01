"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/db";
import { Activity, School } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import type { ActionState } from "@/lib/actions/auth";

function readFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || undefined,
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim() || undefined,
    contactName: String(formData.get("contactName") ?? "").trim() || undefined,
    contactPhone: String(formData.get("contactPhone") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

export async function createSchool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["director"]);
  const fields = readFields(formData);
  if (!fields.name || !fields.city) return { error: "School name and city are required." };

  let photoKey: string | undefined;
  try {
    photoKey = await uploadImage(formData.get("photo"), "schools");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  await dbConnect();
  await School.create({ ...fields, photoKey, createdBy: me._id });
  revalidatePath("/dashboard/schools");
  return { success: "School added." };
}

export async function updateSchool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const school = await School.findById(String(formData.get("id")));
  if (!school) return { error: "School not found." };

  const fields = readFields(formData);
  if (!fields.name || !fields.city) return { error: "School name and city are required." };

  try {
    const photoKey = await uploadImage(formData.get("photo"), "schools");
    if (photoKey) school.photoKey = photoKey;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  Object.assign(school, fields);
  await school.save();
  revalidatePath("/dashboard/schools");
  return { success: "School updated." };
}

export async function deleteSchool(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const id = String(formData.get("id"));
  if (await Activity.exists({ school: id })) {
    return { error: "This school has activities and cannot be deleted." };
  }
  await School.findByIdAndDelete(id);
  revalidatePath("/dashboard/schools");
  return { success: "School deleted." };
}
