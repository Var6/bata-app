import type { Metadata } from "next";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { Notification, type NotificationDoc } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { markAllRead } from "@/lib/actions/notifications";
import { Card, EmptyState, PageHeader, btnSecondary } from "@/components/ui";

export const metadata: Metadata = { title: "Notifications" };

const tone: Record<string, string> = {
  "activity-invite": "bg-blue-50 text-blue-700",
  "attendance-confirmed": "bg-emerald-50 text-emerald-700",
  "attendance-declined": "bg-zinc-100 text-zinc-600",
  "attendance-review": "bg-amber-50 text-amber-700",
  "project-assigned": "bg-violet-50 text-violet-700",
  general: "bg-zinc-100 text-zinc-600",
};

function timeAgo(d: Date): string {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  await dbConnect();
  const items = await Notification.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<NotificationDoc[]>();
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : "You're all caught up."}>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className={btnSecondary}>Mark all read</button>
          </form>
        )}
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          hint={
            user.role === "ngo"
              ? "You'll be told when Bata volunteers confirm for your activities."
              : "Follow a project and you'll hear when activities are scheduled."
          }
        />
      ) : (
        <div className="grid gap-2">
          {items.map((n) => {
            const body = (
              <Card className={`p-4 transition ${n.read ? "" : "border-bata-200 bg-bata-50/40"}`}>
                <div className="flex items-start gap-3">
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-bata-600" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-900">{n.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone[n.type] ?? tone.general}`}>
                        {n.type.replace(/-/g, " ")}
                      </span>
                    </div>
                    {n.body && <p className="mt-1 text-sm text-zinc-600">{n.body}</p>}
                    <p className="mt-1 text-xs text-zinc-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </Card>
            );
            return n.link ? (
              <Link key={String(n._id)} href={n.link}>
                {body}
              </Link>
            ) : (
              <div key={String(n._id)}>{body}</div>
            );
          })}
        </div>
      )}
    </>
  );
}
