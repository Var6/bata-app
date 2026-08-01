"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/db";
import { Activity, Project } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import type { ActionState } from "@/lib/actions/auth";

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["director"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required." };

  let coverKey: string | undefined;
  try {
    coverKey = await uploadImage(formData.get("cover"), "projects");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  const rawStatus = String(formData.get("status") ?? "active");
  const status = (["active", "completed", "on-hold"].includes(rawStatus) ? rawStatus : "active") as
    "active" | "completed" | "on-hold";

  await dbConnect();
  await Project.create({
    name,
    description: String(formData.get("description") ?? "").trim() || undefined,
    status,
    coverKey,
    createdBy: me._id,
  });
  revalidatePath("/dashboard/projects");
  return { success: "Project created." };
}

export async function updateProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const project = await Project.findById(String(formData.get("id")));
  if (!project) return { error: "Project not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required." };

  try {
    const coverKey = await uploadImage(formData.get("cover"), "projects");
    if (coverKey) project.coverKey = coverKey;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  project.name = name;
  project.description = String(formData.get("description") ?? "").trim() || undefined;
  project.status = String(formData.get("status") ?? "active") as typeof project.status;
  await project.save();
  revalidatePath("/dashboard/projects");
  return { success: "Project updated." };
}

export async function deleteProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const id = String(formData.get("id"));
  if (await Activity.exists({ project: id })) {
    return { error: "This project has activities and cannot be deleted. Mark it completed instead." };
  }
  await Project.findByIdAndDelete(id);
  revalidatePath("/dashboard/projects");
  return { success: "Project deleted." };
}
