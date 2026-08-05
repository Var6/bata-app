"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/db";
import { Notification } from "@/lib/models";
import { requireUser } from "@/lib/session";

export async function markAllRead() {
  const me = await requireUser();
  await dbConnect();
  await Notification.updateMany({ user: me._id, read: false }, { $set: { read: true } });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export async function markRead(formData: FormData) {
  const me = await requireUser();
  await dbConnect();
  await Notification.updateOne(
    { _id: String(formData.get("id")), user: me._id },
    { $set: { read: true } }
  );
  revalidatePath("/dashboard/notifications");
}
