import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { buildReport, PERIODS } from "@/lib/reports";
import { formatHours, labelize, roleLabel } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage(props: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireUser(["director"]);
  const { period = "month" } = await props.searchParams;
  const data = await buildReport(period);

  const tiles = [
    { label: "Total volunteer time", value: formatHours(data.totalMinutes), accent: true },
    { label: "Activities completed", value: `${data.activitiesCompleted}/${data.activitiesTotal}` },
    { label: "Team members engaged", value: `${data.engagedCount}/${data.peopleCount}` },
    { label: "Attendance rate", value: `${data.attendanceRate}%` },
  ];

  return (
    <>
      <PageHeader
        title="Engagement Reports"
        subtitle="Hours are counted only where the NGO partner confirmed the volunteer was present."
      >
        <a
          href={`/dashboard/reports/pdf?period=${period}`}
          className="inline-flex items-center gap-2 rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bata-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PDF
        </a>
      </PageHeader>

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

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card
            key={t.label}
            className={`p-5 ${t.accent ? "border-bata-200 bg-linear-to-br from-bata-600 to-bata-800 text-white" : ""}`}
          >
            <p className={`text-2xl font-extrabold ${t.accent ? "text-white" : "text-zinc-900"}`}>{t.value}</p>
            <p className={`mt-1 text-xs font-medium uppercase tracking-wide ${t.accent ? "text-bata-100" : "text-zinc-500"}`}>
              {t.label}
            </p>
          </Card>
        ))}
      </div>

      {/* By project */}
      <h2 className="mb-3 text-lg font-bold text-zinc-900">By project</h2>
      {data.projects.length === 0 ? (
        <EmptyState title="No projects yet" />
      ) : (
        <div className="mb-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-160 text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/70 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Project</th>
                <th className="px-4 py-3 text-left font-semibold">NGO partner</th>
                <th className="px-4 py-3 text-right font-semibold">Activities</th>
                <th className="px-4 py-3 text-right font-semibold">Volunteers</th>
                <th className="px-4 py-3 text-right font-semibold">Follows</th>
                <th className="px-4 py-3 text-right font-semibold">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.projects.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-zinc-900">{p.name}</span>
                    <span className="ml-2">
                      <Badge value={p.status} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{p.ngoName}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">
                    {p.completed}/{p.activities}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700">{p.volunteers}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">{p.followers}</td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-900">{formatHours(p.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* By person */}
      <h2 className="mb-3 text-lg font-bold text-zinc-900">By team member</h2>
      {data.people.length === 0 ? (
        <EmptyState title="No employees yet" hint="Employees appear here once they register." />
      ) : (
        <div className="grid gap-3">
          {data.people.map((p) => (
            <Card key={p.id} className={`p-5 ${p.attended ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 font-bold text-zinc-600">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">
                    {p.name}
                    {p.role === "director" && (
                      <span className="ml-2 text-xs font-medium text-bata-600">{roleLabel(p.role)}</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {[p.designation, p.employeeCode].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-5 text-center">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{p.attended}</p>
                    <p className="text-[10px] uppercase text-zinc-400">attended</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{p.confirmed}</p>
                    <p className="text-[10px] uppercase text-zinc-400">confirmed</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${p.noShows ? "text-bata-600" : "text-zinc-900"}`}>{p.noShows}</p>
                    <p className="text-[10px] uppercase text-zinc-400">no-shows</p>
                  </div>
                  <div>
                    <p className={`text-xl font-extrabold ${p.attended ? "text-zinc-900" : "text-zinc-300"}`}>
                      {formatHours(p.minutes)}
                    </p>
                    <p className="text-[10px] uppercase text-zinc-400">hours</p>
                  </div>
                </div>
              </div>
              {(p.projects.length > 0 || p.categories.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
                  {p.projects.map((x) => (
                    <span key={x.name} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                      {x.name} · {formatHours(x.minutes)}
                    </span>
                  ))}
                  {p.categories.map((x) => (
                    <span key={x.name} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {labelize(x.name)} · {formatHours(x.minutes)}
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
