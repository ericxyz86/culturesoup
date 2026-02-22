"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FireIcon, LayoutDashboardIcon, FileTextIcon, HistoryIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/posts", label: "Posts", icon: FileTextIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#222] bg-[#0a0a0a] sticky top-0 z-50">
      <div className="max-w-[900px] mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
          <FireIcon className="w-5 h-5 text-[#ff6b35]" />
          <span>Culture<span className="text-[#ff6b35]">Soup</span></span>
        </Link>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#1a1a2e] text-[#ff6b35]"
                    : "text-[#888] hover:text-white hover:bg-[#111]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
