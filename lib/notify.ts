import { Types } from "mongoose";
import { Notification, User, type NotificationType } from "@/lib/models";
import { emailConfigured, sendEmail } from "@/lib/email";

interface NotifyInput {
  user: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /** Also send an email when EmailJS is configured. */
  email?: boolean;
}

/**
 * Creates in-app notifications (and optional emails). Notifications are always
 * addressed to specific users — never broadcast to every NGO.
 */
export async function notify(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;

  await Notification.insertMany(
    inputs.map((n) => ({
      user: n.user,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
    }))
  );

  const emailTargets = inputs.filter((n) => n.email);
  if (emailTargets.length === 0 || !emailConfigured()) return;

  const recipients = await User.find({
    _id: { $in: emailTargets.map((n) => n.user) },
    active: true,
  })
    .select("name email")
    .lean();
  const byId = new Map(recipients.map((r) => [String(r._id), r]));

  await Promise.all(
    emailTargets.map(async (n) => {
      const to = byId.get(String(n.user));
      if (!to) return;
      await sendEmail({
        toEmail: to.email,
        toName: to.name,
        subject: n.title,
        message: `${n.body ?? n.title}\n\n— Bata CSR Portal`,
      });
    })
  );
}

export async function unreadCount(userId: Types.ObjectId | string): Promise<number> {
  return Notification.countDocuments({ user: userId, read: false });
}
