import type { Metadata } from "next";
import Link from "next/link";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, Project, School, ACTIVITY_STATUSES } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { formatDate, formatHours, formatTime, labelize } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage(props: {
  searchParams: Promise<{ status?: string; project?: string; school?: string }>;
}) {
  const user = await requireUser();
  const { status, project, school } = await props.searchParams;
  await dbConnect();

  const query: Record<string, unknown> = {};
  if (user.role === "ngo") query.ngo = user._id;
  if (user.role === "employee") {
    query.$or = [{ participants: user._id }, { createdBy: user._id }];
  }
  if (status && (ACTIVITY_STATUSES as readonly string[]).includes(status)) query.status = status;
  if (project && Types.ObjectId.isValid(project)) query.project = project;
  if (school && Types.ObjectId.isValid(school)) query.school = school;

  const [activities, projects, schools] = await Promise.all([
    Activity.find(query)
      .sort({ date: -1, startTime: -1 })
      .limit(200)
      .populate("project", "name")
      .populate("school", "name city")
      .populate("ngo", "name org.orgName")
      .lean(),
    user.role === "ngo" ? [] : Project.find({}).sort({ name: 1 }).select("name").lean(),
    user.role === "ngo" ? [] : School.find({}).sort({ name: 1 }).select("name city").lean(),
  ]);

  const filterLink = (params: Record<string, string | undefined>) => {
    const merged = { status, project, school, ...params };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/dashboard/activities${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Activities"
        subtitle={
          user.role === "ngo"
            ? "Sessions assigned to your organisation, with shared checklists."
            : "Scheduled sessions across schools, NGO partners, and projects."
        }
      >
        {user.role !== "ngo" && (
          <Link
            href="/dashboard/activities/new"
            className="inline-flex items-center gap-2 rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bata-700"
          >
            + Schedule activity
          </Link>
        )}
      </PageHeader>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={filterLink({ status: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!status ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:text-zinc-800"}`}
        >
          All
        </Link>
        {ACTIVITY_STATUSES.map((s) => (
          <Link
            key={s}
            href={filterLink({ status: s })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${status === s ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:text-zinc-800"}`}
          >
            {labelize(s)}
          </Link>
        ))}
        {(project || school) && (
          <Link
            href="/dashboard/activities"
            className="rounded-full bg-bata-50 px-3 py-1 text-xs font-semibold text-bata-700 ring-1 ring-bata-200"
          >
            {project && projects.find((p) => String(p._id) === project)?.name}
            {school && schools.find((s) => String(s._id) === school)?.name}
            {" ✕ clear"}
          </Link>
        )}
      </div>

      {activities.length === 0 ? (
        <EmptyState
          title="No activities found"
          hint={user.role === "ngo" ? "Bata will assign activities to you here." : "Schedule the first activity to get started."}
        />
      ) : (
        <div className="grid gap-3">
          {activities.map((a) => {
            const proj = a.project as unknown as { name?: string } | null;
            const sch = a.school as unknown as { name?: string; city?: string } | null;
            const ngo = a.ngo as unknown as { name?: string; org?: { orgName?: string } } | null;
            const doneCount = a.points.filter((p) => p.done).length;
            return (
              <Link key={String(a._id)} href={`/dashboard/activities/${String(a._id)}`}>
                <Card className="flex flex-wrap items-center gap-4 p-4 transition hover:border-bata-300 hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-zinc-900">{a.title}</p>
                      <Badge value={a.category} label={labelize(a.category)} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {sch?.name}
                      {sch?.city ? `, ${sch.city}` : ""} · with {ngo?.org?.orgName || ngo?.name} ·{" "}
                      {proj?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    {a.points.length > 0 && (
                      <span className="hidden sm:block">
                        {doneCount}/{a.points.length} points
                      </span>
                    )}
                    <span>
                      {formatDate(a.date)} · {formatTime(a.startTime)} · {formatHours(a.durationMinutes)}
                    </span>
                    <Badge value={a.status} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
