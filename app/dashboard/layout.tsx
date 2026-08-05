import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { unreadCount } from "@/lib/notify";
import { fileUrl } from "@/lib/r2";
import { roleLabel } from "@/lib/utils";
import { Avatar, BataLogo, BcpMark, SiteFooter } from "@/components/brand";
import { NavLinks, type NavItem } from "./nav-links";

const icons = {
  home: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  folder:
    "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z",
  users:
    "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  heart:
    "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
  chart:
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  bell: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
  cog: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  await dbConnect();
  const unread = await unreadCount(user._id);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: icons.home },
    { href: "/dashboard/projects", label: "Projects", icon: icons.folder },
    { href: "/dashboard/activities", label: "Activities", icon: icons.calendar },
    { href: "/dashboard/notifications", label: "Notifications", icon: icons.bell, badge: unread },
  ];
  if (user.role === "director") {
    nav.push(
      { href: "/dashboard/employees", label: "Employees", icon: icons.users },
      { href: "/dashboard/ngos", label: "NGO Partners", icon: icons.heart },
      { href: "/dashboard/reports", label: "Reports", icon: icons.chart }
    );
  }
  nav.push({ href: "/dashboard/settings", label: "Settings", icon: icons.cog });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex flex-col gap-6 bg-zinc-950 p-4 lg:min-h-screen lg:w-64 lg:shrink-0 lg:p-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BataLogo light className="h-6 w-auto" />
          <span className="h-6 w-px bg-zinc-700" />
          <BcpMark className="h-7 w-auto" />
        </Link>

        <nav className="flex-1">
          <NavLinks items={nav} />
        </nav>

        <div className="hidden rounded-xl border border-white/10 bg-white/5 p-3 lg:block">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} src={fileUrl(user.avatarKey)} className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-zinc-400">
                {user.role === "ngo" ? user.org?.orgName || "NGO Partner" : roleLabel(user.role)}
              </p>
            </div>
          </div>
          <a
            href="/logout"
            className="mt-3 block rounded-lg border border-white/15 px-3 py-1.5 text-center text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            Sign out
          </a>
        </div>
        <a
          href="/logout"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-center text-xs font-semibold text-zinc-300 lg:hidden"
        >
          Sign out ({user.name.split(" ")[0]})
        </a>
      </aside>

      <div className="flex flex-1 flex-col bg-zinc-50">
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</div>
        <SiteFooter dark={false} />
      </div>
    </div>
  );
}
