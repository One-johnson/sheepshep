"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { FileText, Filter, X, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

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

// Format action name for display
function formatAction(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get badge variant based on action type
function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("delete") || action.includes("remove")) {
    return "destructive";
  }
  if (action.includes("create") || action.includes("add")) {
    return "default";
  }
  if (action.includes("update") || action.includes("change")) {
    return "secondary";
  }
  return "outline";
}

// Type for audit log entry
type AuditLogEntry = {
  _id: Id<"auditLogs">;
  userId: Id<"users">;
  action: string;
  entityType: string;
  entityId?: string;
  entityCustomId?: string; // Custom ID for members (e.g., MBR-0425)
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  userName: string;
  userEmail: string;
  userRole: string;
};

export default function AuditLogPage() {
  const router = useRouter();
  const { token } = useAuth();

  // Server-side filter state - use "all" instead of empty string for Select components
  const [actionFilter, setActionFilter] = React.useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<string>("all");
  const [startDateFilter, setStartDateFilter] = React.useState<string>("");
  const [endDateFilter, setEndDateFilter] = React.useState<string>("");
  const [limit, setLimit] = React.useState<number>(100);

  // Build query args
  const queryArgs = React.useMemo(() => {
    const args: {
      token: string;
      action?: string;
      entityType?: string;
      startDate?: number;
      endDate?: number;
      limit?: number;
    } = {
      token: token || "",
    };

    if (actionFilter && actionFilter !== "all") args.action = actionFilter;
    if (entityTypeFilter && entityTypeFilter !== "all") args.entityType = entityTypeFilter;
    if (startDateFilter) {
      const startDate = new Date(startDateFilter);
      startDate.setHours(0, 0, 0, 0);
      args.startDate = startDate.getTime();
    }
    if (endDateFilter) {
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999);
      args.endDate = endDate.getTime();
    }
    if (limit) args.limit = limit;

    return args;
  }, [token, actionFilter, entityTypeFilter, startDateFilter, endDateFilter, limit]);

  const auditLogs = useQuery(
    api.auditLogs.list,
    token ? queryArgs : "skip"
  );

  const deleteLog = useMutation(api.auditLogs.deleteLog);
  const bulkDeleteLogs = useMutation(api.auditLogs.bulkDelete);

  const [selectedRows, setSelectedRows] = React.useState<AuditLogEntry[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [logToDelete, setLogToDelete] = React.useState<AuditLogEntry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const isLoading = auditLogs === undefined;
  const hasError = auditLogs === null;

  // Clear all filters
  const clearFilters = () => {
    setActionFilter("all");
    setEntityTypeFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setLimit(50);
  };

  const hasActiveFilters =
    (actionFilter && actionFilter !== "all") ||
    (entityTypeFilter && entityTypeFilter !== "all") ||
    startDateFilter ||
    endDateFilter;

  // Get unique actions and entity types from logs for filter dropdowns
  const uniqueActions = React.useMemo(() => {
    if (!auditLogs?.logs) return [];
    const actions = new Set<string>();
    auditLogs.logs.forEach((log) => actions.add(log.action));
    return Array.from(actions).sort();
  }, [auditLogs]);

  const uniqueEntityTypes = React.useMemo(() => {
    if (!auditLogs?.logs) return [];
    const entityTypes = new Set<string>();
    auditLogs.logs.forEach((log) => entityTypes.add(log.entityType));
    return Array.from(entityTypes).sort();
  }, [auditLogs]);

  // Handle single delete
  const handleDelete = async (log: AuditLogEntry) => {
    if (!token) return;
    
    setIsDeleting(true);
    try {
      await deleteLog({ token, logId: log._id });
      toast.success("Audit log deleted successfully");
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete audit log");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!token || selectedRows.length === 0) return;

    setIsDeleting(true);
    try {
      const logIds = selectedRows.map((row) => row._id);
      const result = await bulkDeleteLogs({ token, logIds });
      toast.success(`Successfully deleted ${result.deleted} audit log(s)`);
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} log(s) could not be deleted`);
      }
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete audit logs");
    } finally {
      setIsDeleting(false);
    }
  };

  // Define columns for DataTable
  const columns = React.useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Timestamp" />
        ),
        cell: ({ row }) => (
          <div className="font-mono text-xs">{formatDate(row.original.createdAt)}</div>
        ),
      },
      {
        accessorKey: "userName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="User" />
        ),
        cell: ({ row }) => {
          const log = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium">{log.userName}</div>
              <div className="text-xs text-muted-foreground">{log.userEmail}</div>
              <Badge variant="outline" className="text-xs">
                {log.userRole}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "action",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Action" />
        ),
        cell: ({ row }) => {
          const action = row.original.action;
          return (
            <Badge variant={getActionBadgeVariant(action)}>
              {formatAction(action)}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "entityType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Entity Type" />
        ),
        cell: ({ row }) => {
          const entityType = row.original.entityType;
          return (
            <Badge variant="outline">
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "details",
        header: "Details",
        cell: ({ row }) => {
          const log = row.original;
          const hasDetails = log.details || log.entityId || log.entityCustomId || log.ipAddress;
          
          if (!hasDetails) {
            return <span className="text-sm text-muted-foreground">-</span>;
          }

          // Truncate details for preview (max 60 characters)
          const truncateLength = 60;
          const detailsPreview = log.details
            ? log.details.length > truncateLength
              ? `${log.details.substring(0, truncateLength)}...`
              : log.details
            : null;

          // Format details content for hover card
          const formatDetails = (details: string) => {
            try {
              // Try to parse as JSON for better formatting
              const parsed = JSON.parse(details);
              return JSON.stringify(parsed, null, 2);
            } catch {
              // If not JSON, return as-is
              return details;
            }
          };

          const fullContent = (
            <div className="space-y-3">
              {log.details && (
                <div>
                  <div className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                    Details
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words font-mono bg-muted/50 p-2 rounded text-xs">
                    {formatDetails(log.details)}
                  </div>
                </div>
              )}
              {(log.entityCustomId || log.entityId) && (
                <div>
                  <div className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
                    {log.entityType === "member" ? "Member ID" : "Entity ID"}
                  </div>
                  <div className="text-xs font-mono break-all">
                    {log.entityCustomId || log.entityId}
                  </div>
                  {log.entityCustomId && log.entityId && log.entityCustomId !== log.entityId && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Convex ID: {log.entityId}
                    </div>
                  )}
                </div>
              )}
              {log.ipAddress && (
                <div>
                  <div className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
                    IP Address
                  </div>
                  <div className="text-xs font-mono">{log.ipAddress}</div>
                </div>
              )}
              {log.userAgent && (
                <div>
                  <div className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
                    User Agent
                  </div>
                  <div className="text-xs break-all">{log.userAgent}</div>
                </div>
              )}
            </div>
          );

          const showHoverCard = log.details && log.details.length > truncateLength;

          return (
            <div className="max-w-[200px]">
              {showHoverCard ? (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="cursor-pointer">
                      <div className="text-sm truncate text-foreground hover:text-primary transition-colors">
                        {detailsPreview}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Hover for full details
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-96 max-h-[400px] overflow-y-auto">
                    {fullContent}
                  </HoverCardContent>
                </HoverCard>
              ) : (
                <div className="text-sm break-words">
                  {detailsPreview || (
                    <>
                      {(log.entityCustomId || log.entityId) && (
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {log.entityType === "member" ? "Member" : "Entity"} ID: {log.entityCustomId || log.entityId}
                        </div>
                      )}
                      {log.ipAddress && !log.entityId && !log.entityCustomId && (
                        <div className="text-xs text-muted-foreground truncate">
                          IP: {log.ipAddress}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const log = row.original;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setLogToDelete(log);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    []
  );

  React.useEffect(() => {
    if (hasError) {
      toast.error("Failed to load audit logs. You may not have permission to view this page.");
    }
  }, [hasError]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="flex-shrink-0 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 md:h-8 md:w-8" />
            Audit Log
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View system activity and user actions (Admin only)
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Filter audit logs by action, entity type, or date range</CardDescription>
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
          <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="action-filter">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {formatAction(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-type-filter">Entity Type</Label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger id="entity-type-filter">
                  <SelectValue placeholder="All entity types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entity types</SelectItem>
                  {uniqueEntityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="limit">Results per page</Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger id="limit" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                {auditLogs
                  ? `Showing ${auditLogs.logs.length} of ${auditLogs.total} logs`
                  : "Loading audit logs..."}
              </CardDescription>
            </div>
            {selectedRows.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRows.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={5} rows={8} showCheckbox={true} />
          ) : hasError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Unable to load audit logs. Please check your permissions.
              </p>
            </div>
          ) : auditLogs.logs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
              {hasActiveFilters && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters to see more results
                </p>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={auditLogs.logs}
              searchKey="details"
              searchPlaceholder="Search by details, user name, or email..."
              enableColumnVisibility={true}
              enablePagination={true}
              enableSorting={true}
              enableFiltering={true}
              enableRowSelection={true}
              onRowSelectionChange={setSelectedRows}
              pageSize={50}
              pageSizeOptions={[25, 50, 100, 200]}
              emptyMessage="No audit logs found"
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {logToDelete ? "Delete Audit Log" : `Delete ${selectedRows.length} Audit Log(s)`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {logToDelete
                ? "Are you sure you want to delete this audit log? This action cannot be undone."
                : `Are you sure you want to delete ${selectedRows.length} audit log(s)? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setLogToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (logToDelete) {
                  handleDelete(logToDelete);
                } else if (selectedRows.length > 0) {
                  handleBulkDelete();
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
