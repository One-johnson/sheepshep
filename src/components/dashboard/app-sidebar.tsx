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
  ChevronDown,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/auth-context";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "pastor" | "shepherd")[];
}

type NavGroupKey = "main" | "people" | "ministry" | "insights" | "system";

interface MenuItemWithGroup extends MenuItem {
  group: NavGroupKey;
}

const allMenuItems: MenuItemWithGroup[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, group: "main" },
  { title: "Users", url: "/dashboard/users", icon: Users, roles: ["admin"], group: "people" },
  { title: "Regions", url: "/dashboard/regions", icon: MapPin, roles: ["admin"], group: "people" },
  { title: "Shepherds", url: "/dashboard/shepherds", icon: Users, roles: ["admin", "pastor"], group: "people" },
  { title: "Members", url: "/dashboard/members", icon: UserCheck, group: "people" },
  { title: "Groups", url: "/dashboard/groups", icon: Users, group: "people" },
  { title: "Assignments", url: "/dashboard/assignments", icon: ClipboardList, group: "ministry" },
  { title: "Attendance", url: "/dashboard/attendance", icon: CalendarCheck, group: "ministry" },
  { title: "Events", url: "/dashboard/events", icon: Calendar, roles: ["admin", "pastor", "shepherd"], group: "ministry" },
  { title: "Reports", url: "/dashboard/reports", icon: FileText, roles: ["admin", "pastor", "shepherd"], group: "ministry" },
  { title: "Prayer Requests", url: "/dashboard/prayer-requests", icon: Heart, group: "ministry" },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell, group: "insights" },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3, roles: ["admin", "pastor"], group: "insights" },
  { title: "Support", url: "/dashboard/support", icon: HelpCircle, roles: ["admin"], group: "system" },
  { title: "Settings", url: "/dashboard/settings", icon: Settings, roles: ["admin"], group: "system" },
  { title: "Audit Log", url: "/dashboard/audit-log", icon: FileText, roles: ["admin"], group: "system" },
];

const navGroupConfig: Record<
  NavGroupKey,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  main: { label: "Main", icon: LayoutDashboard },
  people: { label: "People", icon: Users },
  ministry: { label: "Ministry", icon: ClipboardList },
  insights: { label: "Insights", icon: BarChart3 },
  system: { label: "System", icon: Settings },
};

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

  const menuItems = React.useMemo(() => {
    if (!currentUser) return [];
    return allMenuItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(currentUser.role);
    });
  }, [currentUser]);

  const itemsByGroup = React.useMemo(() => {
    const map = new Map<NavGroupKey, MenuItemWithGroup[]>();
    for (const item of menuItems) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [menuItems]);

  const isItemActive = (url: string) =>
    pathname === url ||
    (pathname?.startsWith(url + "/") ?? false) ||
    (url === "/dashboard" && pathname === "/dashboard");

  const isGroupActive = (items: MenuItemWithGroup[]) =>
    items.some((item) => isItemActive(item.url));

  const orderedGroups: NavGroupKey[] = ["main", "people", "ministry", "insights", "system"];

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
              {orderedGroups.map((groupKey) => {
                const items = itemsByGroup.get(groupKey) ?? [];
                if (items.length === 0) return null;

                const config = navGroupConfig[groupKey];
                const GroupIcon = config.icon;
                const hasSubItems = items.length > 1 || (items.length === 1 && groupKey !== "main");

                if (groupKey === "main" && items.length === 1) {
                  const item = items[0];
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={groupKey}>
                      <SidebarMenuButton asChild isActive={isItemActive(item.url)} tooltip={item.title}>
                        <Link href={item.url} className="flex items-center gap-2 w-full" onClick={closeMobileSidebar}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={groupKey}
                    asChild
                    defaultOpen={isGroupActive(items)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={config.label} isActive={isGroupActive(items)}>
                          <GroupIcon />
                          <span>{config.label}</span>
                          <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {items.map((item) => {
                            const Icon = item.icon;
                            const active = isItemActive(item.url);
                            return (
                              <SidebarMenuSubItem key={item.url}>
                                <SidebarMenuSubButton asChild isActive={active}>
                                  <Link
                                    href={item.url}
                                    className="flex items-center gap-2 w-full"
                                    onClick={closeMobileSidebar}
                                  >
                                    <Icon />
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
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
