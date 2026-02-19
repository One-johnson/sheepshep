"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ConvexReactClient } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { StatsCardSkeleton, ChartCardSkeleton } from "@/components/ui/card-skeleton";
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
  UserPlus,
  Trash2,
  MoreHorizontal,
  Eye,
  Pencil,
  Download,
  FileText,
  Filter,
  X,
  Sparkles,
  Clock,
  CheckCircle,
  UserCheck,
  UserX,
  UserCog,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { AddMemberDialog } from "@/components/dashboard/add-member-dialog";
import { EditMemberDialog } from "@/components/dashboard/edit-member-dialog";
import { ViewMemberDialog } from "@/components/dashboard/view-member-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Type for member entry
type MemberEntry = {
  _id: Id<"members">;
  firstName: string;
  lastName: string;
  preferredName?: string;
  customId?: string;
  gender: "male" | "female" | "other";
  dateOfBirth?: number;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  nearestLandmark?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateJoinedChurch?: number;
  baptismDate?: number;
  occupation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePhotoId?: Id<"_storage">;
  notes?: string;
  status?: "new_convert" | "first_timer" | "established" | "visitor" | "inactive";
  shepherdId: Id<"users">;
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  weddingAnniversaryDate?: number;
  spouseName?: string;
  childrenCount?: number;
  isActive: boolean;
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

// Get status badge variant
function getStatusBadgeVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "new_convert":
      return "default";
    case "first_timer":
      return "secondary";
    case "established":
      return "outline";
    case "visitor":
      return "outline";
    case "inactive":
      return "destructive";
    default:
      return "outline";
  }
}

function formatStatus(status?: string): string {
  if (!status) return "N/A";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Component to display member photo
function MemberPhotoCell({
  memberId,
  photoId,
  firstName,
  lastName,
  token,
}: {
  memberId: Id<"members">;
  photoId?: Id<"_storage">;
  firstName: string;
  lastName: string;
  token: string | null;
}) {
  const photoUrl = useQuery(
    api.storage.getFileUrl,
    token && photoId ? { token, storageId: photoId } : "skip"
  );

  const getInitials = (first: string, last: string) => {
    return `${first[0]}${last[0]}`.toUpperCase();
  };

  return (
    <Avatar className="h-8 w-8">
      {photoUrl ? (
        <AvatarImage src={photoUrl} alt={`${firstName} ${lastName}`} />
      ) : (
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {getInitials(firstName, lastName)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export default function MembersPage() {
  const [isClient, setIsClient] = React.useState(false);
  const { token } = useAuth();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const [selectedShepherd, setSelectedShepherd] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const [selectedRows, setSelectedRows] = React.useState<MemberEntry[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [memberToDelete, setMemberToDelete] = React.useState<MemberEntry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = React.useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = React.useState(false);
  const [viewMemberDialogOpen, setViewMemberDialogOpen] = React.useState(false);
  const [memberToEdit, setMemberToEdit] = React.useState<MemberEntry | null>(null);
  const [memberToView, setMemberToView] = React.useState<MemberEntry | null>(null);
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = React.useState(false);
  const [memberToChangeStatus, setMemberToChangeStatus] = React.useState<MemberEntry | null>(null);
  const [newStatus, setNewStatus] = React.useState<"new_convert" | "first_timer" | "established" | "visitor" | "inactive" | "">("");
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);
  const [bulkChangeStatusDialogOpen, setBulkChangeStatusDialogOpen] = React.useState(false);
  const [bulkNewStatus, setBulkNewStatus] = React.useState<"new_convert" | "first_timer" | "established" | "visitor" | "inactive" | "">("");
  const [isBulkChangingStatus, setIsBulkChangingStatus] = React.useState(false);

  // Get current user for role checking
  const currentUser = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");
  const router = useRouter();
  const isAdmin = currentUser?.role === "admin";
  const isPastor = currentUser?.role === "pastor";
  const isShepherd = currentUser?.role === "shepherd";

  // Fetch data
  const allMembers = useQuery(api.members.list, token ? { token } : "skip");
  const stats = useQuery(api.members.getStats, token ? { token } : "skip");
  const shepherds = useQuery(api.attendance.getShepherds, token ? { token } : "skip");
  const deleteMember = useMutation(api.members.remove);
  const bulkDeleteMembers = useMutation(api.members.bulkDelete);
  const updateMember = useMutation(api.members.update);
  const bulkUpdateStatus = useMutation(api.members.bulkUpdateStatus);

  // Update memberToEdit when member data changes
  React.useEffect(() => {
    if (memberToEdit && allMembers) {
      const updatedMember = allMembers.find((m) => m._id === memberToEdit._id);
      if (updatedMember) {
        setMemberToEdit(updatedMember);
      }
    }
  }, [allMembers, memberToEdit?._id]);

  // Filter members based on selected filters
  const filteredMembers = React.useMemo(() => {
    if (!allMembers) return [];

    let filtered = [...allMembers];

    // Filter by shepherd
    if (selectedShepherd !== "all") {
      filtered = filtered.filter((m) => m.shepherdId === selectedShepherd);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((m) => m.status === selectedStatus);
    }

    // Filter by year joined
    if (selectedYear !== "all") {
      const year = parseInt(selectedYear, 10);
      filtered = filtered.filter((m) => {
        if (!m.dateJoinedChurch) return false;
        return new Date(m.dateJoinedChurch).getFullYear() === year;
      });
    }

    return filtered;
  }, [allMembers, selectedShepherd, selectedStatus, selectedYear]);

  // Get available years from members
  const availableYears = React.useMemo(() => {
    if (!allMembers) return [];
    const years = new Set<number>();
    allMembers.forEach((m) => {
      if (m.dateJoinedChurch) {
        years.add(new Date(m.dateJoinedChurch).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allMembers]);

  const isLoading = allMembers === undefined || stats === undefined || shepherds === undefined;

  // Handle delete
  const handleDelete = async () => {
    if (!token || !memberToDelete) return;

    setIsDeleting(true);
    try {
      await deleteMember({ token, memberId: memberToDelete._id });
      toast.success("Member deleted successfully");
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete member");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!token || selectedRows.length === 0) return;

    setIsDeleting(true);
    try {
      const memberIds = selectedRows.map((row) => row._id);
      const result = await bulkDeleteMembers({ token, memberIds });
      toast.success(`Successfully deleted ${result.deleted} member(s)`);
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} member(s) could not be deleted`);
      }
      setSelectedRows([]);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete members");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle single status change
  const handleStatusChange = async () => {
    if (!token || !memberToChangeStatus || !newStatus) return;

    setIsChangingStatus(true);
    try {
      await updateMember({
        token,
        memberId: memberToChangeStatus._id,
        status: newStatus,
      });
      toast.success(`Member status changed to ${formatStatus(newStatus)}`);
      setChangeStatusDialogOpen(false);
      setMemberToChangeStatus(null);
      setNewStatus("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change member status");
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Handle bulk status change
  const handleBulkStatusChange = async () => {
    if (!token || selectedRows.length === 0 || !bulkNewStatus) return;

    setIsBulkChangingStatus(true);
    try {
      const memberIds = selectedRows.map((row) => row._id);
      const result = await bulkUpdateStatus({ token, memberIds, status: bulkNewStatus });
      toast.success(`Successfully updated ${result.updated} member(s) status to ${formatStatus(bulkNewStatus)}`);
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} member(s) could not be updated`);
      }
      setSelectedRows([]);
      setBulkChangeStatusDialogOpen(false);
      setBulkNewStatus("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change member statuses");
    } finally {
      setIsBulkChangingStatus(false);
    }
  };

  // Export to CSV
  const handleExportCSV = (membersToExport?: MemberEntry[]) => {
    const exportMembers = membersToExport || filteredMembers || [];
    
    if (exportMembers.length === 0) {
      toast.error("No members to export");
      return;
    }

    const headers = [
      "Custom ID",
      "First Name",
      "Last Name",
      "Preferred Name",
      "Gender",
      "Date of Birth",
      "Phone",
      "WhatsApp",
      "Email",
      "Address",
      "City",
      "State",
      "Country",
      "Date Joined Church",
      "Baptism Date",
      "Status",
      "Marital Status",
      "Spouse Name",
      "Children Count",
      "Occupation",
      "Emergency Contact",
      "Emergency Contact Phone",
      "Created At",
    ];

    const rows = exportMembers.map((member) => [
      member.customId || "",
      member.firstName || "",
      member.lastName || "",
      member.preferredName || "",
      member.gender || "",
      member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "",
      member.phone || "",
      member.whatsappNumber || "",
      member.email || "",
      member.address || "",
      member.city || "",
      member.state || "",
      member.country || "",
      member.dateJoinedChurch ? new Date(member.dateJoinedChurch).toLocaleDateString() : "",
      member.baptismDate ? new Date(member.baptismDate).toLocaleDateString() : "",
      member.status ? formatStatus(member.status) : "",
      member.maritalStatus || "",
      member.spouseName || "",
      member.childrenCount !== undefined ? member.childrenCount.toString() : "",
      member.occupation || "",
      member.emergencyContactName || "",
      member.emergencyContactPhone || "",
      member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = membersToExport && membersToExport.length === 1
      ? `member_${exportMembers[0].firstName}_${exportMembers[0].lastName}_${new Date().toISOString().split("T")[0]}.csv`
      : `members_${exportMembers.length}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${exportMembers.length} member(s) exported to CSV`);
  };

  // Helper function to convert image URL to base64
  const imageUrlToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to convert image to base64"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return null;
    }
  };

  // Helper function to get initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  // Export to PDF (supports individual or bulk export)
  const handleExportPDF = async (membersToExport?: MemberEntry[]) => {
    const exportMembers = membersToExport || filteredMembers || [];
    
    if (exportMembers.length === 0) {
      toast.error("No members to export");
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading("Preparing PDF with photos...");

    try {
      // Fetch photo URLs and convert to base64
      const memberPhotos: Record<string, string> = {};
      
      if (token) {
        // Create Convex client for fetching photo URLs
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          const convexClient = new ConvexReactClient(convexUrl);
          
          await Promise.all(
            exportMembers.map(async (member) => {
              if (member.profilePhotoId) {
                try {
                  // Get photo URL using Convex client
                  const photoUrl = await convexClient.query(api.storage.getFileUrl, {
                    token,
                    storageId: member.profilePhotoId,
                  });

                  if (photoUrl) {
                    // Convert to base64 for embedding
                    const base64 = await imageUrlToBase64(photoUrl);
                    if (base64) {
                      memberPhotos[member._id] = base64;
                    }
                  }
                } catch (error) {
                  console.error(`Failed to load photo for ${member.firstName} ${member.lastName}:`, error);
                }
              }
            })
          );
        }
      }

      // Create a printable HTML table
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.dismiss(loadingToast);
        toast.error("Please allow popups to export PDF");
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Members Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { margin-bottom: 10px; }
              p { color: #666; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9px; }
              th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: middle; }
              th { background-color: #f2f2f2; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .photo-cell { width: 50px; text-align: center; }
              .photo-cell img { width: 40px; height: 40px; object-fit: cover; border-radius: 50%; border: 2px solid #ddd; }
              .photo-cell .initials { width: 40px; height: 40px; border-radius: 50%; background-color: #3b82f6; color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
              @media print { 
                @page { margin: 1cm; size: landscape; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>Members Export</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Members: ${exportMembers.length}</p>
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Preferred Name</th>
                  <th>Gender</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Date Joined</th>
                  <th>Marital Status</th>
                  <th>Spouse Name</th>
                  <th>Children</th>
                  <th>Occupation</th>
                </tr>
              </thead>
              <tbody>
                ${exportMembers
                  .map(
                    (member) => {
                      const photoBase64 = memberPhotos[member._id];
                      const photoHtml = photoBase64
                        ? `<img src="${photoBase64}" alt="${member.firstName} ${member.lastName}" />`
                        : `<div class="initials">${getInitials(member.firstName, member.lastName)}</div>`;
                      
                      return `
                    <tr>
                      <td class="photo-cell">${photoHtml}</td>
                      <td>${member.customId || "N/A"}</td>
                      <td>${member.firstName || ""}</td>
                      <td>${member.lastName || ""}</td>
                      <td>${member.preferredName || ""}</td>
                      <td>${member.gender || ""}</td>
                      <td>${member.phone || ""}</td>
                      <td>${member.email || ""}</td>
                      <td>${member.status ? formatStatus(member.status) : "N/A"}</td>
                      <td>${member.dateJoinedChurch ? new Date(member.dateJoinedChurch).toLocaleDateString() : "N/A"}</td>
                      <td>${member.maritalStatus || ""}</td>
                      <td>${member.spouseName || ""}</td>
                      <td>${member.childrenCount !== undefined ? member.childrenCount : ""}</td>
                      <td>${member.occupation || ""}</td>
                    </tr>
                  `;
                    }
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      toast.dismiss(loadingToast);
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast.success(`${exportMembers.length} member(s) exported to PDF`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Failed to export PDF");
    }
  };

  // Define columns for DataTable
  const columns = React.useMemo<ColumnDef<MemberEntry>[]>(
    () => [
      {
        accessorKey: "photo",
        header: "",
        cell: ({ row }) => (
          <MemberPhotoCell
            memberId={row.original._id}
            photoId={row.original.profilePhotoId}
            firstName={row.original.firstName}
            lastName={row.original.lastName}
            token={token}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "customId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ row }) => (
          <div className="font-mono text-xs">{row.original.customId || "N/A"}</div>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => `${row.firstName} ${row.lastName} ${row.preferredName || ""} ${row.customId || ""}`.toLowerCase(),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const member = row.original;
          return (
            <div>
              <div className="font-medium">
                {member.firstName} {member.lastName}
              </div>
              {member.preferredName && (
                <div className="text-xs text-muted-foreground">({member.preferredName})</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "phone",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Phone" />
        ),
        cell: ({ row }) => row.original.phone || "N/A",
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => row.original.email || "N/A",
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          return status ? (
            <Badge variant={getStatusBadgeVariant(status)}>
              {formatStatus(status)}
            </Badge>
          ) : (
            <Badge variant="outline">N/A</Badge>
          );
        },
      },
      {
        accessorKey: "dateJoinedChurch",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date Joined" />
        ),
        cell: ({ row }) =>
          row.original.dateJoinedChurch
            ? formatDate(row.original.dateJoinedChurch)
            : "N/A",
      },
      {
        accessorKey: "shepherdId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Shepherd" />
        ),
        cell: ({ row }) => {
          const shepherd = shepherds?.find((s) => s._id === row.original.shepherdId);
          return shepherd ? shepherd.name : "N/A";
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const member = row.original;
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
                <DropdownMenuItem
                  onClick={() => {
                    setMemberToView(member);
                    setViewMemberDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setMemberToEdit(member);
                    setEditMemberDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportCSV([member])}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportPDF([member])}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setMemberToChangeStatus(member);
                    setNewStatus(member.status || "established");
                    setChangeStatusDialogOpen(true);
                  }}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Change Status
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setMemberToDelete(member);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [shepherds, token]
  );

  if (!isClient) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view members</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
            <h1 className="text-2xl md:text-3xl font-bold">Members</h1>
            <p className="text-sm md:text-base text-muted-foreground">Manage church members</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleExportCSV(selectedRows)}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV ({selectedRows.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportPDF(selectedRows)}
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export PDF ({selectedRows.length})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkNewStatus("established");
                  setBulkChangeStatusDialogOpen(true);
                }}
                className="w-full sm:w-auto"
              >
                <UserCog className="mr-2 h-4 w-4" />
                Change Status ({selectedRows.length})
              </Button>
              {isAdmin && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedRows.length === 1) {
                      setMemberToDelete(selectedRows[0]);
                      setDeleteDialogOpen(true);
                    } else {
                      setDeleteDialogOpen(true);
                    }
                  }}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedRows.length})
                </Button>
              )}
            </>
          )}
          {(isAdmin || isShepherd) && (
            <Button onClick={() => setAddMemberDialogOpen(true)} className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-6">
            <StatsCardSkeleton count={6} showDescription={false} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>
          <ChartCardSkeleton />
        </>
      ) : stats ? (
        <>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Converts</CardTitle>
              <Sparkles className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.statusCounts.new_convert}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">First Timers</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.statusCounts.first_timer}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Established</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.statusCounts.established}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Visitors</CardTitle>
              <UserCheck className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.statusCounts.visitor}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Inactive</CardTitle>
              <UserX className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.statusCounts.inactive}</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Visualizations */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Member status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "New Convert", value: stats.statusCounts.new_convert, color: "#3b82f6" },
                      { name: "First Timer", value: stats.statusCounts.first_timer, color: "#8b5cf6" },
                      { name: "Established", value: stats.statusCounts.established, color: "#10b981" },
                      { name: "Visitor", value: stats.statusCounts.visitor, color: "#f59e0b" },
                      { name: "Inactive", value: stats.statusCounts.inactive, color: "#ef4444" },
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent! * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: "New Convert", value: stats.statusCounts.new_convert, color: "#3b82f6" },
                      { name: "First Timer", value: stats.statusCounts.first_timer, color: "#8b5cf6" },
                      { name: "Established", value: stats.statusCounts.established, color: "#10b981" },
                      { name: "Visitor", value: stats.statusCounts.visitor, color: "#f59e0b" },
                      { name: "Inactive", value: stats.statusCounts.inactive, color: "#ef4444" },
                    ].filter(item => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Members by Year Joined Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Members by Year Joined</CardTitle>
              <CardDescription>New members per year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(stats.yearCounts)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([year, count]) => ({ year, count }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Members" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Detailed status comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { status: "New Convert", count: stats.statusCounts.new_convert, color: "#3b82f6" },
                  { status: "First Timer", count: stats.statusCounts.first_timer, color: "#8b5cf6" },
                  { status: "Established", count: stats.statusCounts.established, color: "#10b981" },
                  { status: "Visitor", count: stats.statusCounts.visitor, color: "#f59e0b" },
                  { status: "Inactive", count: stats.statusCounts.inactive, color: "#ef4444" },
                ]}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Members">
                  {[
                    { status: "New Convert", count: stats.statusCounts.new_convert, color: "#3b82f6" },
                    { status: "First Timer", count: stats.statusCounts.first_timer, color: "#8b5cf6" },
                    { status: "Established", count: stats.statusCounts.established, color: "#10b981" },
                    { status: "Visitor", count: stats.statusCounts.visitor, color: "#f59e0b" },
                    { status: "Inactive", count: stats.statusCounts.inactive, color: "#ef4444" },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </>
      ) : null}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter members by shepherd, status, or year joined</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Shepherd</Label>
              <Select value={selectedShepherd} onValueChange={setSelectedShepherd}>
                <SelectTrigger>
                  <SelectValue placeholder="All Shepherds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shepherds</SelectItem>
                  {shepherds?.map((shepherd) => (
                    <SelectItem key={shepherd._id} value={shepherd._id}>
                      {shepherd.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new_convert">New Convert</SelectItem>
                  <SelectItem value="first_timer">First Timer</SelectItem>
                  <SelectItem value="established">Established</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year Joined</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(selectedShepherd !== "all" || selectedStatus !== "all" || selectedYear !== "all") && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedShepherd("all");
                  setSelectedStatus("all");
                  setSelectedYear("all");
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({filteredMembers.length})</CardTitle>
          <CardDescription>
            {selectedRows.length > 0 && `${selectedRows.length} member(s) selected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={6} rows={8} showCheckbox={true} />
          ) : filteredMembers && filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredMembers || []}
              searchKey="name"
              searchPlaceholder="Search by name or ID..."
              enableColumnVisibility={true}
              enablePagination={true}
              enableSorting={true}
              enableFiltering={true}
              enableRowSelection={true}
              onRowSelectionChange={setSelectedRows}
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyMessage="No members found"
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddMemberDialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen} />

      {memberToEdit && (
        <EditMemberDialog
          open={editMemberDialogOpen}
          onOpenChange={(open) => {
            setEditMemberDialogOpen(open);
            if (!open) {
              setMemberToEdit(null);
            }
          }}
          member={memberToEdit}
        />
      )}

      {memberToView && (
        <ViewMemberDialog
          open={viewMemberDialogOpen}
          onOpenChange={(open) => {
            setViewMemberDialogOpen(open);
            if (!open) {
              setMemberToView(null);
            }
          }}
          member={memberToView}
        />
      )}

      {/* Change Status Dialog (Single) */}
      <AlertDialog open={changeStatusDialogOpen} onOpenChange={setChangeStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Member Status</AlertDialogTitle>
            <AlertDialogDescription>
              Change the status for {memberToChangeStatus?.firstName} {memberToChangeStatus?.lastName}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as typeof newStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_convert">New Convert</SelectItem>
                <SelectItem value="first_timer">First Timer</SelectItem>
                <SelectItem value="established">Established</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={isChangingStatus || !newStatus}
            >
              {isChangingStatus ? "Changing..." : "Change Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Status Dialog */}
      <AlertDialog open={bulkChangeStatusDialogOpen} onOpenChange={setBulkChangeStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status for {selectedRows.length} Member(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Change the status for {selectedRows.length} selected member(s)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>New Status</Label>
            <Select value={bulkNewStatus} onValueChange={(value) => setBulkNewStatus(value as typeof bulkNewStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_convert">New Convert</SelectItem>
                <SelectItem value="first_timer">First Timer</SelectItem>
                <SelectItem value="established">Established</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkStatusChange}
              disabled={isBulkChangingStatus || !bulkNewStatus}
            >
              {isBulkChangingStatus ? "Changing..." : `Change Status (${selectedRows.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRows.length > 1 ? (
                <>
                  This will delete {selectedRows.length} selected members.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  This will delete the member "{memberToDelete?.firstName} {memberToDelete?.lastName}".
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRows.length > 1) {
                  handleBulkDelete();
                } else {
                  handleDelete();
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
