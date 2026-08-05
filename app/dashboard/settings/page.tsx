import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { changePassword, updateProfile } from "@/lib/actions/auth";
import { fileUrl } from "@/lib/r2";
import { roleLabel } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar } from "@/components/brand";
import { Badge, btnSecondary, Card, Field, inputCls, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage(props: {
  searchParams: Promise<{ force?: string }>;
}) {
  const user = await requireUser();
  const { force } = await props.searchParams;
  const mustChange = force === "1" || user.mustChangePassword;

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile and security." />

      {mustChange && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          You are using a temporary password. Please set a new one below.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={fileUrl(user.avatarKey)} className="size-16" />
            <div>
              <h2 className="font-bold text-zinc-900">{user.name}</h2>
              <div className="mt-1">
                <Badge value={user.role} label={roleLabel(user.role)} />
              </div>
              {user.employeeCode && (
                <p className="mt-1 text-xs text-zinc-400">Employee code: {user.employeeCode}</p>
              )}
            </div>
          </div>

          <ActionForm action={updateProfile} className="mt-6 space-y-4">
            <Field label="Profile picture">
              <input
                type="file"
                name="avatar"
                accept="image/*"
                className={`${inputCls} file:mr-3 file:rounded-md file:border-0 file:bg-bata-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-bata-700`}
              />
            </Field>
            <Field label="Full name">
              <input name="name" required defaultValue={user.name} className={inputCls} />
            </Field>
            <Field label="Email (used to sign in)">
              <input type="email" name="email" required defaultValue={user.email} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={user.phone ?? ""} className={inputCls} />
            </Field>
            {user.role === "employee" && (
              <Field label="Designation">
                <input name="designation" defaultValue={user.designation ?? ""} className={inputCls} />
              </Field>
            )}
            {user.role === "ngo" && (
              <>
                <Field label="Organisation name">
                  <input name="orgName" defaultValue={user.org?.orgName ?? ""} className={inputCls} />
                </Field>
                <Field label="Contact person">
                  <input name="contactPerson" defaultValue={user.org?.contactPerson ?? ""} className={inputCls} />
                </Field>
                <Field label="Address">
                  <input name="orgAddress" defaultValue={user.org?.address ?? ""} className={inputCls} />
                </Field>
              </>
            )}
            <SubmitButton>Save profile</SubmitButton>
          </ActionForm>
        </Card>

        <Card className="h-fit p-6">
          <h2 className="font-bold text-zinc-900">Change password</h2>
          <ActionForm action={changePassword} resetOnSuccess className="mt-4 space-y-4">
            <Field label="Current password">
              <input type="password" name="current" required autoComplete="current-password" className={inputCls} />
            </Field>
            <Field label="New password (min. 8 characters)">
              <input type="password" name="next" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" name="confirm" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <SubmitButton className={btnSecondary}>Update password</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
