"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { StatsCardSkeleton } from "@/components/ui/card-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Users,
  UserCog,
  UserCheck,
  Shield,
  UserPlus,
  Download,
  Upload,
  FileText,
  Trash2,
  FileDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  UserRoundCog,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { AddPastorDialog } from "@/components/dashboard/add-pastor-dialog";
import { AddShepherdDialog } from "@/components/dashboard/add-shepherd-dialog";
import { EditPastorDialog } from "@/components/dashboard/edit-pastor-dialog";
import { EditShepherdDialog } from "@/components/dashboard/edit-shepherd-dialog";
import { ViewUserDialog } from "@/components/dashboard/view-user-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";

// Type for user entry
type UserEntry = {
  _id: Id<"users">;
  email: string;
  name: string;
  role: "admin" | "pastor" | "shepherd";
  isActive: boolean;
  phone?: string;
  whatsappNumber?: string;
  preferredName?: string;
  gender?: "male" | "female";
  dateOfBirth?: number;
  ordinationDate?: number;
  homeAddress?: string;
  qualification?: string;
  yearsInMinistry?: number;
  ministryFocus?: string[];
  notes?: string;
  commissioningDate?: number;
  occupation?: string;
  educationalBackground?: string;
  status?: "active" | "on_leave" | "inactive";
  overseerId?: Id<"users">;
  profilePhotoId?: Id<"_storage">;
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  weddingAnniversaryDate?: number;
  spouseName?: string;
  spouseOccupation?: string;
  childrenCount?: number;
  createdAt: number;
  updatedAt: number;
};

// Format date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get role badge variant
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
    default:
      return "";
  }
}

// Component to display user photo
function UserPhotoCell({
  userId,
  photoId,
  userName,
  token,
}: {
  userId: Id<"users">;
  photoId?: Id<"_storage">;
  userName: string;
  token: string | null;
}) {
  const photoUrl = useQuery(
    api.storage.getFileUrl,
    token && photoId ? { token, storageId: photoId } : "skip"
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Avatar className="h-10 w-10">
      {photoUrl ? (
        <AvatarImage src={photoUrl} alt="Profile" />
      ) : (
        <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
      )}
    </Avatar>
  );
}

export default function UsersPage() {
  const { token } = useAuth();

  const users = useQuery(api.authUsers.list, token ? { token } : "skip");
  const stats = useQuery(api.authUsers.getStats, token ? { token } : "skip");
  const deleteUser = useMutation(api.authUsers.deleteUser);
  const bulkDeleteUsers = useMutation(api.authUsers.bulkDelete);
  const updateUserProfile = useMutation(api.auth.updateUserProfile);
  const resetPassword = useMutation(api.auth.resetPassword);

  const [selectedRows, setSelectedRows] = React.useState<UserEntry[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserEntry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [addPastorDialogOpen, setAddPastorDialogOpen] = React.useState(false);
  const [addShepherdDialogOpen, setAddShepherdDialogOpen] = React.useState(false);
  const [editPastorDialogOpen, setEditPastorDialogOpen] = React.useState(false);
  const [editShepherdDialogOpen, setEditShepherdDialogOpen] = React.useState(false);
  const [viewUserDialogOpen, setViewUserDialogOpen] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<UserEntry | null>(null);
  const [userToView, setUserToView] = React.useState<UserEntry | null>(null);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = React.useState(false);
  const [userToChangeRole, setUserToChangeRole] = React.useState<UserEntry | null>(null);
  const [newRole, setNewRole] = React.useState<"admin" | "pastor" | "shepherd" | "">("");
  const [isChangingRole, setIsChangingRole] = React.useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = React.useState(false);
  const [userToResetPassword, setUserToResetPassword] = React.useState<UserEntry | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const isLoading = users === undefined || stats === undefined;

  // Handle single delete
  const handleDelete = async (user: UserEntry) => {
    if (!token) return;

    setIsDeleting(true);
    try {
      await deleteUser({ token, userId: user._id });
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle role change
  const handleRoleChange = async () => {
    if (!token || !userToChangeRole || !newRole) return;

    setIsChangingRole(true);
    try {
      await updateUserProfile({
        token,
        userId: userToChangeRole._id,
        role: newRole as "admin" | "pastor" | "shepherd",
      });
      toast.success(`User role changed to ${newRole} successfully`);
      setChangeRoleDialogOpen(false);
      setUserToChangeRole(null);
      setNewRole("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change user role");
    } finally {
      setIsChangingRole(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!token || !userToResetPassword || !newPassword) return;

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsResettingPassword(true);
    try {
      await resetPassword({
        token,
        userId: userToResetPassword._id,
        newPassword,
      });
      toast.success(`Password reset successfully for ${userToResetPassword.name}`);
      setResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!token || selectedRows.length === 0) return;

    setIsDeleting(true);
    try {
      const userIds = selectedRows.map((row) => row._id);
      const result = await bulkDeleteUsers({ token, userIds });
      toast.success(`Successfully deleted ${result.deleted} user(s)`);
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} user(s) could not be deleted`);
      }
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete users");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to CSV (supports individual or bulk export)
  const handleExportCSV = (usersToExport?: UserEntry[]) => {
    const exportUsers = usersToExport || users || [];
    
    if (exportUsers.length === 0) {
      toast.error("No users to export");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Role",
      "Phone",
      "WhatsApp",
      "Preferred Name",
      "Gender",
      "Date of Birth",
      "Marital Status",
      "Wedding Anniversary",
      "Spouse Name",
      "Spouse Occupation",
      "Children Count",
      "Home Address",
      "Qualification",
      "Years in Ministry",
      "Occupation",
      "Educational Background",
      "Status",
      "Active",
      "Created At",
    ];

    const rows = exportUsers.map((user) => [
      user.name || "",
      user.email || "",
      user.role || "",
      user.phone || "",
      user.whatsappNumber || "",
      user.preferredName || "",
      user.gender || "",
      user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "",
      user.maritalStatus || "",
      user.weddingAnniversaryDate ? new Date(user.weddingAnniversaryDate).toLocaleDateString() : "",
      user.spouseName || "",
      user.spouseOccupation || "",
      user.childrenCount !== undefined ? user.childrenCount.toString() : "",
      user.homeAddress || "",
      user.qualification || "",
      user.yearsInMinistry !== undefined ? user.yearsInMinistry.toString() : "",
      user.occupation || "",
      user.educationalBackground || "",
      user.status || "",
      user.isActive ? "Yes" : "No",
      user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = usersToExport && usersToExport.length === 1
      ? `user_${exportUsers[0].name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
      : `users_${exportUsers.length}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${exportUsers.length} user(s) exported to CSV`);
  };

  // Export to PDF (supports individual or bulk export)
  const handleExportPDF = async (usersToExport?: UserEntry[]) => {
    const exportUsers = usersToExport || users || [];
    
    if (exportUsers.length === 0) {
      toast.error("No users to export");
      return;
    }

    // For PDF, we'll use a simple approach with window.print or a library
    // For now, we'll create a printable HTML table
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to export PDF");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Users Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            @media print { @page { margin: 1cm; } }
          </style>
        </head>
        <body>
          <h1>Users Export</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Users: ${exportUsers.length}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Marital Status</th>
                <th>Spouse Name</th>
                <th>Children</th>
                <th>Status</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              ${exportUsers
                .map(
                  (user) => `
                <tr>
                  <td>${user.name || ""}</td>
                  <td>${user.email || ""}</td>
                  <td>${user.role || ""}</td>
                  <td>${user.phone || ""}</td>
                  <td>${user.gender || ""}</td>
                  <td>${user.maritalStatus || ""}</td>
                  <td>${user.spouseName || ""}</td>
                  <td>${user.childrenCount !== undefined ? user.childrenCount : ""}</td>
                  <td>${user.status || ""}</td>
                  <td>${user.isActive ? "Yes" : "No"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();

    toast.success(`Opening PDF preview for ${exportUsers.length} user(s)`);
  };

  // Helper to get photo URL for a user
  const getUserPhotoUrl = (user: UserEntry) => {
    if (!user.profilePhotoId || !token) return null;
    // We'll use a query hook for each user, but for now return null
    // The actual URL fetching will be done in the cell component
    return null;
  };

  // Define columns for DataTable
  const columns = React.useMemo<ColumnDef<UserEntry>[]>(
    () => [
      {
        accessorKey: "photo",
        header: "Photo",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <UserPhotoCell
              userId={user._id}
              photoId={user.profilePhotoId}
              userName={user.name}
              token={token}
            />
          );
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium">{user.name}</div>
              {user.preferredName && (
                <div className="text-xs text-muted-foreground">
                  ({user.preferredName})
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <div className="text-sm">{row.original.email}</div>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <Badge 
              variant={getRoleBadgeVariant(role)}
              className={getRoleBadgeClassName(role)}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "phone",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => (
          <div className="text-sm">{row.original.phone || "-"}</div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = row.original.status;
          const isActive = row.original.isActive;
          return (
            <div className="space-y-1">
              {status && (
                <Badge variant="outline" className="text-xs">
                  {status.replace("_", " ")}
                </Badge>
              )}
              {!isActive && (
                <Badge variant="destructive" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "maritalStatus",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Marital Status" />,
        cell: ({ row }) => {
          const user = row.original;
          if (!user.maritalStatus) return <div className="text-sm text-muted-foreground">-</div>;
          return (
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                {user.maritalStatus.charAt(0).toUpperCase() + user.maritalStatus.slice(1)}
              </Badge>
              {user.maritalStatus === "married" && (
                <div className="text-xs text-muted-foreground">
                  {user.spouseName && <div>Spouse: {user.spouseName}</div>}
                  {user.childrenCount !== undefined && user.childrenCount > 0 && (
                    <div>{user.childrenCount} child{user.childrenCount !== 1 ? "ren" : ""}</div>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original;
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserToView(user);
                    setViewUserDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserToEdit(user);
                    if (user.role === "pastor") {
                      setEditPastorDialogOpen(true);
                    } else if (user.role === "shepherd") {
                      setEditShepherdDialogOpen(true);
                    }
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserToChangeRole(user);
                    setNewRole(user.role);
                    setChangeRoleDialogOpen(true);
                  }}
                >
                  <UserRoundCog className="mr-2 h-4 w-4" />
                  Change Role
                </DropdownMenuItem>
                {(user.role === "shepherd" || user.role === "pastor") && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToResetPassword(user);
                      setResetPasswordDialogOpen(true);
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportCSV([user]);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportPDF([user]);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserToDelete(user);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Users
          </h1>
          <p className="text-muted-foreground">
            Manage all users, pastors, and shepherds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExportCSV()}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExportPDF()}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCardSkeleton count={5} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">All system users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAdmins ?? 0}</div>
            <p className="text-xs text-muted-foreground">Administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pastors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPastors ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active pastors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shepherds</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalShepherds ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active shepherds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers ?? 0}</div>
            <p className="text-xs text-muted-foreground">Church members</p>
          </CardContent>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {users ? `Showing ${users.length} users` : "Loading users..."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportCSV(selectedRows);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV ({selectedRows.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportPDF(selectedRows);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF ({selectedRows.length})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedRows.length})
                </Button>
              </>
            )}
              <Button onClick={() => setAddShepherdDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Shepherd
              </Button>
              <Button onClick={() => setAddPastorDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Pastor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={6} rows={8} showCheckbox={true} />
          ) : users && users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={users || []}
              searchKey="email"
              searchPlaceholder="Search by name or email..."
              enableColumnVisibility={true}
              enablePagination={true}
              enableSorting={true}
              enableFiltering={true}
              enableRowSelection={true}
              onRowSelectionChange={setSelectedRows}
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyMessage="No users found"
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToDelete ? "Delete User" : `Delete ${selectedRows.length} User(s)`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete
                ? `Are you sure you want to delete ${userToDelete.name}? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedRows.length} user(s)? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDelete) {
                  handleDelete(userToDelete);
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

      {/* Add Dialogs */}
      <AddShepherdDialog
        open={addShepherdDialogOpen}
        onOpenChange={setAddShepherdDialogOpen}
      />
      <AddPastorDialog
        open={addPastorDialogOpen}
        onOpenChange={setAddPastorDialogOpen}
      />

      {/* Edit Dialogs */}
      {userToEdit && userToEdit.role === "pastor" && (
        <EditPastorDialog
          open={editPastorDialogOpen}
          onOpenChange={(open: boolean) => {
            setEditPastorDialogOpen(open);
            if (!open) setUserToEdit(null);
          }}
          user={userToEdit}
        />
      )}
      {userToEdit && userToEdit.role === "shepherd" && (
        <EditShepherdDialog
          open={editShepherdDialogOpen}
          onOpenChange={(open: boolean) => {
            setEditShepherdDialogOpen(open);
            if (!open) setUserToEdit(null);
          }}
          user={userToEdit}
        />
      )}

      {/* View Dialog */}
      {userToView && (
        <ViewUserDialog
          open={viewUserDialogOpen}
          onOpenChange={(open: boolean) => {
            setViewUserDialogOpen(open);
            if (!open) setUserToView(null);
          }}
          user={userToView}
        />
      )}

      {/* Change Role Dialog */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {userToChangeRole?.name} ({userToChangeRole?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-role">Current Role</Label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getRoleBadgeVariant(userToChangeRole?.role || "")}
                  className={getRoleBadgeClassName(userToChangeRole?.role || "")}
                >
                  {userToChangeRole?.role
                    ? userToChangeRole.role.charAt(0).toUpperCase() + userToChangeRole.role.slice(1)
                    : ""}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">New Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as any)}>
                <SelectTrigger id="new-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="shepherd">Shepherd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userToChangeRole?.role === newRole && (
              <p className="text-sm text-muted-foreground">
                The selected role is the same as the current role.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setChangeRoleDialogOpen(false);
                setUserToChangeRole(null);
                setNewRole("");
              }}
              disabled={isChangingRole}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={isChangingRole || !newRole || userToChangeRole?.role === newRole}
            >
              {isChangingRole ? "Changing..." : "Change Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialogOpen}
        onOpenChange={(open) => {
          setResetPasswordDialogOpen(open);
          if (!open) {
            setUserToResetPassword(null);
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {userToResetPassword?.name} ({userToResetPassword?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  disabled={isResettingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isResettingPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-sm text-destructive">
                  Password must be at least 8 characters
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isResettingPassword}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> The user will need to use this new password to log in. Make sure to communicate the new password securely.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setUserToResetPassword(null);
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={isResettingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={
                isResettingPassword ||
                !newPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
            >
              {isResettingPassword ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
