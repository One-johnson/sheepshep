"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsDrawer } from "@/components/dashboard/notifications-drawer";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { useAuth } from "@/contexts/auth-context";
import { clearSessionCookie } from "@/lib/session";

function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "admin":
      return "destructive";
    case "pastor":
      return "default";
    case "shepherd":
      return "secondary";
    default:
      return "outline";
  }
}

function getRoleBadgeClassName(role: string): string {
  switch (role) {
    case "pastor":
      return "bg-blue-500 hover:bg-blue-600 text-white border-blue-500";
    case "shepherd":
      return "bg-green-500 hover:bg-green-600 text-white border-green-500";
    case "admin":
      return "bg-red-500 hover:bg-red-600 text-white border-red-500";
    default:
      return "";
  }
}

export function AppHeader() {
  const router = useRouter();
  const { token, setToken } = useAuth();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  const profilePhotoUrl = useQuery(
    api.storage.getFileUrl,
    token && currentUser?.profilePhotoId
      ? { token, storageId: currentUser.profilePhotoId }
      : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    token ? { token } : "skip"
  );

  // Redirect to login if no token, user, or unauthorized error
  React.useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    
    // Check if queries failed with unauthorized error (token invalid/expired)
    if (currentUser === null && token) {
      clearSessionCookie();
      setToken(null);
      router.push("/login");
    }
  }, [token, currentUser, router, setToken]);

  const logout = useMutation(api.auth.logout);

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (token) {
        await logout({ token });
      }
      clearSessionCookie();
      setToken(null);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to logout");
      setIsLoggingOut(false);
      setLogoutDialogOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0 self-start">
      <div className="container relative flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Hamburger — reserve min width on mobile so logo center stays clear */}
        <div className="flex min-w-[3.5rem] flex-1 items-center md:min-w-0 md:flex-initial md:flex-none">
          <SidebarTrigger className="-ml-1 size-10 touch-manipulation md:size-7" />
        </div>

        {/* Center: Logo — absolutely centered, constrained so it doesn't overlap side content */}
        <Link
          href="/dashboard"
          className="absolute left-1/2 top-1/2 z-10 flex max-w-[5.5rem] -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:static md:max-w-none md:translate-x-0 md:translate-y-0"
        >
          <Image
            src="/logo.png"
            alt="SheepShep"
            width={120}
            height={50}
            className="h-12 w-auto object-contain md:h-7"
            priority
          />
        </Link>

        {/* Right: Search + actions — on mobile all actions (search, notifications, profile) grouped right; logo stays center */}
        <div className="flex min-w-[8.5rem] flex-1 items-center justify-end gap-2 md:min-w-0 md:flex-1 md:justify-between md:gap-4">
          {/* Search: full bar on desktop only */}
          <div className="hidden w-full max-w-md md:block">
            <Button
              variant="outline"
              className="w-full justify-start text-sm text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              Search members, shepherds, pastors...
              <kbd className="pointer-events-none ml-auto h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 hidden lg:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right actions: on mobile includes search icon; on desktop theme, notifications, profile */}
          <div className="flex items-center justify-end gap-2 md:gap-3">
          {/* Mobile: search icon with other actions */}
          <Button
            variant="ghost"
            size="icon"
            className="size-10 touch-manipulation md:hidden md:size-7"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          {/* Theme Toggle - Hidden on mobile */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Notifications Bell */}
          {currentUser && (
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount && unreadCount.count > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount.count > 99 ? "99+" : unreadCount.count}
                </Badge>
              )}
            </Button>
          )}

          {/* User Profile - Desktop Dropdown, Mobile Avatar Only */}
          {currentUser && (
            <>
              {/* Desktop: Dropdown Menu — at far right (parent uses justify-end) */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 h-auto py-2 px-3 border-2"
                    >
                      <Avatar className="h-8 w-8">
                        {profilePhotoUrl ? (
                          <AvatarImage 
                            src={profilePhotoUrl} 
                            alt={currentUser.name}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(currentUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium leading-none">
                            {currentUser.preferredName || currentUser.name}
                          </span>
                          <Badge 
                            variant={getRoleBadgeVariant(currentUser.role)} 
                            className={`text-xs h-4 px-1.5 ${getRoleBadgeClassName(currentUser.role)}`}
                          >
                            {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {currentUser.email}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none">
                            {currentUser.name}
                          </p>
                          <Badge 
                            variant={getRoleBadgeVariant(currentUser.role)} 
                            className={`text-xs h-4 px-1.5 ${getRoleBadgeClassName(currentUser.role)}`}
                          >
                            {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-xs leading-none text-muted-foreground">
                          {currentUser.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    {currentUser.role === "admin" && (
                      <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogoutClick} variant="destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile: Avatar Only - Click to go to profile */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden border-4"
                onClick={() => router.push("/dashboard/profile")}
              >
                <Avatar className="h-8 w-8">
                  {profilePhotoUrl ? (
                    <AvatarImage 
                      src={profilePhotoUrl} 
                      alt={currentUser.name}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Notifications Drawer */}
      {currentUser && (
        <NotificationsDrawer
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          token={token}
        />
      )}

      {/* Global Search */}
      {currentUser && (
        <GlobalSearch
          open={searchOpen}
          onOpenChange={setSearchOpen}
          token={token}
        />
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>Are you sure you want to logout?</div>
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4 text-center mt-4">
                  <div className="text-sm italic text-blue-900 dark:text-blue-100 leading-relaxed">
                    &quot;The Lord bless thee, and keep thee: The Lord make his face shine upon thee, and be gracious unto thee: The Lord lift up his countenance upon thee, and give thee peace.&quot;
                  </div>
                  <div className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Numbers 6:24-26 (KJV)
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} variant="destructive" disabled={isLoggingOut}>
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Logout"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
