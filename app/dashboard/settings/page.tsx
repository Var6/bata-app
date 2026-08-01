import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { changePassword } from "@/lib/actions/auth";
import { labelize } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, inputCls, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage(props: {
  searchParams: Promise<{ force?: string }>;
}) {
  const user = await requireUser();
  const { force } = await props.searchParams;
  const mustChange = force === "1" || user.mustChangePassword;

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and security." />

      {mustChange && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          You are using a temporary password. Please set a new one now.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-bold text-zinc-900">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Name</dt>
              <dd className="text-zinc-800">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Email</dt>
              <dd className="text-zinc-800">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Role</dt>
              <dd className="mt-1">
                <Badge value={user.role} label={user.role === "ngo" ? "NGO Partner" : labelize(user.role)} />
              </dd>
            </div>
            {user.role === "ngo" && user.org?.orgName && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Organisation</dt>
                <dd className="text-zinc-800">{user.org.orgName}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs text-zinc-400">
            Profile details are managed by the director.
          </p>
        </Card>

        <Card className="p-6">
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
            <SubmitButton>Update password</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
