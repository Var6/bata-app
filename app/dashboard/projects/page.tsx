import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Activity, Project, type ProjectDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { fileUrl } from "@/lib/r2";
import { createProject, deleteProject, updateProject } from "@/lib/actions/projects";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Badge, btnDanger, btnSecondary, Card, EmptyState, Field, inputCls, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Projects" };

function ProjectFields({ project }: { project?: ProjectDoc }) {
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
  const user = await requireUser(["director", "employee"]);
  await dbConnect();

  const projects = await Project.find({}).sort({ createdAt: -1 }).lean<ProjectDoc[]>();
  const counts = await Activity.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$project", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const isDirector = user.role === "director";

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={
          isDirector
            ? "The funded programmes that group schools and activities."
            : "Select a project when scheduling an activity."
        }
      />

      {isDirector && (
        <details className="group mb-6 rounded-2xl border border-zinc-200 bg-white shadow-sm open:ring-2 open:ring-bata-600/10">
          <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-bata-700 transition group-open:border-b group-open:border-zinc-100">
            + Create project
          </summary>
          <ActionForm action={createProject} resetOnSuccess className="grid gap-4 p-6 sm:grid-cols-2">
            <ProjectFields />
            <div className="sm:col-span-2">
              <SubmitButton>Create project</SubmitButton>
            </div>
          </ActionForm>
        </details>
      )}

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint={isDirector ? "Create the first project above." : "The director hasn't created any projects yet."}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {projects.map((p) => {
            const id = p._id.toString();
            const cover = fileUrl(p.coverKey);
            const count = countMap.get(id) ?? 0;
            return (
              <Card key={id} className="overflow-hidden">
                <div className="relative h-32 bg-gradient-to-br from-bata-600 to-bata-900">
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
                  {p.description && <p className="mt-1 text-sm text-zinc-500">{p.description}</p>}
                  <p className="mt-3 text-xs text-zinc-400">
                    <Link
                      href={`/dashboard/activities?project=${id}`}
                      className="font-medium text-bata-600 hover:underline"
                    >
                      {count} {count === 1 ? "activity" : "activities"} →
                    </Link>
                  </p>
                </div>

                {isDirector && (
                  <details className="border-t border-zinc-100">
                    <summary className="cursor-pointer select-none px-5 py-2 text-xs font-semibold text-zinc-500 hover:text-bata-700">
                      Manage project
                    </summary>
                    <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/60 p-5">
                      <ActionForm action={updateProject} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={id} />
                        <ProjectFields project={p} />
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
