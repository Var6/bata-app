import { ACTIVITY_CATEGORIES, type ActivityDoc, type ProjectDoc } from "@/lib/models";
import { labelize, refId } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, inputCls } from "@/components/ui";
import type { ActionState } from "@/lib/actions/auth";

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
  submitLabel,
  preselectedProject,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  activity?: ActivityDoc;
  projects: ProjectDoc[];
  submitLabel: string;
  preselectedProject?: string;
}) {
  const loc = activity?.location;
  const selected = refId(activity?.project) || preselectedProject || "";
  // Prefill the venue from the project when creating a fresh activity.
  const fallback = !activity ? projects.find((p) => p._id.toString() === selected)?.location : undefined;

  return (
    <Card className="p-6">
      <ActionForm action={action} className="grid gap-4 sm:grid-cols-2">
        {activity && <input type="hidden" name="id" value={activity._id.toString()} />}

        <Field label="Activity title" className="sm:col-span-2">
          <input
            name="title"
            required
            defaultValue={activity?.title}
            placeholder="e.g. Sanitary pad distribution — Week 3"
            className={inputCls}
          />
        </Field>

        <Field label="Project">
          <select name="project" required defaultValue={selected} className={inputCls}>
            <option value="" disabled>
              Select project…
            </option>
            {projects.map((p) => (
              <option key={p._id.toString()} value={p._id.toString()}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Type of activity">
          <select name="category" defaultValue={activity?.category ?? "other"} className={inputCls}>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelize(c)}
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
            <select name="durationMinutes" defaultValue={activity?.durationMinutes ?? 120} className={inputCls}>
              {DURATIONS.map(([mins, label]) => (
                <option key={mins} value={mins}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Location — supplied by the NGO, who knows where it actually happens */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 sm:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Where is it happening?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Place / venue">
              <input name="locName" defaultValue={loc?.name ?? fallback?.name ?? ""} placeholder="e.g. Community hall, Ward 4" className={inputCls} />
            </Field>
            <Field label="City / district">
              <input name="city" defaultValue={loc?.city ?? fallback?.city ?? ""} placeholder="e.g. Purnea" className={inputCls} />
            </Field>
            <Field label="Address">
              <input name="address" defaultValue={loc?.address ?? fallback?.address ?? ""} className={inputCls} />
            </Field>
            <Field label="State">
              <input name="state" defaultValue={loc?.state ?? fallback?.state ?? ""} className={inputCls} />
            </Field>
            <Field label="Google Maps link" className="sm:col-span-2">
              <input
                type="url"
                name="mapsUrl"
                defaultValue={loc?.mapsUrl ?? fallback?.mapsUrl ?? ""}
                placeholder="https://maps.app.goo.gl/…"
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                Paste from Google Maps → Share, so Bata volunteers can navigate straight there.
              </span>
            </Field>
          </div>
        </div>

        <Field label="Description (optional)" className="sm:col-span-2">
          <textarea name="description" rows={2} defaultValue={activity?.description ?? ""} className={inputCls} />
        </Field>

        <Field label="Activity points — one per line (shared with Bata)" className="sm:col-span-2">
          <textarea
            name="points"
            rows={5}
            defaultValue={activity?.points.map((p) => p.text).join("\n") ?? ""}
            placeholder={"Arrange 200 sanitary pad kits\nAwareness session for class 6–8 girls\nRecord attendance register\nCollect feedback from teachers"}
            className={`${inputCls} font-mono text-xs leading-relaxed`}
          />
        </Field>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 sm:col-span-2">
          Everyone following this project is notified as soon as you save, and can confirm whether
          they will join. You will be told individually who is coming.
        </div>

        <div className="sm:col-span-2">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
