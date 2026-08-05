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
  const user = await requireUser(["ngo", "director"]);
  const { project } = await props.searchParams;
  await dbConnect();

  // NGOs may only schedule under their own, schedulable projects.
  const scope = {
    status: { $in: ["active", "on-hold"] as const },
    ...(user.role === "ngo" ? { ngo: user._id } : {}),
  };
  const projects = await Project.find(scope).sort({ name: 1 }).lean<ProjectDoc[]>();

  return (
    <>
      <div className="mb-2">
        <Link href="/dashboard/activities" className="text-sm font-medium text-bata-600 hover:underline">
          ← All activities
        </Link>
      </div>
      <PageHeader
        title="Schedule an activity"
        subtitle="You know when and where this is happening — add the details and Bata volunteers who follow the project will be invited."
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No schedulable projects"
          hint={
            user.role === "ngo"
              ? "Bata hasn't assigned you an active project yet, or your projects are suspended or completed."
              : "Create an active project first."
          }
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
