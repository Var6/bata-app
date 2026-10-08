import type { Metadata } from "next";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { btnSecondary, inputCls, PageHeader } from "@/components/ui";
import { UserManager } from "@/components/user-table";

export const metadata: Metadata = { title: "Employees" };

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function EmployeesPage(props: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(["director"]);
  const q = (await props.searchParams).q?.trim() ?? "";

  await dbConnect();
  const filter = q
    ? {
        role: "employee" as const,
        $or: [
          { name: { $regex: escapeRegex(q), $options: "i" } },
          { employeeCode: { $regex: `^${escapeRegex(q)}`, $options: "i" } },
          { email: { $regex: escapeRegex(q), $options: "i" } },
          { designation: { $regex: escapeRegex(q), $options: "i" } },
        ],
      }
    : { role: "employee" as const };

  const [users, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).lean<UserDoc[]>(),
    User.countDocuments({ role: "employee" }),
  ]);

  return (
    <>
      <PageHeader
        title="Bata Employees"
        subtitle={`${total} employee accounts. Employees sign in with their employee code; reset a password from “Manage account”.`}
      >
        <form method="get" className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, code or designation"
            aria-label="Search employees"
            className={`${inputCls} w-64`}
          />
          <button className={btnSecondary}>Search</button>
        </form>
      </PageHeader>
      {q && (
        <p className="mb-4 text-sm text-zinc-500">
          {users.length} match{users.length === 1 ? "" : "es"} for “{q}”.{" "}
          <a href="/dashboard/employees" className="font-medium text-bata-600 hover:underline">
            Clear
          </a>
        </p>
      )}
      <UserManager users={users} role="employee" emptyHint={q ? "No employees match your search" : undefined} />
    </>
  );
}
