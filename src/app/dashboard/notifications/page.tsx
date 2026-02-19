"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { StatsCardSkeleton } from "@/components/ui/card-skeleton";
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
import { useAuth } from "@/contexts/auth-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  MoreHorizontal,
  Filter,
  X,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Type for notification entry
type NotificationEntry = {
  _id: Id<"notifications">;
  userId: Id<"users">;
  type:
    | "attendance_pending"
    | "attendance_approved"
    | "attendance_rejected"
    | "assignment_assigned"
    | "assignment_completed"
    | "assignment_deleted"
    | "report_submitted"
    | "member_assigned"
    | "member_created"
    | "member_updated"
    | "member_deleted"
    | "user_created"
    | "user_updated"
    | "user_deleted"
    | "profile_updated"
    | "settings_updated"
    | "group_created"
    | "group_updated"
    | "group_deleted"
    | "group_member_added"
    | "group_member_removed"
    | "event_created"
    | "event_updated"
    | "event_deleted"
    | "prayer_request"
    | "prayer_response"
    | "system"
    | "reminder";
  title: string;
  message: string;
  relatedId?: string;
  relatedType?:
    | "attendance"
    | "assignment"
    | "report"
    | "member"
    | "user"
    | "group"
    | "event"
    | "reminder"
    | "prayer_request"
    | "settings";
  isRead: boolean;
  createdAt: number;
};

// Format date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format notification type for display
function formatNotificationType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get notification icon
function getNotificationIcon(type: string) {
  const icons = {
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
  return icons[type as keyof typeof icons] || Info;
}

// Get notification badge variant
function getNotificationBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  if (type.includes("rejected") || type.includes("pending")) {
    return "destructive";
  }
  if (type.includes("approved") || type.includes("completed")) {
    return "default";
  }
  if (type.includes("assigned") || type.includes("request")) {
    return "secondary";
  }
  return "outline";
}

// Get notification color
function getNotificationColor(type: string): string {
  const colors = {
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
  return colors[type as keyof typeof colors] || "text-muted-foreground";
}

export default function NotificationsPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // Build query args
  const queryArgs = React.useMemo(() => {
    const args: {
      token: string;
      isRead?: boolean;
      limit?: number;
    } = {
      token: token || "",
    };

    if (statusFilter === "unread") {
      args.isRead = false;
    } else if (statusFilter === "read") {
      args.isRead = true;
    }

    return args;
  }, [token, statusFilter]);

  const notifications = useQuery(
    api.notifications.list,
    token ? queryArgs : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    token ? { token } : "skip"
  );

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const removeNotification = useMutation(api.notifications.remove);
  const removeAllNotifications = useMutation(api.notifications.removeAll);

  const [selectedRows, setSelectedRows] = React.useState<NotificationEntry[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [notificationToDelete, setNotificationToDelete] = React.useState<NotificationEntry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = React.useState(false);

  const isLoading = notifications === undefined;
  const hasNotifications = notifications && notifications.length > 0;

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!notifications) return { total: 0, unread: 0, read: 0 };
    const unread = notifications.filter((n) => !n.isRead).length;
    const read = notifications.filter((n) => n.isRead).length;
    return {
      total: notifications.length,
      unread,
      read,
    };
  }, [notifications]);

  // Get unique types for filter dropdown
  const uniqueTypes = React.useMemo(() => {
    if (!notifications) return [];
    const types = new Set<string>();
    notifications.forEach((n) => types.add(n.type));
    return Array.from(types).sort();
  }, [notifications]);

  // Clear filters
  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all";

  // Filter notifications by type
  const filteredNotifications = React.useMemo(() => {
    if (!notifications) return [];
    if (typeFilter === "all") return notifications;
    return notifications.filter((n) => n.type === typeFilter);
  }, [notifications, typeFilter]);

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    if (!token) return;
    try {
      await markAsRead({ token, notificationId });
      toast.success("Notification marked as read");
    } catch (error: any) {
      toast.error(error.message || "Failed to mark notification as read");
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (!token) return;
    setIsMarkingAsRead(true);
    try {
      const result = await markAllAsRead({ token });
      toast.success(`Marked ${result.count} notification(s) as read`);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark all as read");
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Handle single delete
  const handleDelete = async (notification: NotificationEntry) => {
    if (!token) return;

    setIsDeleting(true);
    try {
      await removeNotification({ token, notificationId: notification._id });
      toast.success("Notification deleted successfully");
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete notification");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!token || selectedRows.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete notifications one by one
      let deleted = 0;
      let errors = 0;
      for (const notification of selectedRows) {
        try {
          await removeNotification({ token, notificationId: notification._id });
          deleted++;
        } catch (error) {
          errors++;
        }
      }
      toast.success(`Successfully deleted ${deleted} notification(s)`);
      if (errors > 0) {
        toast.warning(`${errors} notification(s) could not be deleted`);
      }
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete notifications");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete all
  const handleDeleteAll = async () => {
    if (!token) return;

    setIsDeleting(true);
    try {
      const result = await removeAllNotifications({ token });
      toast.success(`Successfully deleted ${result.count} notification(s)`);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete all notifications");
    } finally {
      setIsDeleting(false);
    }
  };

  // Define columns for DataTable
  const columns = React.useMemo<ColumnDef<NotificationEntry>[]>(
    () => [
      {
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const notification = row.original;
          const Icon = getNotificationIcon(notification.type);
          const iconColor = getNotificationColor(notification.type);
          return (
            <div className="flex items-center gap-2">
              <div className={cn("rounded-full bg-muted p-1.5", iconColor)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <Badge variant={getNotificationBadgeVariant(notification.type)}>
                {formatNotificationType(notification.type)}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => {
          const notification = row.original;
          return (
            <div className="space-y-1">
              <div className={cn("font-medium", !notification.isRead && "font-semibold")}>
                {notification.title}
              </div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {notification.message}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "isRead",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const isRead = row.original.isRead;
          return (
            <Badge variant={isRead ? "outline" : "default"}>
              {isRead ? "Read" : "Unread"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => {
          const notification = row.original;
          return (
            <div className="space-y-1">
              <div className="text-sm">{formatDate(notification.createdAt)}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const notification = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!notification.isRead && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification._id);
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotificationToDelete(notification);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="flex-shrink-0 md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <motion.div
              animate={
                stats.unread > 0
                  ? {
                      scale: [1, 1.15, 1],
                      rotate: [0, -5, 5, -5, 5, 0],
                    }
                  : {}
              }
              transition={{
                duration: 0.6,
                repeat: stats.unread > 0 ? Infinity : 0,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <Bell className="h-8 w-8" />
              {stats.unread > 0 && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1.5],
                    opacity: [0.5, 0, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  style={{
                    background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
                  }}
                />
              )}
            </motion.div>
            Notifications
          </h1>
          <p className="text-muted-foreground">
            View and manage your notifications
          </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats.unread > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAsRead}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
          {hasNotifications && (
            <Button
              variant="destructive"
              onClick={() => {
                setNotificationToDelete(null);
                setDeleteDialogOpen(true);
              }}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete all
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <StatsCardSkeleton count={3} />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">All notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.unread}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Read</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.read}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Already viewed</p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Filters Card */}
      {(hasActiveFilters || uniqueTypes.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>Filter notifications by status or type</CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatNotificationType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading notifications..."
                  : filteredNotifications.length === 0
                  ? "No notifications found"
                  : `Showing ${filteredNotifications.length} notification${filteredNotifications.length === 1 ? "" : "s"}`}
              </CardDescription>
            </div>
            {selectedRows.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRows.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={4} rows={8} showCheckbox={true} />
          ) : !hasNotifications ? (
            <div className="text-center py-16">
              <div className="rounded-full bg-muted p-6 mb-4 inline-block">
                <Bell className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                You&apos;re all caught up! When you have new notifications, they&apos;ll appear here.
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications match your filters</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredNotifications}
              searchKey="title"
              searchPlaceholder="Search by title or message..."
              enableColumnVisibility={true}
              enablePagination={true}
              enableSorting={true}
              enableFiltering={true}
              enableRowSelection={true}
              onRowSelectionChange={setSelectedRows}
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyMessage="No notifications found"
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {notificationToDelete
                ? "Delete Notification"
                : selectedRows.length > 0
                ? `Delete ${selectedRows.length} Notification(s)`
                : "Delete All Notifications"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {notificationToDelete
                ? "Are you sure you want to delete this notification? This action cannot be undone."
                : selectedRows.length > 0
                ? `Are you sure you want to delete ${selectedRows.length} notification(s)? This action cannot be undone.`
                : "Are you sure you want to delete all notifications? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setNotificationToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (notificationToDelete) {
                  handleDelete(notificationToDelete);
                } else if (selectedRows.length > 0) {
                  handleBulkDelete();
                } else {
                  handleDeleteAll();
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
