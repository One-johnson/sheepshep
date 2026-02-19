"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCardSkeleton } from "@/components/ui/card-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users,
  UserCheck,
  UserX,
  MapPin,
  Network,
  BarChart3,
  Search,
  Filter,
  CheckSquare,
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  UserCog,
  History,
  Download,
  Upload,
  UserPlus,
  Heart,
  Home,
  Trash2,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";

export default function AssignmentsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Get current user for role checking
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  const isAdmin = currentUser?.role === "admin";
  const isPastor = currentUser?.role === "pastor";
  const isShepherd = currentUser?.role === "shepherd";
  
  // Queries (getStats is admin/pastor only - shepherds see assignment list via taskAssignments)
  const stats = useQuery(
    api.userAssignments.getStats,
    token && (isAdmin || isPastor) ? { token } : "skip"
  );
  const hierarchy = useQuery(
    api.userAssignments.getHierarchy,
    token && isAdmin ? { token } : "skip" // Only admins can see full hierarchy
  );
  const pastors = useQuery(
    api.userAssignments.getPastors,
    token && (isAdmin || isPastor) ? { token } : "skip"
  );
  // Member assignment queries
  const members = useQuery(
    api.members.list,
    token ? { token, isActive: true } : "skip"
  );
  const memberStats = useQuery(
    api.memberAssignments.getMemberAssignmentStats,
    token && (isAdmin || isPastor) ? { token } : "skip"
  );
  
  // Task assignments query
  const taskAssignments = useQuery(
    api.assignments.list,
    token ? { token } : "skip"
  );

  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPastorFilter, setSelectedPastorFilter] = React.useState<string>("all");
  const [showUnassignedOnly, setShowUnassignedOnly] = React.useState(false);
  const [selectedShepherds, setSelectedShepherds] = React.useState<Set<Id<"users">>>(new Set());
  
  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = React.useState(false);
  const [selectedPastorForAssign, setSelectedPastorForAssign] = React.useState<Id<"users"> | "">("");
  const [selectedShepherdForAssign, setSelectedShepherdForAssign] = React.useState<Id<"users"> | "">("");
  
  // Member assignment dialog states
  const [memberAssignDialogOpen, setMemberAssignDialogOpen] = React.useState(false);
  const [bulkMemberAssignDialogOpen, setBulkMemberAssignDialogOpen] = React.useState(false);
  const [taskAssignmentDialogOpen, setTaskAssignmentDialogOpen] = React.useState(false);
  const [selectedMemberForAssign, setSelectedMemberForAssign] = React.useState<Id<"members"> | "">("");
  const [selectedShepherdForMember, setSelectedShepherdForMember] = React.useState<Id<"users"> | "">("");
  const [selectedMembers, setSelectedMembers] = React.useState<Set<Id<"members">>>(new Set());
  const [memberSearchQuery, setMemberSearchQuery] = React.useState("");
  const [selectedShepherdFilter, setSelectedShepherdFilter] = React.useState<string>("all");
  
  // Task assignment states
  const [taskType, setTaskType] = React.useState<"visitation" | "prayer" | "follow_up" | "other">("visitation");
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDescription, setTaskDescription] = React.useState("");
  const [taskDueDate, setTaskDueDate] = React.useState("");
  const [taskPriority, setTaskPriority] = React.useState<"low" | "medium" | "high">("medium");
  const [selectedAssignments, setSelectedAssignments] = React.useState<Set<Id<"assignments">>>(new Set());
  const [assignmentSearchQuery, setAssignmentSearchQuery] = React.useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = React.useState<string>("all");
  const [deleteAssignmentDialogOpen, setDeleteAssignmentDialogOpen] = React.useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = React.useState<Id<"assignments"> | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Mutations
  const assignShepherd = useMutation(api.userAssignments.assignShepherdToPastor);
  const unassignShepherd = useMutation(api.userAssignments.unassignShepherd);
  const bulkAssignShepherds = useMutation(api.userAssignments.bulkAssignShepherds);
  
  // Member assignment mutations
  const assignMember = useMutation(api.memberAssignments.assignMemberToShepherd);
  const bulkAssignMembers = useMutation(api.memberAssignments.bulkAssignMembers);
  const createTaskAssignment = useMutation(api.assignments.create);
  const deleteAssignment = useMutation(api.assignments.remove);
  const bulkDeleteAssignments = useMutation(api.assignments.bulkDelete);

  // Get filtered shepherds (admin/pastor only - shepherds see their own assignments)
  const shepherdsQuery = useQuery(
    api.userAssignments.getShepherds,
    token && (isAdmin || isPastor)
      ? {
          token,
          pastorId:
            selectedPastorFilter !== "all"
              ? (selectedPastorFilter as Id<"users">)
              : undefined,
          unassignedOnly: showUnassignedOnly,
        }
      : "skip"
  );

  // Filter shepherds by search query
  const filteredShepherds = React.useMemo(() => {
    if (!shepherdsQuery) return [];
    return shepherdsQuery.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shepherdsQuery, searchQuery]);

  // Handle assign shepherd to pastor
  const handleAssignShepherd = async () => {
    if (!selectedShepherdForAssign || !selectedPastorForAssign) {
      toast.error("Please select both shepherd and pastor");
      return;
    }

    try {
      await assignShepherd({
        token: token!,
        shepherdId: selectedShepherdForAssign as Id<"users">,
        pastorId: selectedPastorForAssign as Id<"users">,
      });
      toast.success("Shepherd assigned successfully");
      setAssignDialogOpen(false);
      setSelectedShepherdForAssign("");
      setSelectedPastorForAssign("");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign shepherd");
    }
  };

  // Handle unassign shepherd
  const handleUnassignShepherd = async (shepherdId: Id<"users">) => {
    try {
      await unassignShepherd({
        token: token!,
        shepherdId,
      });
      toast.success("Shepherd unassigned successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to unassign shepherd");
    }
  };

  // Handle bulk assign
  const handleBulkAssign = async () => {
    if (!selectedPastorForAssign || selectedShepherds.size === 0) {
      toast.error("Please select a pastor and at least one shepherd");
      return;
    }

    try {
      const result = await bulkAssignShepherds({
        token: token!,
        shepherdIds: Array.from(selectedShepherds) as Id<"users">[],
        pastorId: selectedPastorForAssign as Id<"users">,
      });

      if (result.errors.length > 0) {
        toast.warning(
          `Assigned ${result.success.length} shepherds. ${result.errors.length} failed.`
        );
      } else {
        toast.success(`Successfully assigned ${result.success.length} shepherds`);
      }

      setBulkAssignDialogOpen(false);
      setSelectedShepherds(new Set());
      setSelectedPastorForAssign("");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign shepherds");
    }
  };

  // Toggle shepherd selection
  const toggleShepherdSelection = (shepherdId: Id<"users">) => {
    const newSelection = new Set(selectedShepherds);
    if (newSelection.has(shepherdId)) {
      newSelection.delete(shepherdId);
    } else {
      newSelection.add(shepherdId);
    }
    setSelectedShepherds(newSelection);
  };

  // Select all filtered shepherds
  const selectAllShepherds = () => {
    const allIds = new Set(filteredShepherds.map((s) => s._id));
    setSelectedShepherds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedShepherds(new Set());
  };

  // Filter members by search and shepherd
  const filteredMembers = React.useMemo(() => {
    if (!members) return [];
    let filtered = members;
    
    if (memberSearchQuery) {
      filtered = filtered.filter(
        (m) =>
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          m.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          m.phone.toLowerCase().includes(memberSearchQuery)
      );
    }
    
    if (selectedShepherdFilter !== "all") {
      filtered = filtered.filter((m) => m.shepherdId === selectedShepherdFilter);
    }
    
    return filtered;
  }, [members, memberSearchQuery, selectedShepherdFilter]);

  // Handle assign member to shepherd
  const handleAssignMember = async () => {
    if (!selectedMemberForAssign || !selectedShepherdForMember) {
      toast.error("Please select both member and shepherd");
      return;
    }

    try {
      await assignMember({
        token: token!,
        memberId: selectedMemberForAssign as Id<"members">,
        shepherdId: selectedShepherdForMember as Id<"users">,
      });
      toast.success("Member assigned successfully", {
        description: "John 10:14 - 'I am the good shepherd; I know my sheep and my sheep know me.'",
        duration: 6000,
      });
      setMemberAssignDialogOpen(false);
      setSelectedMemberForAssign("");
      setSelectedShepherdForMember("");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign member");
    }
  };

  // Handle bulk assign members
  const handleBulkAssignMembers = async () => {
    if (!selectedShepherdForMember || selectedMembers.size === 0) {
      toast.error("Please select a shepherd and at least one member");
      return;
    }

    try {
      const result = await bulkAssignMembers({
        token: token!,
        memberIds: Array.from(selectedMembers) as Id<"members">[],
        shepherdId: selectedShepherdForMember as Id<"users">,
      });

      if (result.errors.length > 0) {
        toast.warning(
          `Assigned ${result.success.length} members. ${result.errors.length} failed.`
        );
      } else {
        toast.success(`Successfully assigned ${result.success.length} members`, {
          description: "John 10:14 - 'I am the good shepherd; I know my sheep and my sheep know me.'",
          duration: 6000,
        });
      }

      setBulkMemberAssignDialogOpen(false);
      setSelectedMembers(new Set());
      setSelectedShepherdForMember("");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign members");
    }
  };

  // Handle create task assignment
  const handleCreateTaskAssignment = async () => {
    if (!selectedMemberForAssign || !selectedShepherdForMember || !taskTitle) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createTaskAssignment({
        token: token!,
        memberId: selectedMemberForAssign as Id<"members">,
        shepherdId: selectedShepherdForMember as Id<"users">,
        assignmentType: taskType,
        title: taskTitle,
        description: taskDescription || undefined,
        dueDate: taskDueDate ? new Date(taskDueDate).getTime() : undefined,
        priority: taskPriority,
      });
      toast.success("Task assignment created successfully");
      setTaskAssignmentDialogOpen(false);
      setSelectedMemberForAssign("");
      setSelectedShepherdForMember("");
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setTaskType("visitation");
      setTaskPriority("medium");
    } catch (error: any) {
      toast.error(error.message || "Failed to create task assignment");
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (memberId: Id<"members">) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  // Toggle assignment selection
  const toggleAssignmentSelection = (assignmentId: Id<"assignments">) => {
    const newSelection = new Set(selectedAssignments);
    if (newSelection.has(assignmentId)) {
      newSelection.delete(assignmentId);
    } else {
      newSelection.add(assignmentId);
    }
    setSelectedAssignments(newSelection);
  };

  // Handle delete single assignment
  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteAssignment({
        token: token!,
        assignmentId: assignmentToDelete,
      });
      toast.success("Assignment deleted successfully");
      setDeleteAssignmentDialogOpen(false);
      setAssignmentToDelete(null);
      setSelectedAssignments(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to delete assignment");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete assignments
  const handleBulkDeleteAssignments = async () => {
    if (selectedAssignments.size === 0) {
      toast.error("Please select at least one assignment");
      return;
    }

    setIsDeleting(true);
    try {
      const result = await bulkDeleteAssignments({
        token: token!,
        assignmentIds: Array.from(selectedAssignments) as Id<"assignments">[],
      });

      if (result.errors && result.errors.length > 0) {
        toast.warning(
          `Deleted ${result.deleted} assignments. ${result.errors.length} failed.`
        );
      } else {
        toast.success(`Successfully deleted ${result.deleted} assignments`);
      }

      setSelectedAssignments(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to delete assignments");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export assignments to CSV
  const handleExportAssignmentsCSV = (assignmentsToExport?: typeof taskAssignments) => {
    const exportAssignments = assignmentsToExport || taskAssignments || [];
    
    if (exportAssignments.length === 0) {
      toast.error("No assignments to export");
      return;
    }

    const headers = [
      "Title",
      "Type",
      "Member",
      "Shepherd",
      "Status",
      "Priority",
      "Due Date",
      "Created At",
      "Description",
    ];

    const rows = exportAssignments.map((assignment) => {
      const member = members?.find((m) => m._id === assignment.memberId);
      const shepherd = shepherdsQuery?.find((s) => s._id === assignment.shepherdId);
      const memberName = member ? `${member.firstName} ${member.lastName}` : "Unknown";
      const shepherdName = isShepherd && assignment.shepherdId === currentUser?._id
        ? currentUser.name
        : (shepherd?.name || "Unknown");
      
      return [
        assignment.title,
        assignment.assignmentType,
        memberName,
        shepherdName,
        assignment.status,
        assignment.priority,
        assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "",
        new Date(assignment.createdAt).toLocaleDateString(),
        assignment.description || "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = exportAssignments.length === 1
      ? `assignment_${exportAssignments[0].title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
      : `assignments_${exportAssignments.length}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${exportAssignments.length} assignment(s) exported to CSV`);
  };

  // Export assignments to PDF
  const handleExportAssignmentsPDF = async (assignmentsToExport?: typeof taskAssignments) => {
    const exportAssignments = assignmentsToExport || taskAssignments || [];
    
    if (exportAssignments.length === 0) {
      toast.error("No assignments to export");
      return;
    }

    const loadingToast = toast.loading("Preparing PDF...");

    try {
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
            <title>Assignments Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              @media print { @page { margin: 1cm; } }
            </style>
          </head>
          <body>
            <h1>Assignments Export</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Assignments: ${exportAssignments.length}</p>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Member</th>
                  <th>Shepherd</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${exportAssignments.map((assignment) => {
                  const member = members?.find((m) => m._id === assignment.memberId);
                  const shepherd = shepherdsQuery?.find((s) => s._id === assignment.shepherdId);
                  const memberName = member ? `${member.firstName} ${member.lastName}` : "Unknown";
                  const shepherdName = isShepherd && assignment.shepherdId === currentUser?._id
                    ? currentUser.name
                    : (shepherd?.name || "Unknown");
                  
                  return `
                    <tr>
                      <td>${assignment.title}</td>
                      <td>${assignment.assignmentType}</td>
                      <td>${memberName}</td>
                      <td>${shepherdName}</td>
                      <td>${assignment.status}</td>
                      <td>${assignment.priority}</td>
                      <td>${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "N/A"}</td>
                      <td>${new Date(assignment.createdAt).toLocaleDateString()}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      toast.dismiss(loadingToast);
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast.success(`${exportAssignments.length} assignment(s) exported to PDF`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Failed to export PDF");
    }
  };

  // Filter assignments
  const filteredAssignments = React.useMemo(() => {
    if (!taskAssignments) return [];
    let filtered = taskAssignments;
    
    if (assignmentSearchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(assignmentSearchQuery.toLowerCase())
      );
    }
    
    if (assignmentStatusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === assignmentStatusFilter);
    }
    
    return filtered;
  }, [taskAssignments, assignmentSearchQuery, assignmentStatusFilter]);

  // Always render the same structure to prevent hydration mismatch
  if (!isClient || !token) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">
              {!isClient ? "Loading..." : "Please log in to view assignments"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Only allow admin and pastor access
  if (currentUser === undefined) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
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
            <h1 className="text-2xl sm:text-3xl font-bold">Assignments</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isShepherd
                ? "Your visitation and prayer assignments"
                : "Manage organizational structure and assignments"}
            </p>
          </div>
        </div>
        {(isAdmin || isPastor) && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setBulkAssignDialogOpen(true)}
              disabled={selectedShepherds.size === 0}
              className="w-full sm:w-auto"
              size="sm"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Bulk Assign ({selectedShepherds.size})
            </Button>
            <Button 
              onClick={() => setAssignDialogOpen(true)}
              className="w-full sm:w-auto"
              size="sm"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Assign Shepherd
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards (admin/pastor only) */}
      {(isAdmin || isPastor) && (
      stats === undefined ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <StatsCardSkeleton count={4} showDescription={false} />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Pastors</CardTitle>
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalPastors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Shepherds</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.totalShepherds}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Unassigned</CardTitle>
              <UserX className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.unassignedShepherds}</div>
            </CardContent>
          </Card>
        </div>
      ) : null
      )}

      {/* Main Content Tabs - shepherds only see Tasks; pastors cannot assign shepherds (admin only) */}
      <Tabs defaultValue={isShepherd ? "tasks" : isAdmin ? "hierarchy" : "shepherds"} className="space-y-4">
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <TabsList className="inline-flex w-full sm:w-auto min-w-full sm:min-w-0">
            {isShepherd ? (
              <TabsTrigger value="tasks" className="flex-shrink-0 text-xs sm:text-sm">
                <Heart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Task Assignments</span>
                <span className="sm:hidden">Tasks</span>
              </TabsTrigger>
            ) : (
              <>
            {isAdmin && (
              <TabsTrigger value="hierarchy" className="flex-shrink-0 text-xs sm:text-sm">
                <Network className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Organization Chart</span>
                <span className="xs:hidden">Chart</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="shepherds" className="flex-shrink-0 text-xs sm:text-sm">
              <Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Manage Shepherds</span>
              <span className="xs:hidden">Shepherds</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-shrink-0 text-xs sm:text-sm">
              <BarChart3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-shrink-0 text-xs sm:text-sm">
              <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Member Assignments</span>
              <span className="sm:hidden">Members</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-shrink-0 text-xs sm:text-sm">
              <Heart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Task Assignments</span>
              <span className="sm:hidden">Tasks</span>
            </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Organization Chart Tab (admin only - pastors cannot assign shepherds to pastors) */}
        {isAdmin && (
        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Hierarchy</CardTitle>
              <CardDescription>
                Visual representation of pastors and their assigned shepherds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hierarchy ? (
                <div className="space-y-6">
                  {hierarchy.hierarchy.map((item) => (
                    <Card key={item.pastor._id} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <CardTitle className="text-base sm:text-lg">{item.pastor.name}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">{item.pastor.email}</CardDescription>
                          </div>
                          <Badge className="w-fit">{item.shepherds.length} Shepherds</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {item.shepherds.length > 0 ? (
                          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {item.shepherds.map((shepherd) => (
                              <div
                                key={shepherd._id}
                                className="flex items-center justify-between p-2 sm:p-3 border rounded-lg"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm sm:text-base truncate">{shepherd.name}</div>
                                  <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                    {shepherd.email}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-shrink-0 ml-2"
                                  onClick={() => handleUnassignShepherd(shepherd._id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No shepherds assigned
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {hierarchy.unassignedShepherds.length > 0 && (
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-lg text-muted-foreground">
                          Unassigned Shepherds ({hierarchy.unassignedShepherds.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                          {hierarchy.unassignedShepherds.map((shepherd) => (
                            <div
                              key={shepherd._id}
                              className="flex items-center justify-between p-2 sm:p-3 border rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm sm:text-base truncate">{shepherd.name}</div>
                                <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                  {shepherd.email}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0 ml-2"
                                onClick={() => {
                                  setSelectedShepherdForAssign(shepherd._id);
                                  setAssignDialogOpen(true);
                                }}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div>Loading...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Manage Shepherds Tab */}
        <TabsContent value="shepherds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Shepherds</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Assign shepherds to pastors and manage assignments"
                  : "View your assigned shepherds. Only admins can assign or unassign shepherds to pastors."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shepherds..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  {isAdmin && (
                  <Select
                    value={selectedPastorFilter}
                    onValueChange={setSelectedPastorFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] text-sm">
                      <SelectValue placeholder="Filter by pastor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pastors</SelectItem>
                      {pastors?.map((pastor) => (
                        <SelectItem key={pastor._id} value={pastor._id}>
                          {pastor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                  {isAdmin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unassigned-only"
                      checked={showUnassignedOnly}
                      onCheckedChange={(checked: boolean) =>
                        setShowUnassignedOnly(checked === true)
                      }
                    />
                    <Label htmlFor="unassigned-only" className="text-sm">Unassigned only</Label>
                  </div>
                  )}
                </div>
              </div>

              {/* Selection Actions - admin only (pastors cannot assign shepherds to pastors) */}
              {isAdmin && selectedShepherds.size > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedShepherds.size} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="flex-1 sm:flex-initial"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBulkAssignDialogOpen(true);
                      }}
                      className="flex-1 sm:flex-initial"
                    >
                      Assign to Pastor
                    </Button>
                  </div>
                </div>
              )}

              {/* Shepherds List */}
              <div className="space-y-2">
                {filteredShepherds.length > 0 ? (
                  filteredShepherds.map((shepherd) => {
                    return (
                      <div
                        key={shepherd._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {isAdmin && (
                            <Checkbox
                              checked={selectedShepherds.has(shepherd._id)}
                              onCheckedChange={() =>
                                toggleShepherdSelection(shepherd._id)
                              }
                              className="mt-1 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm sm:text-base truncate">{shepherd.name}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">
                              {shepherd.email}
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                              {shepherd.overseerName ? (
                                <Badge className="text-xs">
                                  Overseen by: {shepherd.overseerName}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">Unassigned</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end sm:justify-start">
                          {isAdmin && shepherd.overseerId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnassignShepherd(shepherd._id)}
                              className="flex-1 sm:flex-initial"
                            >
                              Unassign
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No shepherds found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Statistics</CardTitle>
              <CardDescription>
                Workload distribution and assignment metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.shepherdCounts && stats.shepherdCounts.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">Shepherds per Pastor</h3>
                  <div className="space-y-2">
                    {stats.shepherdCounts.map((item) => (
                      <div
                        key={item.pastorId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{item.pastorName}</div>
                        </div>
                        <Badge>{item.count} Shepherds</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No statistics available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Member Assignments Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Member Assignments</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Assign members to shepherds for care and create task assignments
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setBulkMemberAssignDialogOpen(true)}
                    disabled={selectedMembers.size === 0}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Bulk Assign ({selectedMembers.size})
                  </Button>
                  <Button 
                    onClick={() => setMemberAssignDialogOpen(true)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Member
                  </Button>
                  <Button 
                    onClick={() => setTaskAssignmentDialogOpen(true)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Member Stats */}
              {memberStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium">Total Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{memberStats.totalMembers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium">Total Shepherds</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{memberStats.totalShepherds}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium">Avg Members/Shepherd</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {memberStats.totalShepherds > 0
                          ? Math.round(memberStats.totalMembers / memberStats.totalShepherds)
                          : 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col gap-2 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="pl-8 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <Select
                  value={selectedShepherdFilter}
                  onValueChange={setSelectedShepherdFilter}
                >
                  <SelectTrigger className="w-full sm:w-[200px] text-sm">
                    <SelectValue placeholder="Filter by shepherd" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shepherds</SelectItem>
                    {shepherdsQuery?.map((shepherd) => (
                      <SelectItem key={shepherd._id} value={shepherd._id}>
                        {shepherd.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Actions */}
              {selectedMembers.size > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedMembers.size} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMembers(new Set())}
                      className="flex-1 sm:flex-initial"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBulkMemberAssignDialogOpen(true);
                      }}
                      className="flex-1 sm:flex-initial"
                    >
                      Assign to Shepherd
                    </Button>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => {
                    const shepherd = shepherdsQuery?.find((s) => s._id === member.shepherdId);
                    return (
                      <div
                        key={member._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedMembers.has(member._id)}
                            onCheckedChange={() =>
                              toggleMemberSelection(member._id)
                            }
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm sm:text-base">
                              {member.firstName} {member.lastName}
                              {member.preferredName && (
                                <span className="text-muted-foreground ml-1">
                                  ({member.preferredName})
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">
                              {member.email || member.phone}
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                              {shepherd ? (
                                <Badge className="text-xs">
                                  Assigned to: {shepherd.name}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">Unassigned</Badge>
                              )}
                              {member.status && (
                                <Badge variant="outline" className="text-xs">{member.status}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end sm:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMemberForAssign(member._id);
                              setMemberAssignDialogOpen(true);
                            }}
                            className="flex-1 sm:flex-initial"
                          >
                            Reassign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMemberForAssign(member._id);
                              setSelectedShepherdForMember(member.shepherdId || "");
                              setTaskAssignmentDialogOpen(true);
                            }}
                            className="flex-1 sm:flex-initial"
                          >
                            Task
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No members found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Assignments Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Task Assignments</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Manage task assignments for members and shepherds
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {selectedAssignments.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportAssignmentsCSV(
                          filteredAssignments.filter((a) => selectedAssignments.has(a._id))
                        )}
                        className="w-full sm:w-auto"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV ({selectedAssignments.size})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportAssignmentsPDF(
                          filteredAssignments.filter((a) => selectedAssignments.has(a._id))
                        )}
                        className="w-full sm:w-auto"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Export PDF ({selectedAssignments.size})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeleteAssignments}
                        disabled={isDeleting}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedAssignments.size})
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportAssignmentsCSV()}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export All CSV</span>
                    <span className="sm:hidden">Export CSV</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportAssignmentsPDF()}
                    className="w-full sm:w-auto"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export All PDF</span>
                    <span className="sm:hidden">Export PDF</span>
                  </Button>
                  {!isShepherd && (
                    <Button 
                      onClick={() => setTaskAssignmentDialogOpen(true)}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-2 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assignments..."
                      value={assignmentSearchQuery}
                      onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                      className="pl-8 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <Select
                  value={assignmentStatusFilter}
                  onValueChange={setAssignmentStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-[200px] text-sm">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Actions */}
              {selectedAssignments.size > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedAssignments.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssignments(new Set())}
                    className="w-full sm:w-auto"
                  >
                    Clear
                  </Button>
                </div>
              )}

              {/* Assignments List */}
              <div className="space-y-2">
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => {
                    const member = members?.find((m) => m._id === assignment.memberId);
                    const shepherd = shepherdsQuery?.find((s) => s._id === assignment.shepherdId);
                    const memberName = member ? `${member.firstName} ${member.lastName}` : "Unknown";
                    const shepherdName = isShepherd && assignment.shepherdId === currentUser?._id
                      ? currentUser.name
                      : (shepherd?.name || "Unknown");
                    
                    const getStatusBadgeVariant = (status: string) => {
                      switch (status) {
                        case "completed":
                          return "default";
                        case "in_progress":
                          return "secondary";
                        case "cancelled":
                          return "destructive";
                        default:
                          return "outline";
                      }
                    };

                    const getPriorityBadgeVariant = (priority: string) => {
                      switch (priority) {
                        case "high":
                          return "destructive";
                        case "medium":
                          return "default";
                        default:
                          return "secondary";
                      }
                    };

                    return (
                      <div
                        key={assignment._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedAssignments.has(assignment._id)}
                            onCheckedChange={() =>
                              toggleAssignmentSelection(assignment._id)
                            }
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm sm:text-base">{assignment.title}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {assignment.description || "No description"}
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{assignment.assignmentType}</Badge>
                              <Badge variant={getStatusBadgeVariant(assignment.status)} className="text-xs">
                                {assignment.status}
                              </Badge>
                              <Badge variant={getPriorityBadgeVariant(assignment.priority)} className="text-xs">
                                {assignment.priority} priority
                              </Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-2 flex flex-wrap gap-x-2">
                              <span>Member: {memberName}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Shepherd: {shepherdName}</span>
                              {assignment.dueDate && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span>
                                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end sm:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssignmentToDelete(assignment._id);
                              setDeleteAssignmentDialogOpen(true);
                            }}
                            className="flex-1 sm:flex-initial"
                          >
                            <Trash2 className="h-4 w-4 sm:mr-0" />
                            <span className="ml-2 sm:hidden">Delete</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportAssignmentsCSV([assignment])}
                            className="flex-1 sm:flex-initial"
                          >
                            <Download className="h-4 w-4 sm:mr-0" />
                            <span className="ml-2 sm:hidden">CSV</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportAssignmentsPDF([assignment])}
                            className="flex-1 sm:flex-initial"
                          >
                            <FileText className="h-4 w-4 sm:mr-0" />
                            <span className="ml-2 sm:hidden">PDF</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No assignments found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Assignment Dialog */}
      <Dialog open={deleteAssignmentDialogOpen} onOpenChange={setDeleteAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteAssignmentDialogOpen(false);
                setAssignmentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAssignment}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Shepherd Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Shepherd to Pastor</DialogTitle>
            <DialogDescription>
              Select a shepherd and pastor to create an assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shepherd</Label>
              <Select
                value={selectedShepherdForAssign}
                onValueChange={(value) =>
                  setSelectedShepherdForAssign(value as Id<"users">)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shepherd" />
                </SelectTrigger>
                <SelectContent>
                  {filteredShepherds.map((shepherd) => (
                    <SelectItem key={shepherd._id} value={shepherd._id}>
                      {shepherd.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pastor</Label>
              <Select
                value={selectedPastorForAssign}
                onValueChange={(value) =>
                  setSelectedPastorForAssign(value as Id<"users">)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pastor" />
                </SelectTrigger>
                <SelectContent>
                  {pastors?.map((pastor) => (
                    <SelectItem key={pastor._id} value={pastor._id}>
                      {pastor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAssignShepherd}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Shepherds</DialogTitle>
            <DialogDescription>
              Assign {selectedShepherds.size} selected shepherds to a pastor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pastor</Label>
              <Select
                value={selectedPastorForAssign}
                onValueChange={(value) =>
                  setSelectedPastorForAssign(value as Id<"users">)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pastor" />
                </SelectTrigger>
                <SelectContent>
                  {pastors?.map((pastor) => (
                    <SelectItem key={pastor._id} value={pastor._id}>
                      {pastor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkAssign}>Assign All</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Member Dialog */}
      <Dialog open={memberAssignDialogOpen} onOpenChange={setMemberAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Member to Shepherd</DialogTitle>
            <DialogDescription>
              Select a member and shepherd to create an assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Select
                value={selectedMemberForAssign}
                onValueChange={(value) =>
                  setSelectedMemberForAssign(value as Id<"members">)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shepherd</Label>
              <Select
                value={selectedShepherdForMember}
                onValueChange={(value) =>
                  setSelectedShepherdForMember(value as Id<"users">)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shepherd" />
                </SelectTrigger>
                <SelectContent>
                  {shepherdsQuery?.map((shepherd) => (
                    <SelectItem key={shepherd._id} value={shepherd._id}>
                      {shepherd.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setMemberAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAssignMember}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Members Dialog */}
      <Dialog open={bulkMemberAssignDialogOpen} onOpenChange={setBulkMemberAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Members</DialogTitle>
            <DialogDescription>
              Assign {selectedMembers.size} selected members to a shepherd
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shepherd</Label>
              <Select
                value={selectedShepherdForMember}
                onValueChange={(value) =>
                  setSelectedShepherdForMember(value as Id<"users">)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shepherd" />
                </SelectTrigger>
                <SelectContent>
                  {shepherdsQuery?.map((shepherd) => (
                    <SelectItem key={shepherd._id} value={shepherd._id}>
                      {shepherd.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkMemberAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkAssignMembers}>Assign All</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Assignment Dialog */}
      <Dialog open={taskAssignmentDialogOpen} onOpenChange={setTaskAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task Assignment</DialogTitle>
            <DialogDescription>
              Create a visitation, prayer, or follow-up assignment for a member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Member</Label>
                <Select
                  value={selectedMemberForAssign}
                  onValueChange={(value) =>
                    setSelectedMemberForAssign(value as Id<"members">)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shepherd</Label>
                <Select
                  value={selectedShepherdForMember}
                  onValueChange={(value) =>
                    setSelectedShepherdForMember(value as Id<"users">)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shepherd" />
                  </SelectTrigger>
                  <SelectContent>
                    {shepherdsQuery?.map((shepherd) => (
                      <SelectItem key={shepherd._id} value={shepherd._id}>
                        {shepherd.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select value={taskType} onValueChange={(value: any) => setTaskType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visitation">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Visitation
                      </div>
                    </SelectItem>
                    <SelectItem value="prayer">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Prayer
                      </div>
                    </SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Visit John Doe for prayer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Additional details about the assignment..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(value: any) => setTaskPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTaskAssignmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTaskAssignment}>Create Assignment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
