import { dbConnect } from "@/lib/db";
import { Activity, Project, User } from "@/lib/models";
import { startOfMonth, startOfWeek } from "@/lib/utils";

export const PERIODS = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "quarter", label: "Last 3 months" },
  { key: "all", label: "All time" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

export function periodRange(period: string): { from?: Date; to?: Date; label: string } {
  const now = new Date();
  const found = PERIODS.find((p) => p.key === period);
  const label = found?.label ?? "This month";
  switch (period) {
    case "week":
      return { from: startOfWeek(now), label };
    case "last-month":
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: startOfMonth(now), label };
    case "quarter":
      return { from: new Date(now.getFullYear(), now.getMonth() - 3, 1), label };
    case "all":
      return { label };
    default:
      return { from: startOfMonth(now), label };
  }
}

export interface PersonRow {
  id: string;
  name: string;
  designation?: string;
  employeeCode?: string;
  role: string;
  minutes: number;
  attended: number;
  confirmed: number;
  noShows: number;
  projects: { name: string; minutes: number }[];
  categories: { name: string; minutes: number }[];
}

export interface ProjectRow {
  id: string;
  name: string;
  ngoName: string;
  status: string;
  activities: number;
  completed: number;
  minutes: number;
  volunteers: number;
  followers: number;
}

export interface ReportData {
  periodLabel: string;
  totalMinutes: number;
  activitiesCompleted: number;
  activitiesTotal: number;
  engagedCount: number;
  peopleCount: number;
  attendanceRate: number;
  people: PersonRow[];
  projects: ProjectRow[];
  generatedAt: Date;
}

/** Aggregates everything the reports page and the PDF both need. */
export async function buildReport(period: string): Promise<ReportData> {
  await dbConnect();
  const { from, to, label } = periodRange(period);

  const dateMatch: Record<string, Date> = {};
  if (from) dateMatch.$gte = from;
  if (to) dateMatch.$lt = to;
  const inPeriod: Record<string, unknown> = {};
  if (from || to) inPeriod.date = dateMatch;

  const [activities, staff, projects] = await Promise.all([
    Activity.find(inPeriod)
      .populate("project", "name status")
      .populate("ngo", "name org.orgName")
      .populate("attendees.user", "name designation employeeCode role")
      .lean(),
    User.find({ role: { $in: ["employee", "director"] }, active: true })
      .sort({ name: 1 })
      .select("name designation employeeCode role")
      .lean(),
    Project.find({}).populate("ngo", "name org.orgName").select("name status ngo interested").lean(),
  ]);

  const people = new Map<string, PersonRow>();
  for (const s of staff) {
    people.set(String(s._id), {
      id: String(s._id),
      name: s.name,
      designation: s.designation ?? undefined,
      employeeCode: s.employeeCode ?? undefined,
      role: s.role,
      minutes: 0,
      attended: 0,
      confirmed: 0,
      noShows: 0,
      projects: [],
      categories: [],
    });
  }

  const projectStats = new Map<string, ProjectRow>();
  for (const p of projects) {
    const ngo = p.ngo as unknown as { name?: string; org?: { orgName?: string } } | null;
    projectStats.set(String(p._id), {
      id: String(p._id),
      name: p.name,
      ngoName: ngo?.org?.orgName || ngo?.name || "—",
      status: p.status,
      activities: 0,
      completed: 0,
      minutes: 0,
      volunteers: 0,
      followers: (p.interested ?? []).length,
    });
  }

  let totalMinutes = 0;
  let activitiesCompleted = 0;
  let confirmedTotal = 0;
  let presentTotal = 0;
  const projectVolunteers = new Map<string, Set<string>>();

  const addTo = (list: { name: string; minutes: number }[], name: string, minutes: number) => {
    const hit = list.find((x) => x.name === name);
    if (hit) hit.minutes += minutes;
    else list.push({ name, minutes });
  };

  for (const a of activities) {
    const proj = a.project as unknown as { _id?: unknown; name?: string } | null;
    const pid = proj?._id ? String(proj._id) : String(a.project);
    const pStat = projectStats.get(pid);
    if (pStat) pStat.activities += 1;
    if (a.status === "completed") {
      activitiesCompleted += 1;
      if (pStat) pStat.completed += 1;
    }

    for (const att of a.attendees) {
      const u = att.user as unknown as {
        _id?: unknown;
        name?: string;
        designation?: string;
        employeeCode?: string;
        role?: string;
      } | null;
      if (!u?._id) continue;
      const uid = String(u._id);
      const row =
        people.get(uid) ??
        ({
          id: uid,
          name: u.name ?? "Unknown",
          designation: u.designation,
          employeeCode: u.employeeCode,
          role: u.role ?? "employee",
          minutes: 0,
          attended: 0,
          confirmed: 0,
          noShows: 0,
          projects: [],
          categories: [],
        } as PersonRow);
      people.set(uid, row);

      if (att.status === "confirmed") {
        row.confirmed += 1;
        confirmedTotal += 1;
      }
      if (att.present === true) {
        presentTotal += 1;
        row.attended += 1;
        if (a.status === "completed") {
          row.minutes += a.durationMinutes;
          totalMinutes += a.durationMinutes;
          if (pStat) pStat.minutes += a.durationMinutes;
          addTo(row.projects, proj?.name ?? "Unknown project", a.durationMinutes);
          addTo(row.categories, a.category, a.durationMinutes);
        }
        const set = projectVolunteers.get(pid) ?? new Set<string>();
        set.add(uid);
        projectVolunteers.set(pid, set);
      } else if (att.present === false && att.status === "confirmed") {
        row.noShows += 1;
      }
    }
  }

  for (const [pid, set] of projectVolunteers) {
    const stat = projectStats.get(pid);
    if (stat) stat.volunteers = set.size;
  }

  const peopleRows = [...people.values()].sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  for (const r of peopleRows) {
    r.projects.sort((a, b) => b.minutes - a.minutes);
    r.categories.sort((a, b) => b.minutes - a.minutes);
  }

  return {
    periodLabel: label,
    totalMinutes,
    activitiesCompleted,
    activitiesTotal: activities.length,
    engagedCount: peopleRows.filter((p) => p.attended > 0).length,
    peopleCount: peopleRows.length,
    attendanceRate: confirmedTotal > 0 ? Math.round((presentTotal / confirmedTotal) * 100) : 0,
    people: peopleRows,
    projects: [...projectStats.values()].sort((a, b) => b.minutes - a.minutes),
    generatedAt: new Date(),
  };
}
