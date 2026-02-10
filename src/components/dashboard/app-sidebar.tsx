"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Bell,
  Settings,
  ClipboardList,
  FileText,
  CalendarCheck,
  Heart,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "pastor" | "shepherd")[]; // If undefined, show to all roles
}

const allMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: Users,
    roles: ["admin"], // Admin only
  },
  {
    title: "Shepherds",
    url: "/dashboard/shepherds",
    icon: Users,
    roles: ["admin", "pastor"], // Admin and Pastor
  },
  {
    title: "Members",
    url: "/dashboard/members",
    icon: UserCheck,
  },
  {
    title: "Groups",
    url: "/dashboard/groups",
    icon: Users,
  },
  {
    title: "Assignments",
    url: "/dashboard/assignments",
    icon: ClipboardList,
  },
  {
    title: "Attendance",
    url: "/dashboard/attendance",
    icon: CalendarCheck,
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: FileText,
    roles: ["admin", "pastor", "shepherd"], // Shepherds view/submit their own reports
  },
  {
    title: "Prayer Requests",
    url: "/dashboard/prayer-requests",
    icon: Heart,
  },
  {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: Bell,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
    roles: ["admin", "pastor"], // Admin and Pastor
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    roles: ["admin"], // Admin only
  },
  {
    title: "Audit Log",
    url: "/dashboard/audit-log",
    icon: FileText,
    roles: ["admin"], // Admin only
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  // Filter menu items based on user role
  const menuItems = React.useMemo(() => {
    if (!currentUser) return [];
    
    return allMenuItems.filter((item) => {
      // If no roles specified, show to all
      if (!item.roles) return true;
      // Otherwise, check if user's role is in the allowed roles
      return item.roles.includes(currentUser.role);
    });
  }, [currentUser]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url || pathname?.startsWith(item.url + "/") || (item.url === "/dashboard" && pathname === "/dashboard");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url} className="flex items-center gap-2 w-full">
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
