"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Home,
  Users,
  UserCheck,
  ClipboardList,
  CalendarCheck,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "pastor" | "shepherd")[];
}

const allNavItems: NavItem[] = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Members", url: "/dashboard/members", icon: UserCheck, roles: ["shepherd"] },
  { title: "Attendance", url: "/dashboard/attendance", icon: CalendarCheck, roles: ["shepherd"] },
  { title: "Users", url: "/dashboard/users", icon: Users, roles: ["admin"] },
  { title: "Shepherds", url: "/dashboard/shepherds", icon: Users, roles: ["pastor"] },
  { title: "Assignments", url: "/dashboard/assignments", icon: ClipboardList, roles: ["admin", "pastor", "shepherd"] },
  { title: "Events", url: "/dashboard/events", icon: Calendar, roles: ["admin", "pastor", "shepherd"] },
  { title: "More", url: "/dashboard/more", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const currentUser = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");

  const navItems = React.useMemo(() => {
    if (!currentUser) return allNavItems.filter((i) => i.title === "Home" || i.title === "More");
    return allNavItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(currentUser.role);
    });
  }, [currentUser]);

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
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors rounded-full mx-1",
                isActive
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn("text-[10px]", isActive && "font-medium")}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
