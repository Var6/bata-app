import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1">
      {/* Brand panel */}
      <section className="relative hidden w-1/2 overflow-hidden bg-zinc-950 lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(204,34,41,0.4),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(204,34,41,0.25),transparent_50%)]"
        />
        <div
          aria-hidden
          className="animate-float absolute -bottom-32 -left-32 size-[420px] rounded-full bg-bata-600/25 blur-3xl"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/">
            <img src="/bata-logo-white.svg" alt="Bata" className="h-9 w-auto" />
          </Link>
          <div>
            <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight text-white">
              Every hour volunteered is a step forward.
            </h1>
            <p className="mt-4 max-w-md text-zinc-400">
              Plan school activities with NGO partners, share checklists, and track the
              impact of the Bata team — all in one portal.
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            Bata CSR Portal · Directors, employees &amp; NGO partners
          </p>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden">
            <img src="/bata-logo.svg" alt="Bata" className="mb-8 h-9 w-auto" />
          </Link>
          <LoginForm />
          <p className="mt-8 text-center text-xs text-zinc-400">
            Accounts are created by the programme director.
            <br />
            <Link href="/" className="font-medium text-bata-600 hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
