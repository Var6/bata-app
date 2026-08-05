"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, Project, User, PROJECT_STATUSES, type ProjectStatus } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { uploadImage } from "@/lib/upload";
import { notify } from "@/lib/notify";
import type { ActionState } from "@/lib/actions/auth";

function readStatus(formData: FormData): ProjectStatus {
  const raw = String(formData.get("status") ?? "active");
  return (PROJECT_STATUSES as readonly string[]).includes(raw) ? (raw as ProjectStatus) : "active";
}

function readLocation(formData: FormData) {
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim();
  if (mapsUrl && !/^https?:\/\//i.test(mapsUrl)) {
    return { error: "The map link must start with http:// or https://" };
  }
  return {
    location: {
      name: String(formData.get("locName") ?? "").trim() || undefined,
      address: String(formData.get("address") ?? "").trim() || undefined,
      city: String(formData.get("city") ?? "").trim() || undefined,
      state: String(formData.get("state") ?? "").trim() || undefined,
      mapsUrl: mapsUrl || undefined,
    },
  };
}

async function readNgo(formData: FormData): Promise<{ error: string } | { ngo: string }> {
  const ngo = String(formData.get("ngo") ?? "");
  if (!Types.ObjectId.isValid(ngo)) return { error: "Please assign an NGO partner to this project." };
  if (!(await User.exists({ _id: ngo, role: "ngo", active: true }))) {
    return { error: "Selected NGO partner no longer exists or is inactive." };
  }
  return { ngo };
}

/** Only the CSR team creates projects. */
export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser(["director"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required." };

  await dbConnect();
  const ngoResult = await readNgo(formData);
  if ("error" in ngoResult) return { error: ngoResult.error };
  const loc = readLocation(formData);
  if ("error" in loc) return { error: loc.error };

  let coverKey: string | undefined;
  try {
    coverKey = await uploadImage(formData.get("cover"), "projects");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  const project = await Project.create({
    name,
    description: String(formData.get("description") ?? "").trim() || undefined,
    status: readStatus(formData),
    ngo: ngoResult.ngo,
    location: loc.location,
    coverKey,
    createdBy: me._id,
  });

  await notify([
    {
      user: ngoResult.ngo,
      type: "project-assigned",
      title: `New project assigned: ${name}`,
      body: `The Bata CSR team has assigned the project “${name}” to your organisation. You can now schedule activities under it.`,
      link: `/dashboard/projects`,
      email: true,
    },
  ]);

  revalidatePath("/dashboard/projects");
  return { success: `Project created and assigned. ${project.name} is now visible to the NGO partner.` };
}

/** Only the CSR team edits projects — NGOs and employees never can. */
export async function updateProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const project = await Project.findById(String(formData.get("id")));
  if (!project) return { error: "Project not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Project name is required." };

  const ngoResult = await readNgo(formData);
  if ("error" in ngoResult) return { error: ngoResult.error };
  const loc = readLocation(formData);
  if ("error" in loc) return { error: loc.error };

  // Reassigning would hand existing activities to a different NGO.
  if (project.ngo?.toString() !== ngoResult.ngo && (await Activity.exists({ project: project._id }))) {
    return {
      error:
        "This project already has activities under its current NGO partner. Reassigning would transfer them, so complete or remove those activities first.",
    };
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
  project.location = loc.location;
  await project.save();

  revalidatePath("/dashboard/projects");
  return { success: "Project updated." };
}

/** Suspend / reactivate — CSR team only. Suspended projects block new activities. */
export async function toggleProjectSuspended(formData: FormData) {
  await requireUser(["director"]);
  await dbConnect();
  const project = await Project.findById(String(formData.get("id")));
  if (!project) return;

  const suspending = project.status !== "suspended";
  project.status = suspending ? "suspended" : "active";
  await project.save();

  if (project.ngo) {
    await notify([
      {
        user: project.ngo,
        type: "general",
        title: suspending ? `Project suspended: ${project.name}` : `Project reactivated: ${project.name}`,
        body: suspending
          ? `The Bata CSR team has suspended “${project.name}”. You cannot schedule new activities until it is reactivated.`
          : `“${project.name}” is active again. You can schedule activities.`,
        link: "/dashboard/projects",
      },
    ]);
  }
  revalidatePath("/dashboard/projects");
}

export async function deleteProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const id = String(formData.get("id"));
  if (await Activity.exists({ project: id })) {
    return {
      error: "This project has activities and cannot be deleted. Suspend it instead to stop new scheduling.",
    };
  }
  await Project.findByIdAndDelete(id);
  revalidatePath("/dashboard/projects");
  return { success: "Project deleted." };
}

/** An employee registers (or withdraws) interest so they hear about activities. */
export async function toggleInterest(formData: FormData) {
  const me = await requireUser(["employee", "director"]);
  await dbConnect();
  const project = await Project.findById(String(formData.get("id")));
  if (!project) return;

  const already = project.interested.some((u) => u.toString() === me._id.toString());
  await Project.updateOne(
    { _id: project._id },
    already ? { $pull: { interested: me._id } } : { $addToSet: { interested: me._id } }
  );

  if (!already && project.ngo) {
    await notify([
      {
        user: project.ngo,
        type: "general",
        title: `${me.name} is interested in ${project.name}`,
        body: `${me.name} from Bata has registered interest in “${project.name}” and will be notified about the activities you schedule.`,
        link: "/dashboard/projects",
      },
    ]);
  }

  revalidatePath("/dashboard/projects");
}
