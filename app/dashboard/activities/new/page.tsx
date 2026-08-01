import type { Metadata } from "next";
import { dbConnect } from "@/lib/db";
import { Project, School, User, type ProjectDoc, type SchoolDoc, type UserDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { createActivity } from "@/lib/actions/activities";
import { PageHeader } from "@/components/ui";
import { ActivityForm } from "../activity-form";

export const metadata: Metadata = { title: "Schedule activity" };

export default async function NewActivityPage(props: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireUser(["director", "employee"]);
  const { project } = await props.searchParams;
  await dbConnect();

  const [projects, schools, ngos, employees] = await Promise.all([
    Project.find({ status: { $ne: "completed" } }).sort({ name: 1 }).lean<ProjectDoc[]>(),
    School.find({}).sort({ name: 1 }).lean<SchoolDoc[]>(),
    User.find({ role: "ngo", active: true }).sort({ "org.orgName": 1 }).lean<UserDoc[]>(),
    User.find({ role: { $in: ["employee", "director"] }, active: true }).sort({ name: 1 }).lean<UserDoc[]>(),
  ]);

  return (
    <>
      <PageHeader
        title="Schedule an activity"
        subtitle="Plan a session at a school with an NGO partner and the Bata team. The points you list are shared with the NGO."
      />
      <ActivityForm
        action={createActivity}
        projects={projects}
        schools={schools}
        ngos={ngos}
        employees={employees}
        submitLabel="Schedule activity"
        preselectedProject={project}
      />
    </>
  );
}
