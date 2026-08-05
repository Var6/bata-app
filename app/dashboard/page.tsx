import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Activity, Project, User } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { formatDate, formatHours, formatTime, locationText, startOfMonth, startOfWeek } from "@/lib/utils";
import { Badge, Card, PageHeader } from "@/components/ui";

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "border-bata-200 bg-linear-to-br from-bata-600 to-bata-800 text-white" : ""}`}>
      <p className={`text-3xl font-extrabold ${accent ? "text-white" : "text-zinc-900"}`}>{value}</p>
      <p className={`mt-1 text-xs font-medium uppercase tracking-wide ${accent ? "text-bata-100" : "text-zinc-500"}`}>
        {label}
      </p>
    </Card>
  );
}

export default async function OverviewPage() {
  const user = await requireUser();
  await dbConnect();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const scope =
    user.role === "director"
      ? {}
      : user.role === "ngo"
        ? { ngo: user._id }
        : { "attendees.user": user._id };

  const [upcoming, completedCount, upcomingCount] = await Promise.all([
    Activity.find({ ...scope, status: { $in: ["scheduled", "in-progress"] }, date: { $gte: today } })
      .sort({ date: 1, startTime: 1 })
      .limit(6)
      .populate("project", "name")
      .populate("ngo", "name org.orgName")
      .lean(),
    Activity.countDocuments({ ...scope, status: "completed" }),
    Activity.countDocuments({ ...scope, status: { $in: ["scheduled", "in-progress"] }, date: { $gte: today } }),
  ]);

  let stats: { label: string; value: string | number; accent?: boolean }[] = [];

  if (user.role === "director") {
    const [projects, employees, ngos, monthAgg] = await Promise.all([
      Project.countDocuments({}),
      User.countDocuments({ role: "employee", active: true }),
      User.countDocuments({ role: "ngo", active: true }),
      Activity.aggregate([
        { $match: { status: "completed", date: { $gte: startOfMonth(now) } } },
        { $unwind: "$attendees" },
        { $match: { "attendees.present": true } },
        { $group: { _id: null, total: { $sum: "$durationMinutes" } } },
      ]),
    ]);
    stats = [
      { label: "Volunteer hours this month", value: formatHours(monthAgg[0]?.total ?? 0), accent: true },
      { label: "Projects", value: projects },
      { label: "Employees", value: employees },
      { label: "NGO partners", value: ngos },
      { label: "Upcoming activities", value: upcomingCount },
      { label: "Completed activities", value: completedCount },
    ];
  } else if (user.role === "employee") {
    const minutesSince = async (from: Date) => {
      const agg = await Activity.aggregate([
        { $match: { status: "completed", date: { $gte: from } } },
        { $unwind: "$attendees" },
        { $match: { "attendees.user": user._id, "attendees.present": true } },
        { $group: { _id: null, total: { $sum: "$durationMinutes" } } },
      ]);
      return agg[0]?.total ?? 0;
    };
    const [week, month, following] = await Promise.all([
      minutesSince(startOfWeek(now)),
      minutesSince(startOfMonth(now)),
      Project.countDocuments({ interested: user._id }),
    ]);
    stats = [
      { label: "My hours this week", value: formatHours(week), accent: true },
      { label: "My hours this month", value: formatHours(month) },
      { label: "Projects I follow", value: following },
      { label: "Invitations upcoming", value: upcomingCount },
    ];
  } else {
    const [projects, pendingAttendance] = await Promise.all([
      Project.countDocuments({ ngo: user._id }),
      Activity.countDocuments({ ngo: user._id, status: "completed", "attendees.present": null }),
    ]);
    stats = [
      { label: "Upcoming activities", value: upcomingCount, accent: true },
      { label: "My projects", value: projects },
      { label: "Completed activities", value: completedCount },
      { label: "Attendance to confirm", value: pendingAttendance },
    ];
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={
          user.role === "director"
            ? "Programme overview across all projects and partners."
            : user.role === "ngo"
              ? `Activities run by ${user.org?.orgName || "your organisation"}.`
              : "Your volunteering at a glance."
        }
      >
        {user.role === "ngo" && (
          <Link
            href="/dashboard/activities/new"
            className="inline-flex items-center gap-2 rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bata-700"
          >
            + Schedule activity
          </Link>
        )}
        {user.role === "employee" && (
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bata-700"
          >
            Browse projects
          </Link>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Upcoming activities</h2>
          <Link href="/dashboard/activities" className="text-sm font-medium text-bata-600 hover:underline">
            View all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Card className="p-8 text-center text-sm text-zinc-500">
            Nothing scheduled yet.
            {user.role === "employee" && " Follow a project to get invited to its activities."}
            {user.role === "ngo" && " Schedule your first activity from one of your projects."}
          </Card>
        ) : (
          <div className="grid gap-3">
            {upcoming.map((a) => {
              const project = a.project as unknown as { name?: string } | null;
              const ngo = a.ngo as unknown as { name?: string; org?: { orgName?: string } } | null;
              const where = locationText(a.location);
              return (
                <Link key={String(a._id)} href={`/dashboard/activities/${String(a._id)}`}>
                  <Card className="flex flex-wrap items-center gap-4 p-4 transition hover:border-bata-300 hover:shadow-md">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-bata-50 py-2">
                      <span className="text-lg font-extrabold leading-none text-bata-700">
                        {new Date(a.date).getDate()}
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-bata-500">
                        {new Date(a.date).toLocaleString("en-IN", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900">{a.title}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {project?.name} · {ngo?.org?.orgName || ngo?.name}
                        {where ? ` · ${where}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>{formatTime(a.startTime)}</span>
                      <Badge value={a.status} />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
