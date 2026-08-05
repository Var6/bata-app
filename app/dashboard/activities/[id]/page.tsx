import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Activity } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { canManageActivity, canViewActivity } from "@/lib/permissions";
import { fileUrl } from "@/lib/r2";
import {
  addActivityPhotos,
  deleteActivity,
  markAttendance,
  respondToActivity,
  togglePoint,
  updateActivityStatus,
} from "@/lib/actions/activities";
import { formatDate, formatHours, formatTime, labelize, locationText, mapsLink } from "@/lib/utils";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Avatar } from "@/components/brand";
import { Badge, btnDanger, btnSecondary, Card, Field, inputCls, PageHeader } from "@/components/ui";

export default async function ActivityDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await props.params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const activity = await Activity.findById(id)
    .populate("project", "name")
    .populate("ngo", "name email phone org")
    .populate("attendees.user", "name designation avatarKey")
    .populate("createdBy", "name");
  if (!activity) notFound();

  const raw = activity.toObject();
  if (!canViewActivity(user, raw)) notFound();
  const canManage = canManageActivity(user, raw);

  const project = activity.project as unknown as { name?: string };
  const ngo = activity.ngo as unknown as {
    name?: string;
    email?: string;
    phone?: string;
    org?: { orgName?: string; contactPerson?: string };
  };
  const createdBy = activity.createdBy as unknown as { name?: string } | null;

  const attendees = activity.attendees as unknown as {
    user: { _id: unknown; name?: string; designation?: string; avatarKey?: string } | null;
    status: string;
    present: boolean | null;
  }[];
  const mine = attendees.find((a) => String(a.user?._id) === user._id.toString());
  const confirmed = attendees.filter((a) => a.status === "confirmed");
  const declined = attendees.filter((a) => a.status === "declined");
  const pending = attendees.filter((a) => a.status === "invited");
  const doneCount = activity.points.filter((p) => p.done).length;
  const where = locationText(activity.location);
  const map = mapsLink(activity.location);
  const needsAttendance = activity.status === "completed" && attendees.some((a) => a.present === null && a.status !== "declined");

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
          {canManage && (
            <Link href={`/dashboard/activities/${id}/edit`} className={btnSecondary}>
              Edit
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Employee RSVP */}
          {user.role !== "ngo" && (
            <Card className={`p-6 ${mine?.status === "confirmed" ? "border-emerald-300 bg-emerald-50/40" : ""}`}>
              <h2 className="font-bold text-zinc-900">Are you joining?</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {formatDate(activity.date)} at {formatTime(activity.startTime)} ·{" "}
                {formatHours(activity.durationMinutes)}
                {where ? ` · ${where}` : ""}
              </p>
              {mine?.status === "confirmed" && (
                <p className="mt-3 text-sm font-semibold text-emerald-700">
                  ✓ You confirmed — {ngo?.org?.orgName || ngo?.name} has been told you are coming.
                </p>
              )}
              {mine?.status === "declined" && (
                <p className="mt-3 text-sm font-medium text-zinc-500">You said you can&apos;t make it.</p>
              )}
              <div className="mt-4 flex gap-2">
                <form action={respondToActivity}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="response" value="yes" />
                  <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    {mine?.status === "confirmed" ? "Still coming" : "Yes, I'll join"}
                  </button>
                </form>
                <form action={respondToActivity}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="response" value="no" />
                  <button className={btnSecondary}>Can&apos;t make it</button>
                </form>
              </div>
              {mine?.present === true && (
                <p className="mt-3 text-xs font-medium text-emerald-700">
                  The NGO marked you present — these hours count towards your volunteering.
                </p>
              )}
              {mine?.present === false && (
                <p className="mt-3 text-xs text-zinc-500">The NGO recorded you as absent.</p>
              )}
            </Card>
          )}

          {/* NGO attendance register */}
          {canManage && attendees.length > 0 && (
            <Card className={`p-6 ${needsAttendance ? "border-amber-300 bg-amber-50/40" : ""}`}>
              <h2 className="font-bold text-zinc-900">Attendance register</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {needsAttendance
                  ? "This activity is complete — please confirm who actually attended."
                  : "Tick the Bata team members who were present."}
              </p>
              <ActionForm action={markAttendance} className="mt-4">
                <input type="hidden" name="id" value={id} />
                <ul className="space-y-2">
                  {attendees
                    .filter((a) => a.status !== "declined")
                    .map((a) => (
                      <li
                        key={String(a.user?._id)}
                        className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-white p-2.5"
                      >
                        <input
                          type="checkbox"
                          name="present"
                          value={String(a.user?._id)}
                          defaultChecked={a.present === true}
                          className="size-4 rounded border-zinc-300 accent-emerald-600"
                        />
                        <Avatar name={a.user?.name ?? "?"} src={fileUrl(a.user?.avatarKey)} className="size-8" />
                        <span className="flex-1 text-sm text-zinc-800">
                          {a.user?.name}
                          {a.user?.designation && (
                            <span className="text-xs text-zinc-400"> · {a.user.designation}</span>
                          )}
                        </span>
                        <Badge value={a.status} />
                      </li>
                    ))}
                </ul>
                <div className="mt-4">
                  <SubmitButton>Save attendance</SubmitButton>
                </div>
              </ActionForm>
              {declined.length > 0 && (
                <p className="mt-3 text-xs text-zinc-400">
                  Not attending: {declined.map((d) => d.user?.name).join(", ")}
                </p>
              )}
            </Card>
          )}

          {/* Shared checklist */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">Activity points</h2>
              <span className="text-xs font-medium text-zinc-400">
                {doneCount}/{activity.points.length} done
              </span>
            </div>
            {activity.points.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-400">No points listed.</p>
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
                        <span className={`min-w-0 flex-1 text-sm ${p.done ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
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
                        <button type="submit" className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:text-bata-700">
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
                    <img src={fileUrl(key)!} alt="Activity photo" className="h-32 w-full rounded-xl border border-zinc-200 object-cover transition hover:opacity-90" />
                  </a>
                ))}
              </div>
            )}
            <ActionForm action={addActivityPhotos} className="mt-4">
              <input type="hidden" name="id" value={id} />
              <div className="flex flex-wrap items-center gap-3">
                <input type="file" name="photos" accept="image/*" multiple className={`${inputCls} max-w-xs file:mr-3 file:rounded-md file:border-0 file:bg-bata-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-bata-700`} />
                <SubmitButton className={btnSecondary}>Upload</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Where + when */}
          <Card className="p-6">
            <h2 className="font-bold text-zinc-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Project</dt>
                <dd className="text-zinc-800">{project?.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">NGO partner</dt>
                <dd className="text-zinc-800">{ngo?.org?.orgName || ngo?.name}</dd>
                {(ngo?.org?.contactPerson || ngo?.phone) && (
                  <dd className="text-xs text-zinc-500">
                    {[ngo?.org?.contactPerson, ngo?.phone, ngo?.email].filter(Boolean).join(" · ")}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">When</dt>
                <dd className="text-zinc-800">
                  {formatDate(activity.date)} at {formatTime(activity.startTime)}
                </dd>
                <dd className="text-xs text-zinc-500">{formatHours(activity.durationMinutes)}</dd>
              </div>
              {where && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Location</dt>
                  <dd className="text-zinc-800">{where}</dd>
                  {map && (
                    <a
                      href={map}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-bata-50 px-3 py-1.5 text-xs font-semibold text-bata-700 transition hover:bg-bata-100"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      Open in Google Maps
                    </a>
                  )}
                </div>
              )}
              {createdBy?.name && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Scheduled by</dt>
                  <dd className="text-zinc-800">{createdBy.name}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Who's coming */}
          <Card className="p-6">
            <h2 className="font-bold text-zinc-900">Bata volunteers</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {confirmed.length} confirmed · {pending.length} awaiting reply
            </p>
            {confirmed.length > 0 && (
              <ul className="mt-3 space-y-2">
                {confirmed.map((a) => (
                  <li key={String(a.user?._id)} className="flex items-center gap-2">
                    <Avatar name={a.user?.name ?? "?"} src={fileUrl(a.user?.avatarKey)} className="size-7" />
                    <span className="flex-1 text-sm text-zinc-700">{a.user?.name}</span>
                    {a.present === true && <span className="text-xs font-semibold text-emerald-600">present</span>}
                    {a.present === false && <span className="text-xs text-zinc-400">absent</span>}
                  </li>
                ))}
              </ul>
            )}
            {confirmed.length === 0 && (
              <p className="mt-3 text-sm text-zinc-400">Nobody has confirmed yet.</p>
            )}
          </Card>

          {/* Status */}
          {canManage && (
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
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
                <Field label="Note (optional)">
                  <textarea name="completionNote" rows={2} placeholder="e.g. 32 girls attended, 200 kits distributed" className={inputCls} />
                </Field>
                <SubmitButton>Save status</SubmitButton>
              </ActionForm>
              <p className="mt-3 text-xs text-zinc-400">
                Marking it completed prompts the attendance register above.
              </p>
            </Card>
          )}

          {canManage && (
            <ActionForm action={deleteActivity}>
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmit message="Delete this activity? Confirmed volunteers will be told it is cancelled." className={`${btnDanger} w-full`}>
                Delete activity
              </ConfirmSubmit>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}
