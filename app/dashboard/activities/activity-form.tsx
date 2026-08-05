import { ACTIVITY_CATEGORIES, type ActivityDoc, type ProjectDoc, type SchoolDoc, type UserDoc } from "@/lib/models";
import { labelize, refId } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, inputCls } from "@/components/ui";
import type { ActionState } from "@/lib/actions/auth";

/** Display name of the NGO partner assigned to a project. */
function ngoNameFor(project: ProjectDoc, ngos: UserDoc[]): string | undefined {
  const id = refId(project.ngo);
  if (!id) return undefined;
  const match = ngos.find((n) => n._id.toString() === id);
  return match?.org?.orgName || match?.name;
}

const DURATIONS = [
  [30, "30 minutes"],
  [45, "45 minutes"],
  [60, "1 hour"],
  [90, "1.5 hours"],
  [120, "2 hours"],
  [180, "3 hours"],
  [240, "4 hours"],
  [360, "Full day (6 hours)"],
] as const;

export function ActivityForm({
  action,
  activity,
  projects,
  schools,
  ngos,
  employees,
  submitLabel,
  preselectedProject,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  activity?: ActivityDoc;
  projects: ProjectDoc[];
  schools: SchoolDoc[];
  ngos: UserDoc[];
  employees: UserDoc[];
  submitLabel: string;
  preselectedProject?: string;
}) {
  const participantIds = new Set(activity?.participants.map((p) => p.toString()));

  return (
    <Card className="p-6">
      <ActionForm action={action} className="grid gap-4 sm:grid-cols-2">
        {activity && <input type="hidden" name="id" value={activity._id.toString()} />}

        <Field label="Activity title" className="sm:col-span-2">
          <input
            name="title"
            required
            defaultValue={activity?.title}
            placeholder="e.g. Computer Class — Batch 3"
            className={inputCls}
          />
        </Field>

        <Field label="Project (sets the NGO partner)">
          <select
            name="project"
            required
            defaultValue={activity?.project.toString() ?? preselectedProject ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Select project…
            </option>
            {projects.map((p) => {
              const partner = ngoNameFor(p, ngos);
              return (
                <option key={p._id.toString()} value={p._id.toString()}>
                  {p.name}
                  {partner ? ` — ${partner}` : ""}
                </option>
              );
            })}
          </select>
        </Field>

        <Field label="Category">
          <select name="category" defaultValue={activity?.category ?? "other"} className={inputCls}>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelize(c)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="School">
          <select name="school" required defaultValue={activity?.school.toString() ?? ""} className={inputCls}>
            <option value="" disabled>
              Select school…
            </option>
            {schools.map((s) => (
              <option key={s._id.toString()} value={s._id.toString()}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date">
          <input
            type="date"
            name="date"
            required
            defaultValue={activity ? new Date(activity.date).toISOString().slice(0, 10) : ""}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input type="time" name="startTime" required defaultValue={activity?.startTime} className={inputCls} />
          </Field>
          <Field label="Duration">
            <select name="durationMinutes" defaultValue={activity?.durationMinutes ?? 60} className={inputCls}>
              {DURATIONS.map(([mins, label]) => (
                <option key={mins} value={mins}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs text-zinc-500 sm:col-span-2">
          The NGO partner is set by the project you choose — a project belongs to
          exactly one NGO, and only that NGO can see its activities.
        </div>

        <Field label="Venue (optional)" className="sm:col-span-2">
          <input
            name="venue"
            defaultValue={activity?.venue ?? ""}
            placeholder="e.g. School computer lab"
            className={inputCls}
          />
        </Field>

        <Field label="Bata participants" className="sm:col-span-2">
          <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 sm:grid-cols-2">
            {employees.length === 0 && (
              <p className="text-sm text-zinc-400">No active employees yet — ask the director to add some.</p>
            )}
            {employees.map((e) => (
              <label key={e._id.toString()} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="participants"
                  value={e._id.toString()}
                  defaultChecked={participantIds.has(e._id.toString())}
                  className="size-4 rounded border-zinc-300 accent-bata-600"
                />
                {e.name}
                {e.role === "director" && <span className="text-xs text-bata-600">(Director)</span>}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Description (optional)" className="sm:col-span-2">
          <textarea name="description" rows={2} defaultValue={activity?.description ?? ""} className={inputCls} />
        </Field>

        <Field label="Activity points — one per line (shared with the NGO)" className="sm:col-span-2">
          <textarea
            name="points"
            rows={5}
            defaultValue={activity?.points.map((p) => p.text).join("\n") ?? ""}
            placeholder={"Set up 10 computers before class\nTeach MS Paint basics\nCollect student attendance\nHand over practice sheets to NGO"}
            className={`${inputCls} font-mono text-xs leading-relaxed`}
          />
        </Field>

        <div className="sm:col-span-2">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
