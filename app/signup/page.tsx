import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { EMPLOYEE_CODE_HINT } from "@/lib/models";
import { signup } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BataLogo, BcpLogo, SiteFooter } from "@/components/brand";
import { Field, inputCls } from "@/components/ui";

export const metadata: Metadata = { title: "Employee sign up" };

export default async function SignupPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <>
      <main className="flex flex-1">
        {/* Brand panel */}
        <section className="relative hidden w-2/5 overflow-hidden bg-zinc-950 lg:block">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(204,34,41,0.4),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(204,34,41,0.25),transparent_50%)]"
          />
          <div className="relative flex h-full flex-col justify-between p-12">
            <Link href="/">
              <BataLogo light className="h-9 w-auto" />
            </Link>
            <div>
              <h1 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight text-white">
                Join the Bata Children&apos;s Program.
              </h1>
              <p className="mt-4 max-w-md text-zinc-400">
                Register with your employee code, follow the causes you care about, and get invited
                whenever our NGO partners plan something near you.
              </p>
            </div>
            <BcpLogo light className="h-12 w-auto" />
          </div>
        </section>

        {/* Form panel */}
        <section className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
          <div className="w-full max-w-lg">
            <Link href="/" className="lg:hidden">
              <BataLogo className="mb-8 h-9 w-auto" />
            </Link>

            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-900/5">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Create your account</h2>
              <p className="mt-1 text-sm text-zinc-500">
                For Bata employees. NGO partners are onboarded by the CSR team.
              </p>

              <ActionForm action={signup} className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" className="sm:col-span-2">
                  <input name="name" required autoComplete="name" className={inputCls} />
                </Field>
                <Field label="Employee code">
                  <input
                    name="employeeCode"
                    required
                    placeholder="e.g. BATA-10234"
                    className={`${inputCls} uppercase`}
                  />
                  <span className="mt-1 block text-xs text-zinc-400">{EMPLOYEE_CODE_HINT}</span>
                </Field>
                <Field label="Work email">
                  <input type="email" name="email" required autoComplete="email" className={inputCls} />
                </Field>
                <Field label="Designation (optional)">
                  <input name="designation" placeholder="e.g. Store Manager" className={inputCls} />
                </Field>
                <Field label="Phone (optional)">
                  <input name="phone" autoComplete="tel" className={inputCls} />
                </Field>
                <Field label="Password (min. 8 characters)">
                  <input type="password" name="password" required minLength={8} autoComplete="new-password" className={inputCls} />
                </Field>
                <Field label="Confirm password">
                  <input type="password" name="confirm" required minLength={8} autoComplete="new-password" className={inputCls} />
                </Field>
                <div className="sm:col-span-2">
                  <SubmitButton className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-bata-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-bata-600/25 transition hover:bg-bata-700 disabled:opacity-50">
                    Create account
                  </SubmitButton>
                </div>
              </ActionForm>

              <p className="mt-5 text-center text-sm text-zinc-500">
                Already registered?{" "}
                <Link href="/login" className="font-semibold text-bata-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-400">
              Each employee code can only be registered once.
              <br />
              <Link href="/" className="font-medium text-bata-600 hover:underline">
                ← Back to home
              </Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter dark={false} />
    </>
  );
}
