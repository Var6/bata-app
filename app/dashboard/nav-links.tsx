"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // SVG path d=
  badge?: number;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-bata-600 text-white shadow-md shadow-bata-600/25"
                  : "text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                className="size-5 shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-bata-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
