import type { Metadata } from "next";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { UserManager } from "@/components/user-table";

export const metadata: Metadata = { title: "NGO Partners" };

export default async function NgosPage() {
  await requireUser(["director"]);
  await dbConnect();
  const users = await User.find({ role: "ngo" }).sort({ createdAt: -1 }).lean<UserDoc[]>();

  return (
    <>
      <PageHeader
        title="NGO Partners"
        subtitle="Organisations that manage schools with Bata — for example Janman People's Foundation in Purnea."
      />
      <UserManager users={users} role="ngo" />
    </>
  );
}
