import type { Metadata } from "next";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { UserManager } from "@/components/user-table";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  await requireUser(["director"]);
  await dbConnect();
  const users = await User.find({ role: "employee" }).sort({ createdAt: -1 }).lean<UserDoc[]>();

  return (
    <>
      <PageHeader
        title="Bata Employees"
        subtitle="Create accounts for the Bata team members who volunteer in school activities."
      />
      <UserManager users={users} role="employee" />
    </>
  );
}
