"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  ClipboardList,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Assignments",
    url: "/dashboard/assignments",
    icon: ClipboardList,
  },
  {
    title: "More",
    url: "/dashboard/more",
    icon: MoreHorizontal,
  },
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
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
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
