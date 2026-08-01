import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { canEditActivity, canViewActivity } from "@/lib/permissions";
import { fileUrl } from "@/lib/r2";
import { addActivityPhotos, deleteActivity, togglePoint, updateActivityStatus } from "@/lib/actions/activities";
import { formatDate, formatHours, formatTime, labelize } from "@/lib/utils";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Badge, btnDanger, btnSecondary, Card, Field, inputCls, PageHeader } from "@/components/ui";

export default async function ActivityDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await props.params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const activity = await Activity.findById(id)
    .populate("project", "name")
    .populate("school", "name city address contactName contactPhone")
    .populate("ngo", "name email phone org")
    .populate("participants", "name designation")
    .populate("createdBy", "name");
  if (!activity) notFound();

  // Access control (director / assigned NGO / participant / creator).
  const rawActivity = activity.toObject();
  if (!canViewActivity(user, rawActivity)) notFound();
  const canEdit = canEditActivity(user, rawActivity);

  const project = activity.project as unknown as { _id: unknown; name: string };
  const school = activity.school as unknown as {
    name: string;
    city?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
  };
  const ngo = activity.ngo as unknown as {
    name: string;
    email?: string;
    phone?: string;
    org?: { orgName?: string; contactPerson?: string };
  };
  const participants = activity.participants as unknown as { _id: unknown; name: string; designation?: string }[];
  const createdBy = activity.createdBy as unknown as { name?: string } | null;
  const doneCount = activity.points.filter((p) => p.done).length;

  const infoRows: [string, React.ReactNode][] = [
    ["Project", project?.name],
    ["School", [school?.name, school?.city].filter(Boolean).join(", ")],
    ["NGO partner", ngo?.org?.orgName || ngo?.name],
    ["NGO contact", [ngo?.org?.contactPerson || ngo?.name, ngo?.phone, ngo?.email].filter(Boolean).join(" · ")],
    ["When", `${formatDate(activity.date)} at ${formatTime(activity.startTime)} · ${formatHours(activity.durationMinutes)}`],
    ["Venue", activity.venue],
    ["School contact", [school?.contactName, school?.contactPhone].filter(Boolean).join(" · ")],
    ["Planned by", createdBy?.name],
  ];

  return (
    <>
      <div className="mb-2">
        <Link href="/dashboard/activities" className="text-sm font-medium text-bata-600 hover:underline">
          ← All activities
        </Link>
      </div>
      <PageHeader title={activity.title} subtitle={activity.description ?? undefined}>
        <div className="flex items-center gap-2">
          <Badge value={activity.category} label={labelize(activity.category)} />
          <Badge value={activity.status} />
          {canEdit && (
            <Link href={`/dashboard/activities/${id}/edit`} className={btnSecondary}>
              Edit
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Shared checklist */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">Activity points</h2>
              <span className="text-xs font-medium text-zinc-400">
                {doneCount}/{activity.points.length} done · shared with the NGO
              </span>
            </div>
            {activity.points.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-400">
                No points listed.{canEdit && " Edit the activity to add checklist points."}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {activity.points.map((p) => (
                  <li key={p._id.toString()} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                    <form action={togglePoint}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="pointId" value={p._id.toString()} />
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="submit"
                          name="toggle"
                          value="1"
                          title={p.done ? "Mark as not done" : "Mark as done"}
                          className={`flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition ${
                            p.done
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-zinc-300 bg-white text-transparent hover:border-emerald-400"
                          }`}
                        >
                          ✓
                        </button>
                        <span
                          className={`min-w-0 flex-1 text-sm ${p.done ? "text-zinc-400 line-through" : "text-zinc-800"}`}
                        >
                          {p.text}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 pl-9">
                        <input
                          name="remark"
                          defaultValue={p.remark ?? ""}
                          placeholder="Add a remark…"
                          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 placeholder:text-zinc-300 focus:border-bata-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:text-bata-700"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Photos */}
          <Card className="p-6">
            <h2 className="font-bold text-zinc-900">Photos</h2>
            {activity.photoKeys.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activity.photoKeys.map((key) => (
                  <a key={key} href={fileUrl(key)!} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl(key)!}
                      alt="Activity photo"
                      className="h-32 w-full rounded-xl border border-zinc-200 object-cover transition hover:opacity-90"
                    />
                  </a>
                ))}
              </div>
            )}
            <ActionForm action={addActivityPhotos} className="mt-4">
              <input type="hidden" name="id" value={id} />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  name="photos"
                  accept="image/*"
                  multiple
                  className={`${inputCls} max-w-xs file:mr-3 file:rounded-md file:border-0 file:bg-bata-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-bata-700`}
                />
                <SubmitButton className={btnSecondary}>Upload</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Details */}
          <Card className="p-6">
            <h2 className="font-bold text-zinc-900">Details</h2>
            <dl className="mt-4 space-y-3">
              {infoRows
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{k}</dt>
                    <dd className="text-sm text-zinc-800">{v}</dd>
                  </div>
                ))}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Bata participants
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {participants.map((p) => (
                    <span
                      key={String(p._id)}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                    >
                      {p.name}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Status */}
          <Card className="p-6">
            <h2 className="font-bold text-zinc-900">Update status</h2>
            {activity.completionNote && (
              <p className="mt-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                <span className="font-semibold">Note:</span> {activity.completionNote}
              </p>
            )}
            <ActionForm action={updateActivityStatus} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={id} />
              <Field label="Status">
                <select name="status" defaultValue={activity.status} className={inputCls}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                  {user.role !== "ngo" && <option value="cancelled">Cancelled</option>}
                </select>
              </Field>
              <Field label="Note (optional)">
                <textarea
                  name="completionNote"
                  rows={2}
                  placeholder="e.g. 32 students attended, projector needs repair"
                  className={inputCls}
                />
              </Field>
              <SubmitButton>Save status</SubmitButton>
            </ActionForm>
            <p className="mt-3 text-xs text-zinc-400">
              Completed activities count towards employee volunteer hours.
            </p>
          </Card>

          {canEdit && (
            <ActionForm action={deleteActivity}>
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmit message="Delete this activity? This cannot be undone." className={`${btnDanger} w-full`}>
                Delete activity
              </ConfirmSubmit>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}
