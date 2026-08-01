import type { UserDoc } from "@/lib/models";
import { createUser, deleteUser, resetPassword, toggleUserActive, updateUser } from "@/lib/actions/users";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { Badge, btnDanger, btnSecondary, Card, EmptyState, Field, inputCls } from "@/components/ui";
import { formatDate } from "@/lib/utils";

function OrgFields({ user }: { user?: UserDoc }) {
  return (
    <>
      <Field label="Organisation name">
        <input name="orgName" required defaultValue={user?.org?.orgName ?? ""} className={inputCls} />
      </Field>
      <Field label="Registration no. (optional)">
        <input name="regNo" defaultValue={user?.org?.regNo ?? ""} className={inputCls} />
      </Field>
      <Field label="Address (optional)">
        <input name="address" defaultValue={user?.org?.address ?? ""} className={inputCls} />
      </Field>
      <Field label="Contact person (optional)">
        <input name="contactPerson" defaultValue={user?.org?.contactPerson ?? ""} className={inputCls} />
      </Field>
    </>
  );
}

export function UserManager({ users, role }: { users: UserDoc[]; role: "employee" | "ngo" }) {
  const noun = role === "ngo" ? "NGO partner" : "employee";

  return (
    <>
      {/* Create */}
      <details className="group mb-6 rounded-2xl border border-zinc-200 bg-white shadow-sm open:ring-2 open:ring-bata-600/10">
        <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-bata-700 transition group-open:border-b group-open:border-zinc-100">
          + Add {noun}
        </summary>
        <ActionForm action={createUser} resetOnSuccess className="grid gap-4 p-6 sm:grid-cols-2">
          <input type="hidden" name="role" value={role} />
          <Field label={role === "ngo" ? "Account holder name" : "Full name"}>
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Email (used to sign in)">
            <input type="email" name="email" required className={inputCls} />
          </Field>
          <Field label="Phone (optional)">
            <input name="phone" className={inputCls} />
          </Field>
          {role === "employee" ? (
            <Field label="Designation (optional)">
              <input name="designation" placeholder="e.g. Store Manager" className={inputCls} />
            </Field>
          ) : (
            <OrgFields />
          )}
          <div className="sm:col-span-2">
            <SubmitButton>Create account</SubmitButton>
            <p className="mt-2 text-xs text-zinc-400">
              A temporary password is generated and, if email is configured, sent to the {noun}.
            </p>
          </div>
        </ActionForm>
      </details>

      {/* List */}
      {users.length === 0 ? (
        <EmptyState title={`No ${noun}s yet`} hint={`Use “Add ${noun}” above to create the first account.`} />
      ) : (
        <div className="grid gap-3">
          {users.map((u) => {
            const id = u._id.toString();
            return (
              <Card key={id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bata-50 font-bold text-bata-700">
                    {(role === "ngo" ? u.org?.orgName || u.name : u.name)
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-900">
                      {role === "ngo" ? u.org?.orgName || u.name : u.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {role === "ngo" && <>Contact: {u.org?.contactPerson || u.name} · </>}
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ""}
                      {role === "employee" && u.designation ? ` · ${u.designation}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.mustChangePassword && <Badge value="pending" label="temp password" />}
                    <Badge value={u.active ? "active" : "inactive"} />
                    <span className="hidden text-xs text-zinc-400 sm:block">
                      since {formatDate(u.createdAt as unknown as Date)}
                    </span>
                  </div>
                </div>

                <details className="border-t border-zinc-100">
                  <summary className="cursor-pointer select-none px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-bata-700">
                    Manage account
                  </summary>
                  <div className="grid gap-6 border-t border-zinc-100 bg-zinc-50/60 p-4 lg:grid-cols-[1fr_auto]">
                    {/* Edit */}
                    <ActionForm action={updateUser} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="id" value={id} />
                      <Field label="Name">
                        <input name="name" required defaultValue={u.name} className={inputCls} />
                      </Field>
                      <Field label="Phone">
                        <input name="phone" defaultValue={u.phone ?? ""} className={inputCls} />
                      </Field>
                      {role === "employee" ? (
                        <Field label="Designation">
                          <input name="designation" defaultValue={u.designation ?? ""} className={inputCls} />
                        </Field>
                      ) : (
                        <OrgFields user={u} />
                      )}
                      <div className="sm:col-span-2">
                        <SubmitButton className={btnSecondary}>Save changes</SubmitButton>
                      </div>
                    </ActionForm>

                    {/* Danger zone */}
                    <div className="flex flex-col gap-2 lg:w-52">
                      <ActionForm action={resetPassword}>
                        <input type="hidden" name="id" value={id} />
                        <ConfirmSubmit
                          message={`Reset the password for ${u.name}? Their current password stops working immediately.`}
                          className={`${btnSecondary} w-full`}
                        >
                          Reset password
                        </ConfirmSubmit>
                      </ActionForm>
                      <form action={toggleUserActive}>
                        <input type="hidden" name="id" value={id} />
                        <button className={`${btnSecondary} w-full`}>
                          {u.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                      <ActionForm action={deleteUser}>
                        <input type="hidden" name="id" value={id} />
                        <ConfirmSubmit
                          message={`Permanently delete ${u.name}'s account? This cannot be undone.`}
                          className={`${btnDanger} w-full`}
                        >
                          Delete account
                        </ConfirmSubmit>
                      </ActionForm>
                    </div>
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
