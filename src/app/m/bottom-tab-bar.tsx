"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, CalendarCheck, Calendar, Mail } from "lucide-react";

const TABS = [
  { href: "/m/inbox", icon: Mail, label: "Inbox" },
  { href: "/m/buchungen", icon: CalendarCheck, label: "Buchungen" },
  { href: "/m/termine", icon: Calendar, label: "Termine" },
  { href: "/m/kontakte", icon: Users, label: "Kontakte" },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] gap-0.5 transition-colors ${
                isActive ? "text-[#0066FF]" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
