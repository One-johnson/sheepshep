"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AppHeader } from "@/components/dashboard/app-header";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { AuthProvider } from "@/contexts/auth-context";

export function DashboardLayoutClient({
  initialToken,
  children,
}: {
  initialToken: string | null;
  children: React.ReactNode;
}) {
  return (
    <AuthProvider initialToken={initialToken}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0 pb-20 md:pb-6 min-w-0 overflow-x-hidden">
            {children}
          </main>
          <MobileNav />
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
