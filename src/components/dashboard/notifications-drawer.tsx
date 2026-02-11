"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Info, ArrowRight, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
}

const notificationIcons = {
  attendance_pending: Clock,
  attendance_approved: CheckCircle2,
  attendance_rejected: XCircle,
  assignment_assigned: AlertCircle,
  assignment_completed: CheckCircle2,
  assignment_deleted: XCircle,
  report_submitted: Info,
  member_assigned: AlertCircle,
  member_created: CheckCircle2,
  member_updated: Info,
  member_deleted: XCircle,
  user_created: CheckCircle2,
  user_updated: Info,
  user_deleted: XCircle,
  profile_updated: Info,
  settings_updated: Settings,
  group_created: CheckCircle2,
  group_updated: Info,
  group_deleted: XCircle,
  group_member_added: CheckCircle2,
  group_member_removed: XCircle,
  event_created: CheckCircle2,
  event_updated: Info,
  event_deleted: XCircle,
  prayer_request: AlertCircle,
  prayer_response: Info,
  system: Info,
  reminder: Clock,
};

const notificationColors = {
  attendance_pending: "text-yellow-600 dark:text-yellow-400",
  attendance_approved: "text-green-600 dark:text-green-400",
  attendance_rejected: "text-red-600 dark:text-red-400",
  assignment_assigned: "text-blue-600 dark:text-blue-400",
  assignment_completed: "text-green-600 dark:text-green-400",
  assignment_deleted: "text-red-600 dark:text-red-400",
  report_submitted: "text-purple-600 dark:text-purple-400",
  member_assigned: "text-blue-600 dark:text-blue-400",
  member_created: "text-green-600 dark:text-green-400",
  member_updated: "text-blue-600 dark:text-blue-400",
  member_deleted: "text-red-600 dark:text-red-400",
  user_created: "text-green-600 dark:text-green-400",
  user_updated: "text-blue-600 dark:text-blue-400",
  user_deleted: "text-red-600 dark:text-red-400",
  profile_updated: "text-blue-600 dark:text-blue-400",
  settings_updated: "text-purple-600 dark:text-purple-400",
  group_created: "text-green-600 dark:text-green-400",
  group_updated: "text-blue-600 dark:text-blue-400",
  group_deleted: "text-red-600 dark:text-red-400",
  group_member_added: "text-green-600 dark:text-green-400",
  group_member_removed: "text-red-600 dark:text-red-400",
  event_created: "text-green-600 dark:text-green-400",
  event_updated: "text-blue-600 dark:text-blue-400",
  event_deleted: "text-red-600 dark:text-red-400",
  prayer_request: "text-orange-600 dark:text-orange-400",
  prayer_response: "text-green-600 dark:text-green-400",
  system: "text-gray-600 dark:text-gray-400",
  reminder: "text-blue-600 dark:text-blue-400",
};

export function NotificationsDrawer({ open, onOpenChange, token }: NotificationsDrawerProps) {
  const notifications = useQuery(
    api.notifications.list,
    token ? { token } : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    token ? { token } : "skip"
  );

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const removeNotification = useMutation(api.notifications.remove);

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    if (!token) return;
    try {
      await markAsRead({ token, notificationId });
    } catch (error: any) {
      toast.error(error.message || "Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await markAllAsRead({ token });
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error(error.message || "Failed to mark all as read");
    }
  };

  const handleDelete = async (notificationId: Id<"notifications">) => {
    if (!token) return;
    try {
      await removeNotification({ token, notificationId });
      toast.success("Notification deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete notification");
    }
  };

  const hasUnread = (unreadCount?.count ?? 0) > 0;
  const hasNotifications = notifications && notifications.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl">Notifications</SheetTitle>
              <SheetDescription>
                {hasUnread
                  ? `${unreadCount?.count} unread notification${unreadCount?.count === 1 ? "" : "s"}`
                  : "All caught up!"}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="gap-2"
              >
                <Link href="/dashboard/notifications">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {hasUnread && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all as read
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {!hasNotifications ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Bell className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                You&apos;re all caught up! When you have new notifications, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="py-4 space-y-2">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Info;
                const iconColor = notificationColors[notification.type] || "text-muted-foreground";
                const isUnread = !notification.isRead;

                return (
                  <div
                    key={notification._id}
                    className={cn(
                      "group relative flex items-start gap-4 rounded-lg border p-4 transition-colors",
                      isUnread
                        ? "bg-primary/5 border-primary/20"
                        : "bg-background border-border hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("mt-1 rounded-full bg-muted p-2", iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn("font-medium", isUnread && "font-semibold")}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleMarkAsRead(notification._id)}
                          title="Mark as read"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(notification._id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
