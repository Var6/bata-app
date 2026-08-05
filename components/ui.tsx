import type { ReactNode } from "react";

/* Small, server-renderable building blocks shared across the dashboard. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "in-progress": "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "on-hold": "bg-amber-50 text-amber-700 ring-amber-600/20",
  suspended: "bg-bata-50 text-bata-700 ring-bata-600/20",
  invited: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-zinc-100 text-zinc-400 ring-zinc-400/20",
  director: "bg-bata-50 text-bata-700 ring-bata-600/20",
  employee: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ngo: "bg-violet-50 text-violet-700 ring-violet-600/20",
  inactive: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  const style = badgeStyles[value] ?? "bg-zinc-100 text-zinc-600 ring-zinc-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label ?? value.replace(/-/g, " ")}
    </span>
  );
}

export const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-bata-600 focus:outline-none focus:ring-2 focus:ring-bata-600/20";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-bata-700 focus:outline-none focus:ring-2 focus:ring-bata-600/40 disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-bata-200 bg-bata-50 px-3 py-1.5 text-xs font-semibold text-bata-700 transition hover:bg-bata-100 disabled:opacity-50";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center">
      <p className="text-sm font-medium text-zinc-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
