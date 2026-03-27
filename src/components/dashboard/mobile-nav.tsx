"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarCheck,
  Bell,
  User,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Members", url: "/dashboard/members", icon: User },
  { title: "Attendance", url: "/dashboard/attendance", icon: CalendarCheck },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "More", url: "/dashboard/more", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.url || (item.url === "/dashboard" && pathname === "/dashboard");
          return (
            <Link
              key={item.title}
              href={item.url}
              aria-label={item.title}
              className={cn(
                "flex flex-1 items-center justify-center px-2 py-3 transition-colors rounded-full mx-1",
                isActive
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6 shrink-0", isActive && "text-primary")} aria-hidden />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
