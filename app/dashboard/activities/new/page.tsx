import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Project, type ProjectDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { createActivity } from "@/lib/actions/activities";
import { EmptyState, PageHeader } from "@/components/ui";
import { ActivityForm } from "../activity-form";

export const metadata: Metadata = { title: "Schedule activity" };

export default async function NewActivityPage(props: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireUser(["director"]);
  const { project } = await props.searchParams;
  await dbConnect();

  const projects = await Project.find({ status: { $in: ["active", "on-hold"] } })
    .sort({ name: 1 })
    .lean<ProjectDoc[]>();

  return (
    <>
      <div className="mb-2">
        <Link href="/dashboard/activities" className="text-sm font-medium text-bata-600 hover:underline">
          ← All activities
        </Link>
      </div>
      <PageHeader
        title="Schedule an activity"
        subtitle="Set the date, time and location. Volunteers following the project are invited, and the project\u2019s NGO partner sees the schedule."
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No schedulable projects"
          hint="Create an active project first."
        />
      ) : (
        <ActivityForm
          action={createActivity}
          projects={projects}
          submitLabel="Schedule & notify volunteers"
          preselectedProject={project}
        />
      )}
    </>
  );
}
