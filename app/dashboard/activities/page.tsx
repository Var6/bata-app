import type { Metadata } from "next";
import Link from "next/link";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, Project, ACTIVITY_STATUSES } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { formatDate, formatHours, formatTime, labelize, locationText, mapsLink } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage(props: {
  searchParams: Promise<{ status?: string; project?: string; mine?: string }>;
}) {
  const user = await requireUser();
  const { status, project, mine } = await props.searchParams;
  await dbConnect();

  const query: Record<string, unknown> = {};
  if (user.role === "ngo") query.ngo = user._id;
  if (user.role === "employee") query["attendees.user"] = user._id;
  if (mine === "1" && user.role !== "ngo") query["attendees.user"] = user._id;
  if (status && (ACTIVITY_STATUSES as readonly string[]).includes(status)) query.status = status;
  if (project && Types.ObjectId.isValid(project)) query.project = project;

  const [activities, projects] = await Promise.all([
    Activity.find(query)
      .sort({ date: -1, startTime: -1 })
      .limit(200)
      .populate("project", "name")
      .populate("ngo", "name org.orgName")
      .lean(),
    user.role === "ngo" ? [] : Project.find({}).sort({ name: 1 }).select("name").lean(),
  ]);

  const filterLink = (params: Record<string, string | undefined>) => {
    const merged = { status, project, mine, ...params };
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
            ? "Sessions your organisation has scheduled. Bata volunteers confirm and you record who attended."
            : "Activities on the projects you follow."
        }
      >
        {user.role !== "employee" && (
          <Link
            href="/dashboard/activities/new"
            className="inline-flex items-center gap-2 rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bata-700"
          >
            + Schedule activity
          </Link>
        )}
      </PageHeader>

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
        {project && (
          <Link href="/dashboard/activities" className="rounded-full bg-bata-50 px-3 py-1 text-xs font-semibold text-bata-700 ring-1 ring-bata-200">
            {projects.find((p) => String(p._id) === project)?.name} ✕ clear
          </Link>
        )}
      </div>

      {activities.length === 0 ? (
        <EmptyState
          title="No activities found"
          hint={
            user.role === "ngo"
              ? "Schedule your first activity from one of your projects."
              : "Follow a project and you'll be invited to its activities."
          }
        />
      ) : (
        <div className="grid gap-3">
          {activities.map((a) => {
            const proj = a.project as unknown as { name?: string } | null;
            const ngo = a.ngo as unknown as { name?: string; org?: { orgName?: string } } | null;
            const confirmed = a.attendees.filter((x) => x.status === "confirmed").length;
            const where = locationText(a.location);
            const map = mapsLink(a.location);
            const me = a.attendees.find((x) => String(x.user) === user._id.toString());
            return (
              <Card key={String(a._id)} className="p-4 transition hover:border-bata-300 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                  <Link href={`/dashboard/activities/${String(a._id)}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-zinc-900">{a.title}</p>
                      <Badge value={a.category} label={labelize(a.category)} />
                      {me?.status === "confirmed" && <Badge value="completed" label="you're going" />}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {proj?.name} · {ngo?.org?.orgName || ngo?.name}
                      {where ? ` · ${where}` : ""}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {map && (
                      <a href={map} target="_blank" rel="noreferrer" className="font-medium text-bata-600 hover:underline">
                        Map
                      </a>
                    )}
                    <span>{confirmed} going</span>
                    <span>
                      {formatDate(a.date)} · {formatTime(a.startTime)} · {formatHours(a.durationMinutes)}
                    </span>
                    <Badge value={a.status} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
