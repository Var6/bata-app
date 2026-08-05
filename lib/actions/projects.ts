"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, Project, User } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import type { ActionState } from "@/lib/actions/auth";

const STATUSES = ["active", "completed", "on-hold"] as const;
type ProjectStatus = (typeof STATUSES)[number];

function readStatus(formData: FormData): ProjectStatus {
  const raw = String(formData.get("status") ?? "active");
  return (STATUSES as readonly string[]).includes(raw) ? (raw as ProjectStatus) : "active";
}

/** Validates that the submitted NGO id belongs to an active NGO account. */
async function readNgo(formData: FormData): Promise<{ error: string } | { ngo: string }> {
  const ngo = String(formData.get("ngo") ?? "");
  if (!Types.ObjectId.isValid(ngo)) return { error: "Please assign an NGO partner to this project." };
  if (!(await User.exists({ _id: ngo, role: "ngo", active: true }))) {
    return { error: "Selected NGO partner no longer exists or is inactive." };
  }
  return { ngo };
}

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["director"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required." };

  await dbConnect();
  const ngoResult = await readNgo(formData);
  if ("error" in ngoResult) return { error: ngoResult.error };

  let coverKey: string | undefined;
  try {
    coverKey = await uploadImage(formData.get("cover"), "projects");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  await Project.create({
    name,
    description: String(formData.get("description") ?? "").trim() || undefined,
    status: readStatus(formData),
    ngo: ngoResult.ngo,
    coverKey,
    createdBy: me._id,
  });
  revalidatePath("/dashboard/projects");
  return { success: "Project created and assigned to the NGO partner." };
}

export async function updateProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const project = await Project.findById(String(formData.get("id")));
  if (!project) return { error: "Project not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required." };

  const ngoResult = await readNgo(formData);
  if ("error" in ngoResult) return { error: ngoResult.error };

  // Reassigning to a different NGO would hand that NGO the existing activities
  // (and hide them from the current partner), so require it to be emptied first.
  if (project.ngo?.toString() !== ngoResult.ngo) {
    if (await Activity.exists({ project: project._id })) {
      return {
        error:
          "This project already has activities under its current NGO partner. Reassigning would transfer them, so remove or complete those activities first.",
      };
    }
  }

  try {
    const coverKey = await uploadImage(formData.get("cover"), "projects");
    if (coverKey) project.coverKey = coverKey;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  project.name = name;
  project.description = String(formData.get("description") ?? "").trim() || undefined;
  project.status = readStatus(formData);
  project.ngo = new Types.ObjectId(ngoResult.ngo);
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
