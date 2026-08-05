"use client";

import { useState } from "react";
import { login, forgotPassword } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, inputCls } from "@/components/ui";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "forgot">("login");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-900/5">
      {mode === "login" ? (
        <>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome back</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in as CSR team, Bata employee, or NGO partner.
          </p>
          <ActionForm action={login} className="mt-6 space-y-4">
            <Field label="Email">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputCls}
              />
            </Field>
            <SubmitButton className="w-full rounded-lg bg-bata-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-bata-600/25 transition hover:bg-bata-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              Sign in
            </SubmitButton>
          </ActionForm>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="mt-4 w-full text-center text-sm font-medium text-bata-600 hover:underline"
          >
            Forgot your password?
          </button>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Reset password</h2>
          <p className="mt-1 text-sm text-zinc-500">
            We&apos;ll email you a temporary password if an account exists.
          </p>
          <ActionForm action={forgotPassword} className="mt-6 space-y-4">
            <Field label="Email">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={inputCls}
              />
            </Field>
            <SubmitButton className="w-full rounded-lg bg-bata-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-bata-600/25 transition hover:bg-bata-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              Send temporary password
            </SubmitButton>
          </ActionForm>
          <button
            type="button"
            onClick={() => setMode("login")}
            className="mt-4 w-full text-center text-sm font-medium text-zinc-500 hover:underline"
          >
            ← Back to sign in
          </button>
        </>
      )}
    </div>
  );
}
