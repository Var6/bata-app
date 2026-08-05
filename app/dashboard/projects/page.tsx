import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Activity, Project, User, type ProjectDoc, type UserDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { fileUrl } from "@/lib/r2";
import { createProject, deleteProject, updateProject } from "@/lib/actions/projects";
import { formatHours, refId } from "@/lib/utils";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Badge, btnDanger, btnSecondary, Card, EmptyState, Field, inputCls, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Projects" };

function ProjectFields({ project, ngos }: { project?: ProjectDoc; ngos: UserDoc[] }) {
  return (
    <>
      <Field label="Project name">
        <input name="name" required defaultValue={project?.name} placeholder="e.g. Digital Literacy — Bihar" className={inputCls} />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={project?.status ?? "active"} className={inputCls}>
          <option value="active">Active</option>
          <option value="on-hold">On hold</option>
          <option value="completed">Completed</option>
        </select>
      </Field>
      <Field label="NGO partner" className="sm:col-span-2">
        <select name="ngo" required defaultValue={refId(project?.ngo)} className={inputCls}>
          <option value="" disabled>
            Assign an NGO partner…
          </option>
          {ngos.map((n) => (
            <option key={n._id.toString()} value={n._id.toString()}>
              {n.org?.orgName || n.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-zinc-400">
          Only this NGO can see the project and its activities.
        </span>
      </Field>
      <Field label="Description (optional)" className="sm:col-span-2">
        <textarea
          name="description"
          rows={2}
          defaultValue={project?.description ?? ""}
          placeholder="What does Bata fund under this project?"
          className={inputCls}
        />
      </Field>
      <Field label="Cover image (optional)" className="sm:col-span-2">
        <input type="file" name="cover" accept="image/*" className={`${inputCls} file:mr-3 file:rounded-md file:border-0 file:bg-bata-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-bata-700`} />
      </Field>
    </>
  );
}

export default async function ProjectsPage() {
  const user = await requireUser();
  await dbConnect();

  const isDirector = user.role === "director";
  const isNgo = user.role === "ngo";

  // An NGO only ever sees the projects assigned to it.
  const scope = isNgo ? { ngo: user._id } : {};

  const [projects, ngos] = await Promise.all([
    Project.find(scope).sort({ createdAt: -1 }).populate("ngo", "name org.orgName").lean<ProjectDoc[]>(),
    isDirector
      ? User.find({ role: "ngo", active: true }).sort({ "org.orgName": 1 }).lean<UserDoc[]>()
      : Promise.resolve([] as UserDoc[]),
  ]);

  const projectIds = projects.map((p) => p._id);

  // Which Bata people are engaged in each project, and for how long.
  const activities = await Activity.find({ project: { $in: projectIds } })
    .select("project participants durationMinutes status")
    .populate("participants", "name designation")
    .lean();

  type Engagement = { name: string; minutes: number; sessions: number };
  const engagement = new Map<string, Map<string, Engagement>>();
  const activityCount = new Map<string, number>();

  for (const a of activities) {
    const pid = String(a.project);
    activityCount.set(pid, (activityCount.get(pid) ?? 0) + 1);
    const perProject = engagement.get(pid) ?? new Map<string, Engagement>();
    for (const raw of a.participants as unknown as { _id: unknown; name?: string }[]) {
      if (!raw?.name) continue;
      const key = String(raw._id);
      const prev = perProject.get(key) ?? { name: raw.name, minutes: 0, sessions: 0 };
      prev.sessions += 1;
      if (a.status === "completed") prev.minutes += a.durationMinutes;
      perProject.set(key, prev);
    }
    engagement.set(pid, perProject);
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={
          isDirector
            ? "The funded programmes that group schools and activities. Each project is assigned to one NGO partner."
            : isNgo
              ? "Projects Bata has assigned to your organisation, and the Bata team members engaged in them."
              : "Select a project when scheduling an activity — it determines the NGO partner."
        }
      />

      {isDirector && (
        <details className="group mb-6 rounded-2xl border border-zinc-200 bg-white shadow-sm open:ring-2 open:ring-bata-600/10">
          <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-bata-700 transition group-open:border-b group-open:border-zinc-100">
            + Create project
          </summary>
          {ngos.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Add an{" "}
              <Link href="/dashboard/ngos" className="font-medium text-bata-600 hover:underline">
                NGO partner
              </Link>{" "}
              first — every project must be assigned to one.
            </p>
          ) : (
            <ActionForm action={createProject} resetOnSuccess className="grid gap-4 p-6 sm:grid-cols-2">
              <ProjectFields ngos={ngos} />
              <div className="sm:col-span-2">
                <SubmitButton>Create project</SubmitButton>
              </div>
            </ActionForm>
          )}
        </details>
      )}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint={
            isDirector
              ? "Create the first project above and assign it to an NGO partner."
              : isNgo
                ? "Bata hasn't assigned any projects to your organisation yet."
                : "The director hasn't created any projects yet."
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {projects.map((p) => {
            const id = p._id.toString();
            const cover = fileUrl(p.coverKey);
            const count = activityCount.get(id) ?? 0;
            const partner = p.ngo as unknown as { name?: string; org?: { orgName?: string } } | null;
            const people = [...(engagement.get(id)?.values() ?? [])].sort((a, b) => b.minutes - a.minutes);
            return (
              <Card key={id} className="overflow-hidden">
                <div className="relative h-32 bg-linear-to-br from-bata-600 to-bata-900">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge value={p.status} />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-zinc-900">{p.name}</h3>
                  <p className="mt-1 text-sm font-medium text-violet-700">
                    {partner?.org?.orgName || partner?.name || "No NGO partner assigned"}
                  </p>
                  {p.description && <p className="mt-1 text-sm text-zinc-500">{p.description}</p>}

                  <p className="mt-3 text-xs">
                    <Link
                      href={`/dashboard/activities?project=${id}`}
                      className="font-medium text-bata-600 hover:underline"
                    >
                      {count} {count === 1 ? "activity" : "activities"} →
                    </Link>
                  </p>

                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Bata team engaged
                    </p>
                    {people.length === 0 ? (
                      <p className="mt-1 text-xs text-zinc-400">
                        No Bata employees scheduled on this project yet.
                      </p>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {people.map((person) => (
                          <span
                            key={person.name}
                            className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                            title={`${person.sessions} activit${person.sessions === 1 ? "y" : "ies"}`}
                          >
                            {person.name}
                            {person.minutes > 0 && (
                              <span className="text-zinc-400"> · {formatHours(person.minutes)}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isDirector && (
                  <details className="border-t border-zinc-100">
                    <summary className="cursor-pointer select-none px-5 py-2 text-xs font-semibold text-zinc-500 hover:text-bata-700">
                      Manage project
                    </summary>
                    <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/60 p-5">
                      <ActionForm action={updateProject} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={id} />
                        <ProjectFields project={p} ngos={ngos} />
                        <div className="sm:col-span-2">
                          <SubmitButton className={btnSecondary}>Save changes</SubmitButton>
                        </div>
                      </ActionForm>
                      <ActionForm action={deleteProject}>
                        <input type="hidden" name="id" value={id} />
                        <ConfirmSubmit message={`Delete project “${p.name}”?`} className={btnDanger}>
                          Delete project
                        </ConfirmSubmit>
                      </ActionForm>
                    </div>
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
