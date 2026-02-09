"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Settings,
  User,
  UserCheck,
  Moon,
  Sun,
  FileText,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";

export default function MorePage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const logout = useMutation(api.auth.logout);
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      if (token) {
        await logout({ token });
      }
      localStorage.removeItem("authToken");
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to logout");
    }
  };

  const menuItems = [
    {
      title: "Settings",
      icon: Settings,
      onClick: () => router.push("/dashboard/settings"),
    },
    {
      title: "Profile",
      icon: User,
      onClick: () => router.push("/dashboard/profile"),
    },
    {
      title: "Members",
      icon: UserCheck,
      onClick: () => router.push("/dashboard/members"),
    },
    {
      title: "Audit Log",
      icon: FileText,
      onClick: () => router.push("/dashboard/audit-log"),
    },
  ];

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">More</h1>
          <p className="text-sm text-muted-foreground">
            Additional options and settings
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>
            Access various features and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.title}
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4"
                onClick={item.onClick}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span className="flex-1 text-left">{item.title}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Theme Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Change the theme of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mounted && theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  {mounted ? (theme === "dark" ? "Dark mode" : "Light mode") : "Loading..."}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
