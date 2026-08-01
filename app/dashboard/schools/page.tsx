import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Activity, School, type SchoolDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { fileUrl } from "@/lib/r2";
import { createSchool, deleteSchool, updateSchool } from "@/lib/actions/schools";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { btnDanger, btnSecondary, Card, EmptyState, Field, inputCls, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Schools" };

function SchoolFields({ school }: { school?: SchoolDoc }) {
  return (
    <>
      <Field label="School name">
        <input name="name" required defaultValue={school?.name} placeholder="e.g. Govt. Middle School, Purnea" className={inputCls} />
      </Field>
      <Field label="City / District">
        <input name="city" required defaultValue={school?.city} placeholder="e.g. Purnea" className={inputCls} />
      </Field>
      <Field label="State (optional)">
        <input name="state" defaultValue={school?.state ?? ""} placeholder="e.g. Bihar" className={inputCls} />
      </Field>
      <Field label="Address (optional)">
        <input name="address" defaultValue={school?.address ?? ""} className={inputCls} />
      </Field>
      <Field label="Contact person (optional)">
        <input name="contactName" defaultValue={school?.contactName ?? ""} placeholder="e.g. Headmaster" className={inputCls} />
      </Field>
      <Field label="Contact phone (optional)">
        <input name="contactPhone" defaultValue={school?.contactPhone ?? ""} className={inputCls} />
      </Field>
      <Field label="Notes (optional)" className="sm:col-span-2">
        <textarea name="notes" rows={2} defaultValue={school?.notes ?? ""} className={inputCls} />
      </Field>
      <Field label="Photo (optional)" className="sm:col-span-2">
        <input type="file" name="photo" accept="image/*" className={`${inputCls} file:mr-3 file:rounded-md file:border-0 file:bg-bata-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-bata-700`} />
      </Field>
    </>
  );
}

export default async function SchoolsPage() {
  const user = await requireUser(["director", "employee"]);
  await dbConnect();

  const schools = await School.find({}).sort({ name: 1 }).lean<SchoolDoc[]>();
  const counts = await Activity.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$school", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const isDirector = user.role === "director";

  return (
    <>
      <PageHeader
        title="Schools"
        subtitle={
          isDirector
            ? "Public schools that Bata funds and manages with NGO partners."
            : "The schools where activities take place."
        }
      />

      {isDirector && (
        <details className="group mb-6 rounded-2xl border border-zinc-200 bg-white shadow-sm open:ring-2 open:ring-bata-600/10">
          <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-bata-700 transition group-open:border-b group-open:border-zinc-100">
            + Add school
          </summary>
          <ActionForm action={createSchool} resetOnSuccess className="grid gap-4 p-6 sm:grid-cols-2">
            <SchoolFields />
            <div className="sm:col-span-2">
              <SubmitButton>Add school</SubmitButton>
            </div>
          </ActionForm>
        </details>
      )}

      {schools.length === 0 ? (
        <EmptyState
          title="No schools yet"
          hint={isDirector ? "Add the first school above." : "The director hasn't registered any schools yet."}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {schools.map((s) => {
            const id = s._id.toString();
            const photo = fileUrl(s.photoKey);
            const count = countMap.get(id) ?? 0;
            return (
              <Card key={id} className="overflow-hidden">
                <div className="flex gap-4 p-5">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bata-50 text-2xl">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🏫"
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900">{s.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {[s.city, s.state].filter(Boolean).join(", ")}
                    </p>
                    {(s.contactName || s.contactPhone) && (
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {[s.contactName, s.contactPhone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-xs">
                      <Link
                        href={`/dashboard/activities?school=${id}`}
                        className="font-medium text-bata-600 hover:underline"
                      >
                        {count} {count === 1 ? "activity" : "activities"} →
                      </Link>
                    </p>
                  </div>
                </div>

                {isDirector && (
                  <details className="border-t border-zinc-100">
                    <summary className="cursor-pointer select-none px-5 py-2 text-xs font-semibold text-zinc-500 hover:text-bata-700">
                      Manage school
                    </summary>
                    <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/60 p-5">
                      <ActionForm action={updateSchool} className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={id} />
                        <SchoolFields school={s} />
                        <div className="sm:col-span-2">
                          <SubmitButton className={btnSecondary}>Save changes</SubmitButton>
                        </div>
                      </ActionForm>
                      <ActionForm action={deleteSchool}>
                        <input type="hidden" name="id" value={id} />
                        <ConfirmSubmit message={`Delete “${s.name}”?`} className={btnDanger}>
                          Delete school
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
