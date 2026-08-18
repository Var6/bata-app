import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Activity, Project, User, type ProjectDoc, type UserDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { fileUrl } from "@/lib/r2";
import {
  createProject,
  deleteProject,
  toggleInterest,
  toggleProjectSuspended,
  updateProject,
} from "@/lib/actions/projects";
import { formatHours, locationText, mapsLink, refId } from "@/lib/utils";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Badge, btnDanger, btnSecondary, Card, EmptyState, Field, inputCls, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Projects" };

function ProjectFields({ project, ngos }: { project?: ProjectDoc; ngos: UserDoc[] }) {
  const loc = project?.location;
  return (
    <>
      <Field label="Project name">
        <input name="name" required defaultValue={project?.name} placeholder="e.g. Menstrual Hygiene Project" className={inputCls} />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={project?.status ?? "active"} className={inputCls}>
          <option value="active">Active</option>
          <option value="on-hold">On hold</option>
          <option value="suspended">Suspended</option>
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
          Only this NGO sees the project, and only they can schedule its activities.
        </span>
      </Field>

      <Field label="Place / venue name">
        <input name="locName" defaultValue={loc?.name ?? ""} placeholder="e.g. Govt. Middle School, Ward 4" className={inputCls} />
      </Field>
      <Field label="City / district">
        <input name="city" defaultValue={loc?.city ?? ""} placeholder="e.g. Purnea" className={inputCls} />
      </Field>
      <Field label="Address">
        <input name="address" defaultValue={loc?.address ?? ""} className={inputCls} />
      </Field>
      <Field label="State">
        <input name="state" defaultValue={loc?.state ?? ""} placeholder="e.g. Bihar" className={inputCls} />
      </Field>
      <Field label="Google Maps link" className="sm:col-span-2">
        <input
          name="mapsUrl"
          type="url"
          defaultValue={loc?.mapsUrl ?? ""}
          placeholder="https://maps.app.goo.gl/…  (paste from Google Maps → Share)"
          className={inputCls}
        />
        <span className="mt-1 block text-xs text-zinc-400">
          Anyone can tap this to get directions. Leave blank and we build a map search from the address.
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

export default async function ProjectsPage(props: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser();
  const { welcome } = await props.searchParams;
  await dbConnect();

  const isDirector = user.role === "director";
  const isNgo = user.role === "ngo";
  const canFollow = user.role === "employee" || isDirector;

  const scope = isNgo ? { ngo: user._id } : {};
  const [projects, ngos] = await Promise.all([
    Project.find(scope)
      .sort({ createdAt: -1 })
      .populate("ngo", "name org.orgName")
      .populate("interested", "name")
      .lean<ProjectDoc[]>(),
    isDirector
      ? User.find({ role: "ngo", active: true }).sort({ "org.orgName": 1 }).lean<UserDoc[]>()
      : Promise.resolve([] as UserDoc[]),
  ]);

  const ids = projects.map((p) => p._id);
  const activities = await Activity.find({ project: { $in: ids } })
    .select("project attendees durationMinutes status")
    .populate("attendees.user", "name")
    .lean();

  type Row = { name: string; minutes: number; attended: number };
  const attended = new Map<string, Map<string, Row>>();
  const counts = new Map<string, number>();
  for (const a of activities) {
    const pid = String(a.project);
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
    const per = attended.get(pid) ?? new Map<string, Row>();
    for (const att of a.attendees) {
      const u = att.user as unknown as { _id: unknown; name?: string };
      if (!u?.name || att.present !== true) continue;
      const key = String(u._id);
      const prev = per.get(key) ?? { name: u.name, minutes: 0, attended: 0 };
      prev.attended += 1;
      if (a.status === "completed") prev.minutes += a.durationMinutes;
      per.set(key, prev);
    }
    attended.set(pid, per);
  }

  return (
    <>
      {welcome && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Welcome to the Bata CSR Portal.</p>
          <p className="mt-1">
            Follow the projects you care about — you&apos;ll be notified whenever the NGO partner
            schedules an activity, and you can confirm whether you&apos;re joining.
          </p>
        </div>
      )}

      <PageHeader
        title="Projects"
        subtitle={
          isDirector
            ? "Funded programmes. The CSR team creates them and assigns each to one NGO partner."
            : isNgo
              ? "Projects Bata has assigned to your organisation, and the activities scheduled under them."
              : "Follow a project to hear about its activities and join in."
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
                : "The CSR team hasn't published any projects yet."
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {projects.map((p) => {
            const id = p._id.toString();
            const cover = fileUrl(p.coverKey);
            const partner = p.ngo as unknown as { name?: string; org?: { orgName?: string } } | null;
            const followers = (p.interested ?? []) as unknown as { _id: unknown; name?: string }[];
            const following = followers.some((f) => String(f._id) === user._id.toString());
            const people = [...(attended.get(id)?.values() ?? [])].sort((a, b) => b.minutes - a.minutes);
            const where = locationText(p.location);
            const map = mapsLink(p.location);
            const suspended = p.status === "suspended";

            return (
              <Card key={id} className={`overflow-hidden ${suspended ? "opacity-75" : ""}`}>
                <div className="relative h-28 bg-linear-to-br from-bata-600 to-bata-900">
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
                  <p className="mt-0.5 text-sm font-medium text-violet-700">
                    {partner?.org?.orgName || partner?.name || "No NGO partner assigned"}
                  </p>
                  {p.description && <p className="mt-1 text-sm text-zinc-500">{p.description}</p>}

                  {where && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-zinc-500">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 size-3.5 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <span>
                        {where}
                        {map && (
                          <>
                            {" · "}
                            <a href={map} target="_blank" rel="noreferrer" className="font-medium text-bata-600 hover:underline">
                              Directions
                            </a>
                          </>
                        )}
                      </span>
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <Link href={`/dashboard/activities?project=${id}`} className="font-medium text-bata-600 hover:underline">
                      {counts.get(id) ?? 0} {(counts.get(id) ?? 0) === 1 ? "activity" : "activities"} →
                    </Link>
                    {isDirector && !suspended && (
                      <Link
                        href={`/dashboard/activities/new?project=${id}`}
                        className="rounded-lg bg-bata-600 px-3 py-1.5 font-semibold text-white transition hover:bg-bata-700"
                      >
                        + Schedule activity
                      </Link>
                    )}
                    {canFollow && (
                      <form action={toggleInterest}>
                        <input type="hidden" name="id" value={id} />
                        <button
                          className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                            following
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                              : "bg-zinc-900 text-white hover:bg-zinc-700"
                          }`}
                        >
                          {following ? "✓ Following" : "+ I'm interested"}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Who follows this project — the NGO uses this to see interest */}
                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Interested Bata team ({followers.length})
                    </p>
                    {followers.length === 0 ? (
                      <p className="mt-1 text-xs text-zinc-400">No one following yet.</p>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {followers.map((f) => (
                          <span key={String(f._id)} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                            {f.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {people.length > 0 && (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Attended
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {people.map((person) => (
                            <span key={person.name} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              {person.name}
                              {person.minutes > 0 && <span className="text-emerald-500"> · {formatHours(person.minutes)}</span>}
                            </span>
                          ))}
                        </div>
                      </>
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
                      <div className="flex flex-wrap gap-2">
                        <form action={toggleProjectSuspended}>
                          <input type="hidden" name="id" value={id} />
                          <button className={btnSecondary}>{suspended ? "Reactivate project" : "Suspend project"}</button>
                        </form>
                        <ActionForm action={deleteProject}>
                          <input type="hidden" name="id" value={id} />
                          <ConfirmSubmit message={`Delete project “${p.name}”?`} className={btnDanger}>
                            Delete project
                          </ConfirmSubmit>
                        </ActionForm>
                      </div>
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
