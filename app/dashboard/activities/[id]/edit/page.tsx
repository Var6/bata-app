import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, Project, type ActivityDoc, type ProjectDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { canManageActivity } from "@/lib/permissions";
import { updateActivity } from "@/lib/actions/activities";
import { PageHeader } from "@/components/ui";
import { ActivityForm } from "../../activity-form";

export const metadata: Metadata = { title: "Edit activity" };

export default async function EditActivityPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["ngo", "director"]);
  const { id } = await props.params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const activity = await Activity.findById(id).lean<ActivityDoc>();
  if (!activity || !canManageActivity(user, activity)) notFound();

  const scope = user.role === "ngo" ? { ngo: user._id } : {};
  const projects = await Project.find(scope).sort({ name: 1 }).lean<ProjectDoc[]>();

  return (
    <>
      <div className="mb-2">
        <Link href={`/dashboard/activities/${id}`} className="text-sm font-medium text-bata-600 hover:underline">
          ← Back to activity
        </Link>
      </div>
      <PageHeader
        title={`Edit: ${activity.title}`}
        subtitle="Anyone who already confirmed will be notified that the details changed."
      />
      <ActivityForm action={updateActivity} activity={activity} projects={projects} submitLabel="Save changes" />
    </>
  );
}
