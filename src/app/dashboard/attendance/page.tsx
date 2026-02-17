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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Plus,
  Download,
  Search,
  X,
  CheckSquare,
  ArrowLeft,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Format date for display
function formatDate(timestamp: number): string {
  return format(new Date(timestamp), "MMM dd, yyyy");
}

function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), "MMM dd, yyyy HH:mm");
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

// Component to display user/shepherd photo
function UserPhotoCell({
  userId,
  photoId,
  name,
  token,
}: {
  userId: Id<"users">;
  photoId?: Id<"_storage">;
  name: string;
  token: string | null;
}) {
  const photoUrl = useQuery(
    api.storage.getFileUrl,
    token && photoId ? { token, storageId: photoId } : "skip"
  );

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Avatar className="h-8 w-8">
      {photoUrl ? (
        <AvatarImage src={photoUrl} alt={name} />
      ) : (
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

// Get status badge variant and className
function getStatusBadgeProps(status: string) {
  switch (status) {
    case "present":
      return { variant: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white border-green-500" };
    case "absent":
      return { variant: "destructive" as const };
    case "excused":
      return { variant: "secondary" as const, className: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" };
    case "late":
      return { variant: "outline" as const };
    default:
      return { variant: "outline" as const };
  }
}

// Get approval badge variant and className
function getApprovalBadgeProps(status: string) {
  switch (status) {
    case "approved":
      return { variant: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white border-green-500" };
    case "rejected":
      return { variant: "destructive" as const };
    case "pending":
      return { variant: "secondary" as const, className: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" };
    default:
      return { variant: "outline" as const };
  }
}

export default function AttendancePage() {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem("authToken"));
  }, []);

  // Get current user
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  // Determine user role and permissions (must be before queries that use them)
  const isAdmin = currentUser?.role === "admin";
  const isPastor = currentUser?.role === "pastor";
  const isShepherd = currentUser?.role === "shepherd";
  const canManageAll = isAdmin || isPastor;

  // Queries
  const members = useQuery(
    api.members.list,
    token ? { token, isActive: true } : "skip"
  );

  // Get groups for attendance (groups with meeting day and members, where user is leader)
  const groupsForAttendance = useQuery(
    api.groups.listForAttendance,
    token ? { token } : "skip"
  );

  // Get shepherds based on role
  const shepherds = useQuery(
    api.attendance.getShepherds,
    token && canManageAll ? { token } : "skip"
  );

  const attendance = useQuery(
    api.attendance.list,
    token ? { token } : "skip"
  );

  // Mutations
  const createAttendance = useMutation(api.attendance.create);
  const bulkCreateAttendance = useMutation(api.attendance.bulkCreate);
  const approveAttendance = useMutation(api.attendance.approve);
  const rejectAttendance = useMutation(api.attendance.reject);
  const deleteAttendance = useMutation(api.attendance.remove);
  const bulkDeleteAttendance = useMutation(api.attendance.bulkDelete);

  // State - pastors only see shepherds & records (no member attendance)
  const [selectedTab, setSelectedTab] = React.useState<"members" | "groups" | "shepherds" | "records">("members");

  // When user is pastor, default to Shepherds tab (they cannot mark member attendance)
  React.useEffect(() => {
    if (currentUser?.role === "pastor" && selectedTab === "members") {
      setSelectedTab("shepherds");
    }
  }, [currentUser?.role]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [approvalFilter, setApprovalFilter] = React.useState<string>("all");
  const [selectedMembers, setSelectedMembers] = React.useState<Set<Id<"members">>>(new Set());
  const [selectedShepherds, setSelectedShepherds] = React.useState<Set<Id<"users">>>(new Set());
  const [selectedRecords, setSelectedRecords] = React.useState<Set<Id<"attendance">>>(new Set());

  // Dialog states
  const [markAttendanceDialogOpen, setMarkAttendanceDialogOpen] = React.useState(false);
  const [bulkMarkDialogOpen, setBulkMarkDialogOpen] = React.useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [recordToApprove, setRecordToApprove] = React.useState<Id<"attendance"> | null>(null);
  const [recordToReject, setRecordToReject] = React.useState<Id<"attendance"> | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Attendance form state
  const [attendanceStatus, setAttendanceStatus] = React.useState<"present" | "absent" | "excused" | "late">("present");
  const [attendanceNotes, setAttendanceNotes] = React.useState("");
  const [selectedMemberForAttendance, setSelectedMemberForAttendance] = React.useState<Id<"members"> | "">("");
  const [selectedShepherdForAttendance, setSelectedShepherdForAttendance] = React.useState<Id<"users"> | "">("");
  
  // New state for list-based marking dialog (members)
  const [selectedShepherdForMarking, setSelectedShepherdForMarking] = React.useState<Id<"users"> | "">("");
  const [memberAttendanceRecords, setMemberAttendanceRecords] = React.useState<
    Array<{
      memberId: Id<"members">;
      status: "present" | "absent" | "excused" | "late";
      reason: string;
    }>
  >([]);

  // State for group attendance dialog
  const [markGroupAttendanceDialogOpen, setMarkGroupAttendanceDialogOpen] = React.useState(false);
  const [selectedGroupForAttendance, setSelectedGroupForAttendance] = React.useState<Id<"groups"> | "">("");
  const [groupAttendanceRecords, setGroupAttendanceRecords] = React.useState<
    Array<{
      memberId: Id<"members">;
      status: "present" | "absent" | "excused" | "late";
      reason: string;
    }>
  >([]);

  // State for shepherd attendance dialog
  const [markShepherdAttendanceDialogOpen, setMarkShepherdAttendanceDialogOpen] = React.useState(false);
  const [shepherdAttendanceRecords, setShepherdAttendanceRecords] = React.useState<
    Array<{
      userId: Id<"users">;
      status: "present" | "absent" | "excused" | "late";
      reason: string;
    }>
  >([]);

  const isLoading = attendance === undefined || members === undefined || currentUser === undefined;

  // Filter members based on role
  const filteredMembers = React.useMemo(() => {
    if (!members) return [];
    let filtered = members;

    // Shepherds can only see their members
    if (isShepherd && currentUser?._id) {
      filtered = members.filter((m) => m.shepherdId === currentUser._id);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.firstName.toLowerCase().includes(query) ||
          m.lastName.toLowerCase().includes(query) ||
          m.customId?.toLowerCase().includes(query) ||
          m.email?.toLowerCase().includes(query) ||
          m.phone?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [members, searchQuery, isShepherd, currentUser]);

  // Get members for selected shepherd in marking dialog
  const membersForSelectedShepherd = React.useMemo(() => {
    if (!members) return [];
    
    // For shepherds, use their own ID if no selection made
    const shepherdId = selectedShepherdForMarking || (isShepherd && currentUser?._id ? currentUser._id : null);
    if (!shepherdId) return [];
    
    return members.filter((m) => m.shepherdId === shepherdId && m.isActive);
  }, [members, selectedShepherdForMarking, isShepherd, currentUser]);

  // Query to check existing attendance for members on selected date
  const selectedDateTimestamp = React.useMemo(() => {
    if (!dateFilter) return null;
    const date = new Date(dateFilter);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, [dateFilter]);

  const existingAttendanceForMembers = useQuery(
    api.attendance.checkExistingAttendance,
    token && selectedDateTimestamp && membersForSelectedShepherd.length > 0
      ? {
          token,
          memberIds: membersForSelectedShepherd.map((m) => m._id),
          date: selectedDateTimestamp,
        }
      : "skip"
  );

  // Get group members when a group is selected
  const groupMembers = useQuery(
    api.groups.getMembers,
    token && selectedGroupForAttendance ? { token, groupId: selectedGroupForAttendance } : "skip"
  );

  // Flatten group members for attendance
  const groupMembersList = React.useMemo(() => {
    if (!groupMembers) return [];
    return groupMembers
      .map((gm) => gm.member)
      .filter((m): m is NonNullable<typeof m> => m != null);
  }, [groupMembers]);

  // Query to check existing attendance for group members on selected date (with groupId)
  const existingAttendanceForGroupMembers = useQuery(
    api.attendance.checkExistingAttendance,
    token &&
      selectedDateTimestamp &&
      selectedGroupForAttendance &&
      groupMembersList.length > 0
      ? {
          token,
          memberIds: groupMembersList.map((m) => m._id),
          date: selectedDateTimestamp,
          groupId: selectedGroupForAttendance,
        }
      : "skip"
  );

  // Filter group members who don't have attendance yet
  const groupMembersWithoutAttendance = React.useMemo(() => {
    if (!existingAttendanceForGroupMembers || !groupMembersList) return groupMembersList || [];
    return groupMembersList.filter(
      (m) => !existingAttendanceForGroupMembers[m._id]
    );
  }, [groupMembersList, existingAttendanceForGroupMembers]);

  // Query to check existing shepherd attendance on selected date
  const existingAttendanceForShepherds = useQuery(
    api.attendance.checkExistingShepherdAttendance,
    token && selectedDateTimestamp && canManageAll && shepherds && shepherds.length > 0
      ? {
          token,
          userIds: shepherds.map((s) => s._id),
          date: selectedDateTimestamp,
        }
      : "skip"
  );

  // Filter shepherds who already have attendance for the selected date
  const shepherdsWithoutAttendance = React.useMemo(() => {
    if (!shepherds) return [];
    if (!existingAttendanceForShepherds) return shepherds;

    return shepherds.filter(
      (shepherd) => !existingAttendanceForShepherds[shepherd._id]
    );
  }, [shepherds, existingAttendanceForShepherds]);

  // Filter out members who already have attendance for the selected date
  const membersWithoutAttendance = React.useMemo(() => {
    if (!existingAttendanceForMembers || !membersForSelectedShepherd) {
      return membersForSelectedShepherd || [];
    }
    
    return membersForSelectedShepherd.filter(
      (member) => !existingAttendanceForMembers[member._id]
    );
  }, [membersForSelectedShepherd, existingAttendanceForMembers]);

  // Filter shepherds based on role
  const filteredShepherds = React.useMemo(() => {
    if (!shepherds || !canManageAll) return [];
    let filtered = shepherds;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [shepherds, searchQuery, canManageAll]);

  // Filter attendance records
  const filteredAttendance = React.useMemo(() => {
    if (!attendance) return [];
    let filtered = attendance;

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      const filterTimestamp = filterDate.getTime();
      const nextDayTimestamp = filterTimestamp + 24 * 60 * 60 * 1000;
      filtered = filtered.filter(
        (a) => a.date >= filterTimestamp && a.date < nextDayTimestamp
      );
    }

    // Apply approval status filter
    if (approvalFilter !== "all") {
      filtered = filtered.filter((a) => a.approvalStatus === approvalFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // Note: We'll need to join with member/user data for search
      // For now, just filter by date/status
    }

    return filtered;
  }, [attendance, dateFilter, approvalFilter, searchQuery]);

  // Handle mark attendance (new list-based version)
  const handleMarkAttendance = async () => {
    if (!token) return;

    // Validate that all non-present statuses have reasons
    const invalidRecords = memberAttendanceRecords.filter(
      (record) => record.status !== "present" && !record.reason.trim()
    );

    if (invalidRecords.length > 0) {
      toast.error("Please provide a reason for all non-present attendance statuses");
      return;
    }

    if (memberAttendanceRecords.length === 0) {
      toast.error("Please mark attendance for at least one member");
      return;
    }

    try {
      const selectedDate = dateFilter ? new Date(dateFilter).getTime() : Date.now();
      
      const records = memberAttendanceRecords.map((record) => ({
        memberId: record.memberId,
        date: selectedDate,
        attendanceStatus: record.status,
        notes: record.reason.trim() || undefined,
      }));

      const result = await bulkCreateAttendance({
        token,
        attendanceRecords: records,
        autoApprove: canManageAll,
      });

      if (result.errors && result.errors.length > 0) {
        const duplicateErrors = result.errors.filter((e: any) =>
          e.error?.includes("already marked")
        );
        const otherErrors = result.errors.filter(
          (e: any) => !e.error?.includes("already marked")
        );

        if (duplicateErrors.length > 0) {
          toast.error(
            `Attendance already marked for ${duplicateErrors.length} member(s). Please refresh to see updated list.`
          );
        }
        if (otherErrors.length > 0) {
          toast.error(
            `Failed to mark attendance for ${otherErrors.length} member(s): ${otherErrors[0].error}`
          );
        }
        if (result.created > 0) {
          toast.success(`Successfully marked attendance for ${result.created} member(s)`);
        }
      } else {
        toast.success(`Successfully marked attendance for ${records.length} member(s)`);
      }

      setMarkAttendanceDialogOpen(false);
      setSelectedShepherdForMarking("");
      setMemberAttendanceRecords([]);
    } catch (error: any) {
      if (error.message?.includes("already marked")) {
        toast.error("Some members already have attendance marked for this date. Please refresh the page.");
      } else {
        toast.error(error.message || "Failed to mark attendance");
      }
    }
  };

  // Update member attendance record
  const updateMemberAttendanceRecord = (
    memberId: Id<"members">,
    field: "status" | "reason",
    value: string
  ) => {
    setMemberAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.memberId === memberId);
      if (existing) {
        return prev.map((r) =>
          r.memberId === memberId
            ? { ...r, [field]: value }
            : r
        );
      } else {
        return [
          ...prev,
          {
            memberId,
            status: (field === "status" ? value : "present") as "present" | "absent" | "excused" | "late",
            reason: field === "reason" ? value : "",
          },
        ];
      }
    });
  };

  // Auto-select shepherd for non-admin users
  React.useEffect(() => {
    if (markAttendanceDialogOpen && !canManageAll && isShepherd && currentUser?._id) {
      setSelectedShepherdForMarking(currentUser._id);
    }
  }, [markAttendanceDialogOpen, canManageAll, isShepherd, currentUser]);

  // Initialize member records when shepherd is selected (only for members without attendance)
  React.useEffect(() => {
    if (selectedShepherdForMarking && membersWithoutAttendance.length > 0) {
      // Initialize only members without attendance with "present" status
      setMemberAttendanceRecords(
        membersWithoutAttendance.map((m) => ({
          memberId: m._id,
          status: "present" as const,
          reason: "",
        }))
      );
    } else {
      setMemberAttendanceRecords([]);
    }
  }, [selectedShepherdForMarking, membersWithoutAttendance]);

  // Initialize shepherd records when dialog opens
  React.useEffect(() => {
    if (markShepherdAttendanceDialogOpen && shepherdsWithoutAttendance.length > 0) {
      setShepherdAttendanceRecords(
        shepherdsWithoutAttendance.map((s) => ({
          userId: s._id,
          status: "present" as const,
          reason: "",
        }))
      );
    } else if (!markShepherdAttendanceDialogOpen) {
      setShepherdAttendanceRecords([]);
    }
  }, [markShepherdAttendanceDialogOpen, shepherdsWithoutAttendance]);

  // Update shepherd attendance record
  const updateShepherdAttendanceRecord = (
    userId: Id<"users">,
    field: "status" | "reason",
    value: string
  ) => {
    setShepherdAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.userId === userId);
      if (existing) {
        return prev.map((r) =>
          r.userId === userId
            ? { ...r, [field]: value }
            : r
        );
      } else {
        return [
          ...prev,
          {
            userId,
            status: (field === "status" ? value : "present") as "present" | "absent" | "excused" | "late",
            reason: field === "reason" ? value : "",
          },
        ];
      }
    });
  };

  // Update group attendance record
  const updateGroupAttendanceRecord = (
    memberId: Id<"members">,
    field: "status" | "reason",
    value: string
  ) => {
    setGroupAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.memberId === memberId);
      if (existing) {
        return prev.map((r) =>
          r.memberId === memberId ? { ...r, [field]: value } : r
        );
      }
      return [
        ...prev,
        {
          memberId,
          status: (field === "status" ? value : "present") as "present" | "absent" | "excused" | "late",
          reason: field === "reason" ? value : "",
        },
      ];
    });
  };

  // Initialize group records when group is selected
  React.useEffect(() => {
    if (selectedGroupForAttendance && groupMembersWithoutAttendance.length > 0) {
      setGroupAttendanceRecords(
        groupMembersWithoutAttendance.map((m) => ({
          memberId: m._id,
          status: "present" as const,
          reason: "",
        }))
      );
    } else {
      setGroupAttendanceRecords([]);
    }
  }, [selectedGroupForAttendance, groupMembersWithoutAttendance]);

  // Handle mark group attendance
  const handleMarkGroupAttendance = async () => {
    if (!token || !selectedGroupForAttendance) return;

    const invalidRecords = groupAttendanceRecords.filter(
      (r) => r.status !== "present" && !r.reason.trim()
    );
    if (invalidRecords.length > 0) {
      toast.error("Please provide a reason for all non-present attendance statuses");
      return;
    }
    if (groupAttendanceRecords.length === 0) {
      toast.error("Please mark attendance for at least one member");
      return;
    }

    try {
      const selectedDate = dateFilter ? new Date(dateFilter).getTime() : Date.now();
      const records = groupAttendanceRecords.map((r) => ({
        memberId: r.memberId,
        date: selectedDate,
        attendanceStatus: r.status,
        notes: r.reason.trim() || undefined,
      }));

      const result = await bulkCreateAttendance({
        token,
        groupId: selectedGroupForAttendance,
        attendanceRecords: records,
        autoApprove: canManageAll,
      });

      if (result.errors && result.errors.length > 0) {
        const firstError = result.errors[0];
        toast.error(firstError.error || "Some records failed");
        if (result.created > 0) {
          toast.success(`Marked ${result.created} of ${records.length} successfully`);
        }
      } else {
        toast.success(`Successfully marked attendance for ${records.length} member(s)`);
      }

      setMarkGroupAttendanceDialogOpen(false);
      setSelectedGroupForAttendance("");
      setGroupAttendanceRecords([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to mark attendance");
    }
  };

  // Handle mark shepherd attendance
  const handleMarkShepherdAttendance = async () => {
    if (!token) return;

    // Validate that all non-present statuses have reasons
    const invalidRecords = shepherdAttendanceRecords.filter(
      (record) => record.status !== "present" && !record.reason.trim()
    );

    if (invalidRecords.length > 0) {
      toast.error("Please provide a reason for all non-present attendance statuses");
      return;
    }

    if (shepherdAttendanceRecords.length === 0) {
      toast.error("No shepherds to mark attendance for");
      return;
    }

    try {
      const selectedDate = dateFilter ? new Date(dateFilter).getTime() : Date.now();

      const records = shepherdAttendanceRecords.map((record) => ({
        userId: record.userId,
        date: selectedDate,
        attendanceStatus: record.status,
        notes: record.reason.trim() || undefined,
      }));

      const result = await bulkCreateAttendance({
        token,
        attendanceRecords: records,
        autoApprove: true,
      });

      if (result.errors && result.errors.length > 0) {
        const duplicateErrors = result.errors.filter((e: any) =>
          e.error?.includes("already marked")
        );
        const otherErrors = result.errors.filter(
          (e: any) => !e.error?.includes("already marked")
        );

        if (duplicateErrors.length > 0) {
          toast.error(
            `Attendance already marked for ${duplicateErrors.length} shepherd(s) on this date.`
          );
        }
        if (otherErrors.length > 0) {
          toast.error(
            `Failed to mark attendance for ${otherErrors.length} shepherd(s): ${otherErrors[0].error}`
          );
        }
        if (result.created > 0) {
          toast.success(`Successfully marked attendance for ${result.created} shepherd(s)`);
        }
      } else {
        toast.success(`Successfully marked attendance for ${records.length} shepherd(s)`);
      }

      setMarkShepherdAttendanceDialogOpen(false);
      setShepherdAttendanceRecords([]);
    } catch (error: any) {
      if (error.message?.includes("already marked")) {
        toast.error("Some shepherds already have attendance marked for this date.");
      } else {
        toast.error(error.message || "Failed to mark shepherd attendance");
      }
    }
  };

  // Handle bulk mark attendance
  const handleBulkMarkAttendance = async () => {
    if (!token) return;

    try {
      const selectedDate = dateFilter ? new Date(dateFilter).getTime() : Date.now();
      const records: Array<{
        memberId?: Id<"members">;
        userId?: Id<"users">;
        date: number;
        attendanceStatus: "present" | "absent" | "excused" | "late";
        notes?: string;
      }> = [];

      if (selectedTab === "members") {
        selectedMembers.forEach((memberId) => {
          records.push({
            memberId,
            date: selectedDate,
            attendanceStatus,
            notes: attendanceNotes || undefined,
          });
        });
      } else if (selectedTab === "shepherds") {
        selectedShepherds.forEach((userId) => {
          records.push({
            userId,
            date: selectedDate,
            attendanceStatus,
            notes: attendanceNotes || undefined,
          });
        });
      }

      if (records.length === 0) {
        toast.error("Please select at least one person");
        return;
      }

      await bulkCreateAttendance({
        token,
        attendanceRecords: records,
        autoApprove: canManageAll,
      });

      toast.success(`Successfully marked attendance for ${records.length} person(s)`);
      setBulkMarkDialogOpen(false);
      setSelectedMembers(new Set());
      setSelectedShepherds(new Set());
      setAttendanceNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to mark attendance");
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!token || !recordToApprove) return;

    try {
      await approveAttendance({
        token,
        attendanceId: recordToApprove,
      });
      toast.success("Attendance approved");
      setApproveDialogOpen(false);
      setRecordToApprove(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve attendance");
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!token || !recordToReject || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      await rejectAttendance({
        token,
        attendanceId: recordToReject,
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Attendance rejected");
      setRejectDialogOpen(false);
      setRecordToReject(null);
      setRejectionReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject attendance");
    }
  };

  // Handle delete
  const handleDelete = async (recordId: Id<"attendance">) => {
    if (!token) return;

    try {
      await deleteAttendance({ token, attendanceId: recordId });
      toast.success("Attendance record deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete attendance");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!token || selectedRecords.size === 0) return;

    try {
      await bulkDeleteAttendance({
        token,
        attendanceIds: Array.from(selectedRecords),
      });
      toast.success(`Successfully deleted ${selectedRecords.size} record(s)`);
      setSelectedRecords(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to delete attendance records");
    }
  };

  // Get stats
  const stats = React.useMemo(() => {
    if (!attendance) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const tomorrowTimestamp = todayTimestamp + 24 * 60 * 60 * 1000;

    const todayAttendance = attendance.filter(
      (a) => a.date >= todayTimestamp && a.date < tomorrowTimestamp
    );

    return {
      total: attendance.length,
      pending: attendance.filter((a) => a.approvalStatus === "pending").length,
      approved: attendance.filter((a) => a.approvalStatus === "approved").length,
      rejected: attendance.filter((a) => a.approvalStatus === "rejected").length,
      todayTotal: todayAttendance.length,
      todayPresent: todayAttendance.filter((a) => a.attendanceStatus === "present").length,
      todayAbsent: todayAttendance.filter((a) => a.attendanceStatus === "absent").length,
    };
  }, [attendance]);

  if (!isClient || !token) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 sm:h-8 sm:w-8" />
            Attendance Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
          {isAdmin
            ? "Manage attendance for members and shepherds"
            : isPastor
              ? "Mark attendance for shepherds assigned to you only"
              : "Manage attendance for your assigned members"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <StatsCardSkeleton count={4} />
      ) : stats ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Records</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Today's Attendance</CardTitle>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.todayPresent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.todayTotal} total today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">
                {stats.rejected} rejected
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
            <TabsList className={`inline-flex w-full sm:w-auto min-w-full sm:min-w-0 ${isPastor ? "grid grid-cols-2" : isShepherd ? "grid grid-cols-3" : "grid grid-cols-4"} sm:inline-flex`}>
              {!isPastor && <TabsTrigger value="members" className="text-xs sm:text-sm flex-shrink-0">Members</TabsTrigger>}
              {isShepherd && <TabsTrigger value="groups" className="text-xs sm:text-sm flex-shrink-0">Groups</TabsTrigger>}
              {canManageAll && <TabsTrigger value="shepherds" className="text-xs sm:text-sm flex-shrink-0">Shepherds</TabsTrigger>}
              <TabsTrigger value="records" className="text-xs sm:text-sm flex-shrink-0">Records</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {selectedTab === "groups" && isShepherd && (
              <Button
                size="sm"
                onClick={() => {
                  setMarkGroupAttendanceDialogOpen(true);
                }}
                disabled={!groupsForAttendance || groupsForAttendance.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Mark Group Attendance
              </Button>
            )}
            {selectedTab === "members" && (
              <>
                <Dialog open={markAttendanceDialogOpen} onOpenChange={(open) => {
                  setMarkAttendanceDialogOpen(open);
                  if (!open) {
                    setSelectedShepherdForMarking("");
                    setMemberAttendanceRecords([]);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden xs:inline">Mark Attendance</span>
                      <span className="xs:hidden">Mark</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Mark Attendance for Members</DialogTitle>
                      <DialogDescription>
                        Select a shepherd and mark attendance for all their members
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                        />
                      </div>
                      {canManageAll ? (
                        <div className="space-y-2">
                          <Label>Shepherd</Label>
                          <Select
                            value={selectedShepherdForMarking || ""}
                            onValueChange={(value) => setSelectedShepherdForMarking(value as Id<"users"> | "")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a shepherd" />
                            </SelectTrigger>
                            <SelectContent>
                              {shepherds?.map((shepherd) => (
                                <SelectItem key={shepherd._id} value={shepherd._id}>
                                  {shepherd.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : isShepherd && currentUser?._id ? (
                        <div className="space-y-2">
                          <Label>Shepherd</Label>
                          <Input
                            value={shepherds?.find((s) => s._id === currentUser._id)?.name || currentUser.name || "You"}
                            disabled
                          />
                        </div>
                      ) : null}
                      {(selectedShepherdForMarking || (isShepherd && currentUser?._id)) && membersForSelectedShepherd.length > 0 && (
                        <div className="space-y-4">
                          {/* Show members who already have attendance */}
                          {existingAttendanceForMembers && Object.keys(existingAttendanceForMembers).length > 0 && (
                            <div className="border rounded-lg p-4 bg-muted/50">
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-base font-semibold text-muted-foreground">
                                  Already Marked ({Object.keys(existingAttendanceForMembers).length})
                                </Label>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {membersForSelectedShepherd
                                  .filter((m) => existingAttendanceForMembers[m._id])
                                  .map((member) => {
                                    const existingRecord = existingAttendanceForMembers[member._id];
                                    return (
                                      <div
                                        key={member._id}
                                        className="flex items-center justify-between p-2 bg-background rounded text-sm gap-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <MemberPhotoCell
                                            memberId={member._id}
                                            photoId={member.profilePhotoId}
                                            firstName={member.firstName}
                                            lastName={member.lastName}
                                            token={token}
                                          />
                                          <span>
                                            {member.firstName} {member.lastName} ({member.customId || "N/A"})
                                          </span>
                                        </div>
                                        <Badge {...getStatusBadgeProps(existingRecord.attendanceStatus)}>
                                          {existingRecord.attendanceStatus}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Show members without attendance for marking */}
                          {membersWithoutAttendance.length > 0 && (
                            <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-base font-semibold">
                                  Mark Attendance ({membersWithoutAttendance.length})
                                </Label>
                              </div>
                              <div className="space-y-3">
                                {membersWithoutAttendance.map((member) => {
                                  const record = memberAttendanceRecords.find((r) => r.memberId === member._id);
                                  const status = record?.status || "present";
                                  const reason = record?.reason || "";
                                  const needsReason = status !== "present";

                                  return (
                                    <div
                                      key={member._id}
                                      className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-muted/30"
                                    >
                                      <div className="md:col-span-3 flex items-center gap-3">
                                        <MemberPhotoCell
                                          memberId={member._id}
                                          photoId={member.profilePhotoId}
                                          firstName={member.firstName}
                                          lastName={member.lastName}
                                          token={token}
                                        />
                                        <div className="flex flex-col justify-center">
                                          <div className="font-medium">
                                            {member.firstName} {member.lastName}
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {member.customId || "N/A"}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="md:col-span-3">
                                        <Label className="text-xs">Status</Label>
                                        <Select
                                          value={status}
                                          onValueChange={(value) =>
                                            updateMemberAttendanceRecord(
                                              member._id,
                                              "status",
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="present">Present</SelectItem>
                                            <SelectItem value="absent">Absent</SelectItem>
                                            <SelectItem value="excused">Excused</SelectItem>
                                            <SelectItem value="late">Late</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="md:col-span-6">
                                        <Label className="text-xs">
                                          Reason {needsReason && <span className="text-destructive">*</span>}
                                        </Label>
                                        <Textarea
                                          value={reason}
                                          onChange={(e) =>
                                            updateMemberAttendanceRecord(
                                              member._id,
                                              "reason",
                                              e.target.value
                                            )
                                          }
                                          placeholder={needsReason ? "Required for this status" : "Optional"}
                                          className={needsReason && !reason.trim() ? "border-destructive" : ""}
                                          rows={2}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Show message if all members already have attendance */}
                          {membersWithoutAttendance.length === 0 && existingAttendanceForMembers && Object.keys(existingAttendanceForMembers).length > 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/50">
                              All members already have attendance marked for this date
                            </div>
                          )}
                        </div>
                      )}
                      {(selectedShepherdForMarking || (isShepherd && currentUser?._id)) && membersForSelectedShepherd.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No active members found for this shepherd
                        </div>
                      )}
                      {!selectedShepherdForMarking && !(isShepherd && currentUser?._id) && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {canManageAll ? "Please select a shepherd to view members" : "Loading members..."}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setMarkAttendanceDialogOpen(false);
                            setSelectedShepherdForMarking("");
                            setMemberAttendanceRecords([]);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleMarkAttendance}
                          disabled={
                            (!selectedShepherdForMarking && !(isShepherd && currentUser?._id)) ||
                            memberAttendanceRecords.length === 0 ||
                            membersWithoutAttendance.length === 0
                          }
                        >
                          Mark Attendance ({memberAttendanceRecords.length})
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={bulkMarkDialogOpen} onOpenChange={setBulkMarkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      <span className="hidden xs:inline">Bulk Mark</span>
                      <span className="xs:hidden">Bulk</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Bulk Mark Attendance</DialogTitle>
                      <DialogDescription>
                        Mark attendance for multiple {selectedTab === "members" ? "members" : "shepherds"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={attendanceStatus}
                          onValueChange={(v) =>
                            setAttendanceStatus(v as "present" | "absent" | "excused" | "late")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          value={attendanceNotes}
                          onChange={(e) => setAttendanceNotes(e.target.value)}
                          placeholder="Add any notes..."
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedTab === "members"
                          ? `${selectedMembers.size} member(s) selected`
                          : `${selectedShepherds.size} shepherd(s) selected`}
                      </div>
                      <Button onClick={handleBulkMarkAttendance} className="w-full">
                        Mark Attendance for Selected
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {selectedTab === "records" && selectedRecords.size > 0 && (
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="w-full sm:w-auto">
                <span className="hidden xs:inline">Delete Selected ({selectedRecords.size})</span>
                <span className="xs:hidden">Delete ({selectedRecords.size})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Members Tab - hidden for pastors (they can only mark shepherd attendance) */}
        {!isPastor && (
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Members</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {isAdmin
                      ? "Select members to mark attendance"
                      : "Select your members to mark attendance"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-full sm:w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton columns={5} rows={5} showCheckbox={true} />
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No members found
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredMembers.length > 0 &&
                            filteredMembers.every((m) => selectedMembers.has(m._id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMembers(new Set(filteredMembers.map((m) => m._id)));
                            } else {
                              setSelectedMembers(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Photo</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMembers.has(member._id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedMembers);
                              if (checked) {
                                newSet.add(member._id);
                              } else {
                                newSet.delete(member._id);
                              }
                              setSelectedMembers(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <MemberPhotoCell
                            memberId={member._id}
                            photoId={member.profilePhotoId}
                            firstName={member.firstName}
                            lastName={member.lastName}
                            token={token}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {member.customId || "N/A"}
                        </TableCell>
                        <TableCell>
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell>{member.phone || "N/A"}</TableCell>
                        <TableCell>{member.email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.status || "N/A"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Groups Tab - shepherds only */}
        {isShepherd && (
        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-lg sm:text-xl">Groups</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Take attendance for group members on their meeting day. Select a group and mark attendance for members.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {!groupsForAttendance || groupsForAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No groups available</p>
                  <p className="text-sm mt-1">
                    Create groups with a meeting day and add members at{" "}
                    <a href="/dashboard/groups" className="text-primary underline">Groups</a>.
                    Leaders can then take attendance for members on the meeting day.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupsForAttendance.map((group) => {
                    const meetingDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const meetingDayLabel = group.meetingDay !== undefined && group.meetingDay !== null
                      ? meetingDays[group.meetingDay]
                      : "Not set";
                    return (
                      <Card key={group._id} className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                          setSelectedGroupForAttendance(group._id);
                          setMarkGroupAttendanceDialogOpen(true);
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{group.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>{meetingDayLabel}</span>
                            <span>•</span>
                            <span>{group.memberCount || 0} members</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Button size="sm" variant="outline" className="w-full">
                            Mark Attendance
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Shepherds Tab */}
        {canManageAll && (
          <TabsContent value="shepherds" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Shepherds</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Select shepherds to mark attendance</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setMarkShepherdAttendanceDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Mark Shepherd Attendance
                    </Button>
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search shepherds..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full sm:w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableSkeleton columns={4} rows={5} showCheckbox={true} />
                ) : filteredShepherds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No shepherds found
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              filteredShepherds.length > 0 &&
                              filteredShepherds.every((s) => selectedShepherds.has(s._id))
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedShepherds(new Set(filteredShepherds.map((s) => s._id)));
                              } else {
                                setSelectedShepherds(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Zone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShepherds.map((shepherd) => (
                        <TableRow key={shepherd._id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedShepherds.has(shepherd._id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedShepherds);
                                if (checked) {
                                  newSet.add(shepherd._id);
                                } else {
                                  newSet.delete(shepherd._id);
                                }
                                setSelectedShepherds(newSet);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <UserPhotoCell
                              userId={shepherd._id}
                              photoId={shepherd.profilePhotoId}
                              name={shepherd.name}
                              token={token}
                            />
                          </TableCell>
                          <TableCell>{shepherd.name}</TableCell>
                          <TableCell>{shepherd.email}</TableCell>
                          <TableCell>{shepherd.phone || "N/A"}</TableCell>
                          <TableCell>—</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Attendance Records</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">View and manage attendance records</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-full sm:w-64"
                    />
                  </div>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full sm:w-40"
                  />
                  <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton columns={7} rows={5} showCheckbox={true} />
              ) : filteredAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No attendance records found
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredAttendance.length > 0 &&
                            filteredAttendance.every((r) => selectedRecords.has(r._id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRecords(
                                new Set(filteredAttendance.map((r) => r._id))
                              );
                            } else {
                              setSelectedRecords(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Notes</TableHead>
                      {canManageAll && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => {
                      // Get member or user data
                      const member = record.memberId ? members?.find((m) => m._id === record.memberId) : null;
                      const user = record.userId ? shepherds?.find((u) => u._id === record.userId) : null;
                      
                      return (
                        <TableRow key={record._id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRecords.has(record._id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedRecords);
                                if (checked) {
                                  newSet.add(record._id);
                                } else {
                                  newSet.delete(record._id);
                                }
                                setSelectedRecords(newSet);
                              }}
                            />
                          </TableCell>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            {member ? (
                              <MemberPhotoCell
                                memberId={member._id}
                                photoId={member.profilePhotoId}
                                firstName={member.firstName}
                                lastName={member.lastName}
                                token={token}
                              />
                            ) : user ? (
                              <UserPhotoCell
                                userId={user._id}
                                photoId={user.profilePhotoId}
                                name={user.name}
                                token={token}
                              />
                            ) : (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-muted text-xs">?</AvatarFallback>
                              </Avatar>
                            )}
                          </TableCell>
                          <TableCell>
                            {member
                              ? `${member.firstName} ${member.lastName}`
                              : user
                              ? user.name
                              : "Unknown"}
                          </TableCell>
                          <TableCell>
                            {record.memberId ? (
                              <Badge variant="outline">Member</Badge>
                            ) : (
                              <Badge variant="outline">Shepherd</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge {...getStatusBadgeProps(record.attendanceStatus)}>
                              {record.attendanceStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge {...getApprovalBadgeProps(record.approvalStatus)}>
                              {record.approvalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(record.submittedAt)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {record.notes || "-"}
                          </TableCell>
                          {canManageAll && (
                            <TableCell>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                                {record.approvalStatus === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setRecordToApprove(record._id);
                                        setApproveDialogOpen(true);
                                      }}
                                      className="w-full sm:w-auto"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setRecordToReject(record._id);
                                        setRejectDialogOpen(true);
                                      }}
                                      className="w-full sm:w-auto"
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {(record.approvalStatus === "pending" ||
                                  (record.approvalStatus === "approved" && isAdmin)) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(record._id)}
                                    className="w-full sm:w-auto"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mark Group Attendance Dialog */}
      <Dialog
        open={markGroupAttendanceDialogOpen}
        onOpenChange={(open) => {
          setMarkGroupAttendanceDialogOpen(open);
          if (!open) {
            setSelectedGroupForAttendance("");
            setGroupAttendanceRecords([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Group Attendance</DialogTitle>
            <DialogDescription>
              Select a group and take attendance for members on the group&apos;s meeting day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group</Label>
              <Select
                value={selectedGroupForAttendance || ""}
                onValueChange={(v) => setSelectedGroupForAttendance(v as Id<"groups"> | "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groupsForAttendance?.map((g) => {
                    const meetingDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const dayLabel = g.meetingDay !== undefined && g.meetingDay !== null ? meetingDays[g.meetingDay] : "";
                    return (
                      <SelectItem key={g._id} value={g._id}>
                        {g.name} ({dayLabel})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              {selectedGroupForAttendance && groupsForAttendance && (
                <p className="text-xs text-muted-foreground">
                  This group meets on {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][groupsForAttendance.find((g) => g._id === selectedGroupForAttendance)?.meetingDay ?? 0] || "—"}. Select that day to take attendance.
                </p>
              )}
            </div>
            {selectedGroupForAttendance && (
              <>
                {existingAttendanceForGroupMembers && Object.keys(existingAttendanceForGroupMembers).length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <Label className="text-base font-semibold text-muted-foreground">
                      Already Marked ({Object.keys(existingAttendanceForGroupMembers).length})
                    </Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto mt-2">
                      {groupMembersList
                        .filter((m) => existingAttendanceForGroupMembers[m._id])
                        .map((member) => {
                          const rec = existingAttendanceForGroupMembers[member._id];
                          return (
                            <div key={member._id} className="flex items-center justify-between p-2 bg-background rounded text-sm">
                              <span>{member.firstName} {member.lastName}</span>
                              <Badge {...getStatusBadgeProps(rec.attendanceStatus)}>{rec.attendanceStatus}</Badge>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                {groupMembersWithoutAttendance.length > 0 && (
                  <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                    <Label className="text-base font-semibold">Mark Attendance ({groupMembersWithoutAttendance.length})</Label>
                    <div className="space-y-3 mt-3">
                      {groupMembersWithoutAttendance.map((member) => {
                        const record = groupAttendanceRecords.find((r) => r.memberId === member._id);
                        const status = record?.status || "present";
                        const reason = record?.reason || "";
                        const needsReason = status !== "present";
                        return (
                          <div key={member._id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-muted/30">
                            <div className="md:col-span-3 flex items-center gap-3">
                              <MemberPhotoCell memberId={member._id} photoId={member.profilePhotoId} firstName={member.firstName} lastName={member.lastName} token={token} />
                              <div>
                                <div className="font-medium">{member.firstName} {member.lastName}</div>
                                <div className="text-sm text-muted-foreground">{member.customId || "N/A"}</div>
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <Label className="text-xs">Status</Label>
                              <Select value={status} onValueChange={(v) => updateGroupAttendanceRecord(member._id, "status", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present">Present</SelectItem>
                                  <SelectItem value="absent">Absent</SelectItem>
                                  <SelectItem value="excused">Excused</SelectItem>
                                  <SelectItem value="late">Late</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-6">
                              <Label className="text-xs">Reason {needsReason && <span className="text-destructive">*</span>}</Label>
                              <Textarea value={reason} onChange={(e) => updateGroupAttendanceRecord(member._id, "reason", e.target.value)} placeholder={needsReason ? "Required" : "Optional"} rows={2} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {groupMembersWithoutAttendance.length === 0 && existingAttendanceForGroupMembers && Object.keys(existingAttendanceForGroupMembers).length > 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/50">
                    All members already have attendance marked for this date
                  </div>
                )}
              </>
            )}
            {selectedGroupForAttendance && groupMembersList.length === 0 && !groupMembers && (
              <div className="text-center py-4 text-muted-foreground text-sm">Loading members...</div>
            )}
            {selectedGroupForAttendance && groupMembers && groupMembersList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No members in this group. Add members in the Groups page.</div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setMarkGroupAttendanceDialogOpen(false); setSelectedGroupForAttendance(""); setGroupAttendanceRecords([]); }}>
                Cancel
              </Button>
              <Button onClick={handleMarkGroupAttendance} disabled={!selectedGroupForAttendance || groupAttendanceRecords.length === 0 || groupMembersWithoutAttendance.length === 0}>
                Mark Attendance ({groupAttendanceRecords.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Shepherd Attendance Dialog */}
      {canManageAll && (
        <Dialog
          open={markShepherdAttendanceDialogOpen}
          onOpenChange={(open) => {
            setMarkShepherdAttendanceDialogOpen(open);
            if (!open) {
              setShepherdAttendanceRecords([]);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mark Attendance for Shepherds</DialogTitle>
              <DialogDescription>
                Mark attendance for all shepherds at once
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              {/* Show shepherds who already have attendance */}
              {existingAttendanceForShepherds && Object.keys(existingAttendanceForShepherds).length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold text-muted-foreground">
                      Already Marked ({Object.keys(existingAttendanceForShepherds).length})
                    </Label>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {shepherds
                      ?.filter((s) => existingAttendanceForShepherds[s._id])
                      .map((shepherd) => {
                        const existingRecord = existingAttendanceForShepherds[shepherd._id];
                        return (
                          <div
                            key={shepherd._id}
                            className="flex items-center justify-between p-2 bg-background rounded text-sm gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <UserPhotoCell
                                userId={shepherd._id}
                                photoId={shepherd.profilePhotoId}
                                name={shepherd.name}
                                token={token}
                              />
                              <span>{shepherd.name}</span>
                            </div>
                            <Badge {...getStatusBadgeProps(existingRecord.attendanceStatus)}>
                              {existingRecord.attendanceStatus}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Show shepherds without attendance for marking */}
              {shepherdsWithoutAttendance.length > 0 && (
                <div className="border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">
                      Mark Attendance ({shepherdsWithoutAttendance.length})
                    </Label>
                  </div>
                  <div className="space-y-3">
                    {shepherdsWithoutAttendance.map((shepherd) => {
                      const record = shepherdAttendanceRecords.find((r) => r.userId === shepherd._id);
                      const status = record?.status || "present";
                      const reason = record?.reason || "";
                      const needsReason = status !== "present";

                      return (
                        <div
                          key={shepherd._id}
                          className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="md:col-span-3 flex items-center gap-3">
                            <UserPhotoCell
                              userId={shepherd._id}
                              photoId={shepherd.profilePhotoId}
                              name={shepherd.name}
                              token={token}
                            />
                            <div className="flex flex-col justify-center">
                              <div className="font-medium">{shepherd.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {shepherd.email}
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-3">
                            <Label className="text-xs">Status</Label>
                            <Select
                              value={status}
                              onValueChange={(value) =>
                                updateShepherdAttendanceRecord(
                                  shepherd._id,
                                  "status",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="excused">Excused</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-6">
                            <Label className="text-xs">
                              Reason {needsReason && <span className="text-destructive">*</span>}
                            </Label>
                            <Textarea
                              value={reason}
                              onChange={(e) =>
                                updateShepherdAttendanceRecord(
                                  shepherd._id,
                                  "reason",
                                  e.target.value
                                )
                              }
                              placeholder={needsReason ? "Required for this status" : "Optional"}
                              className={needsReason && !reason.trim() ? "border-destructive" : ""}
                              rows={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show message if all shepherds already have attendance */}
              {shepherdsWithoutAttendance.length === 0 && existingAttendanceForShepherds && Object.keys(existingAttendanceForShepherds).length > 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-muted/50">
                  All shepherds already have attendance marked for this date
                </div>
              )}

              {!shepherds || shepherds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No shepherds found
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMarkShepherdAttendanceDialogOpen(false);
                    setShepherdAttendanceRecords([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkShepherdAttendance}
                  disabled={shepherdAttendanceRecords.length === 0 || shepherdsWithoutAttendance.length === 0}
                >
                  Mark Attendance ({shepherdAttendanceRecords.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Attendance</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this attendance record?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>Approve</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Attendance</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this attendance record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
