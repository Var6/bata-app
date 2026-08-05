import type { Metadata } from "next";
import Link from "next/link";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity, Project, User } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { formatHours, labelize, startOfMonth, startOfWeek } from "@/lib/utils";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

const PERIODS = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "all", label: "All time" },
] as const;

function periodRange(period: string): { from?: Date; to?: Date } {
  const now = new Date();
  switch (period) {
    case "week":
      return { from: startOfWeek(now) };
    case "last-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: startOfMonth(now),
      };
    case "all":
      return {};
    case "month":
    default:
      return { from: startOfMonth(now) };
  }
}

interface EngagementRow {
  _id: Types.ObjectId;
  minutes: number;
  count: number;
  categories: { k: string; v: number }[];
  projects: { k: Types.ObjectId; v: number }[];
}

export default async function ReportsPage(props: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireUser(["director"]);
  const { period = "month" } = await props.searchParams;
  await dbConnect();

  const { from, to } = periodRange(period);
  const dateMatch: Record<string, Date> = {};
  if (from) dateMatch.$gte = from;
  if (to) dateMatch.$lt = to;
  const match: Record<string, unknown> = { status: "completed" };
  if (from || to) match.date = dateMatch;

  const [rows, employees, projects] = await Promise.all([
    Activity.aggregate<EngagementRow>([
      { $match: match },
      { $unwind: "$participants" },
      {
        $group: {
          _id: "$participants",
          minutes: { $sum: "$durationMinutes" },
          count: { $sum: 1 },
          categories: { $push: { k: "$category", v: "$durationMinutes" } },
          projects: { $push: { k: "$project", v: "$durationMinutes" } },
        },
      },
      { $sort: { minutes: -1 } },
    ]),
    User.find({ role: { $in: ["employee", "director"] }, active: true })
      .sort({ name: 1 })
      .select("name role designation")
      .lean(),
    Project.find({}).select("name").lean(),
  ]);

  const projectNames = new Map(projects.map((p) => [String(p._id), p.name]));
  const byUser = new Map(rows.map((r) => [String(r._id), r]));

  const totalMinutes = rows.reduce((sum, r) => sum + r.minutes, 0);
  const activityCount = await Activity.countDocuments(match);
  const engagedCount = employees.filter((e) => byUser.has(String(e._id))).length;

  const sumBy = (pairs: { k: unknown; v: number }[]) => {
    const map = new Map<string, number>();
    for (const { k, v } of pairs) {
      const key = String(k);
      map.set(key, (map.get(key) ?? 0) + v);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  return (
    <>
      <PageHeader
        title="Engagement Reports"
        subtitle="Volunteer hours from completed activities, per employee — broken down by activity type and project."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard/reports?period=${p.key}`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              period === p.key
                ? "bg-bata-600 text-white shadow-md shadow-bata-600/25"
                : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:text-zinc-800"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <Card className="border-bata-200 bg-linear-to-br from-bata-600 to-bata-800 p-5 text-white">
          <p className="text-3xl font-extrabold">{formatHours(totalMinutes)}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-bata-100">
            Total volunteer time
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-3xl font-extrabold text-zinc-900">{activityCount}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Activities completed
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-3xl font-extrabold text-zinc-900">
            {engagedCount}/{employees.length}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Team members engaged
          </p>
        </Card>
      </div>

      {employees.length === 0 ? (
        <EmptyState title="No employees yet" hint="Add employees to start tracking engagement." />
      ) : (
        <div className="grid gap-3">
          {employees
            .map((e) => ({ user: e, row: byUser.get(String(e._id)) }))
            .sort((a, b) => (b.row?.minutes ?? 0) - (a.row?.minutes ?? 0))
            .map(({ user: e, row }) => (
              <Card key={String(e._id)} className={`p-5 ${row ? "" : "opacity-70"}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-600">
                    {e.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w: string) => w[0]?.toUpperCase())
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900">
                      {e.name}
                      {e.role === "director" && (
                        <span className="ml-2 text-xs font-medium text-bata-600">Director</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400">{e.designation || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-extrabold ${row ? "text-zinc-900" : "text-zinc-300"}`}>
                      {formatHours(row?.minutes ?? 0)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {row ? `${row.count} ${row.count === 1 ? "activity" : "activities"}` : "not engaged"}
                    </p>
                  </div>
                </div>
                {row && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
                    {sumBy(row.categories).map(([cat, mins]) => (
                      <span
                        key={cat}
                        className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {labelize(cat)} · {formatHours(mins)}
                      </span>
                    ))}
                    {sumBy(row.projects).map(([proj, mins]) => (
                      <span
                        key={proj}
                        className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600"
                      >
                        {projectNames.get(proj) ?? "Unknown project"} · {formatHours(mins)}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
        </div>
      )}
    </>
  );
}
