import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  return (
    <DashboardLayoutClient initialToken={sessionToken}>
      {children}
    </DashboardLayoutClient>
  );
}
