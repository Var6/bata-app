import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, Project, School, User, type ActivityDoc, type ProjectDoc, type SchoolDoc, type UserDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { canEditActivity } from "@/lib/permissions";
import { updateActivity } from "@/lib/actions/activities";
import { PageHeader } from "@/components/ui";
import { ActivityForm } from "../../activity-form";

export const metadata: Metadata = { title: "Edit activity" };

export default async function EditActivityPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["director", "employee"]);
  const { id } = await props.params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const activity = await Activity.findById(id).lean<ActivityDoc>();
  if (!activity || !canEditActivity(user, activity)) notFound();

  const [projects, schools, ngos, employees] = await Promise.all([
    Project.find({}).sort({ name: 1 }).lean<ProjectDoc[]>(),
    School.find({}).sort({ name: 1 }).lean<SchoolDoc[]>(),
    User.find({ role: "ngo", active: true }).sort({ "org.orgName": 1 }).lean<UserDoc[]>(),
    User.find({ role: { $in: ["employee", "director"] }, active: true }).sort({ name: 1 }).lean<UserDoc[]>(),
  ]);

  return (
    <>
      <div className="mb-2">
        <Link href={`/dashboard/activities/${id}`} className="text-sm font-medium text-bata-600 hover:underline">
          ← Back to activity
        </Link>
      </div>
      <PageHeader
        title={`Edit: ${activity.title}`}
        subtitle="Completed/remark state is kept for checklist points whose text is unchanged."
      />
      <ActivityForm
        action={updateActivity}
        activity={activity}
        projects={projects}
        schools={schools}
        ngos={ngos}
        employees={employees}
        submitLabel="Save changes"
      />
    </>
  );
}
