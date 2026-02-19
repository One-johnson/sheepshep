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
  Calendar,
  HelpCircle,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";

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
    title: "Regions",
    url: "/dashboard/regions",
    icon: MapPin,
    roles: ["admin"],
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
    title: "Events",
    url: "/dashboard/events",
    icon: Calendar,
    roles: ["admin", "pastor", "shepherd"],
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
    title: "Support",
    url: "/dashboard/support",
    icon: HelpCircle,
    roles: ["admin"], // Admin only
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
  const { isMobile, setOpenMobile } = useSidebar();
  const { token } = useAuth();

  const closeMobileSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

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
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden rounded-md p-2 outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2"
          onClick={closeMobileSidebar}
        >
          <Image
            src="/logo.png"
            alt="SheepShep"
            width={44}
            height={44}
            className="size-11 shrink-0 object-contain group-data-[collapsible=icon]:size-8"
          />
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
            SheepShep
          </span>
        </Link>
      </SidebarHeader>
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
                      <Link
                        href={item.url}
                        className="flex items-center gap-2 w-full"
                        onClick={closeMobileSidebar}
                      >
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
      <SidebarSeparator />
      <SidebarFooter>
        <p className="text-xs text-muted-foreground truncate group-data-[collapsible=icon]:hidden" title="FlowRiver Technologies">
          FlowRiver Technologies
        </p>
        <p className="text-[10px] text-muted-foreground/80 truncate group-data-[collapsible=icon]:hidden">
          SheepShep
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
