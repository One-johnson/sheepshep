"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CalendarCheck,
  Pencil,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

const MEETING_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const MEMBER_STATUSES = [
  { value: "new_convert", label: "New Convert" },
  { value: "first_timer", label: "First Timer" },
  { value: "established", label: "Established" },
  { value: "visitor", label: "Visitor" },
  { value: "inactive", label: "Inactive" },
];

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as Id<"groups">;

  const [token, setToken] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<Id<"members"> | null>(null);
  const [markAttendanceDialogOpen, setMarkAttendanceDialogOpen] = React.useState(false);
  const [attendanceDate, setAttendanceDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [attendanceRecords, setAttendanceRecords] = React.useState<
    Array<{ memberId: Id<"members">; status: "present" | "absent" | "excused" | "late"; reason: string }>
  >([]);

  React.useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem("authToken"));
  }, []);

  const currentUser = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");
  const group = useQuery(api.groups.getById, token && groupId ? { token, groupId } : "skip");
  const groupMembers = useQuery(
    api.groups.getMembers,
    token && groupId ? { token, groupId } : "skip"
  );
  const members = groupMembers?.map((gm) => gm.member).filter(Boolean) ?? [];

  const updateGroup = useMutation(api.groups.update);
  const removeMember = useMutation(api.groups.removeMember);
  const updateMember = useMutation(api.members.update);
  const bulkCreateAttendance = useMutation(api.attendance.bulkCreate);

  const selectedDateTimestamp = React.useMemo(() => {
    if (!attendanceDate) return null;
    const d = new Date(attendanceDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [attendanceDate]);

  const existingAttendance = useQuery(
    api.attendance.checkExistingAttendance,
    token && selectedDateTimestamp && members.length > 0 && groupId
      ? { token, memberIds: members.map((m) => m!._id), date: selectedDateTimestamp, groupId }
      : "skip"
  );

  const membersWithoutAttendance = React.useMemo(() => {
    if (!existingAttendance || !members) return members.filter(Boolean);
    return members.filter((m) => m && !existingAttendance[m._id]) as NonNullable<(typeof members)[number]>[];
  }, [members, existingAttendance]);

  React.useEffect(() => {
    if (group) {
      setEditName(group.name);
      setEditDescription(group.description || "");
    }
  }, [group]);

  React.useEffect(() => {
    if (markAttendanceDialogOpen && membersWithoutAttendance.length > 0) {
      setAttendanceRecords(
        membersWithoutAttendance.map((m) => ({
          memberId: m._id,
          status: "present" as const,
          reason: "",
        }))
      );
    } else if (!markAttendanceDialogOpen) {
      setAttendanceRecords([]);
    }
  }, [markAttendanceDialogOpen, membersWithoutAttendance]);

  const updateAttendanceRecord = (memberId: Id<"members">, field: "status" | "reason", value: string) => {
    setAttendanceRecords((prev) => {
      const existing = prev.find((r) => r.memberId === memberId);
      if (existing) {
        return prev.map((r) => (r.memberId === memberId ? { ...r, [field]: value } : r));
      }
      return [...prev, { memberId, status: (field === "status" ? value : "present") as "present" | "absent" | "excused" | "late", reason: field === "reason" ? value : "" }];
    });
  };

  const handleSaveEdit = async () => {
    if (!token || !groupId) return;
    try {
      await updateGroup({ token, groupId, name: editName, description: editDescription || undefined });
      toast.success("Group updated");
      setEditDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
  };

  const handleRemoveMember = async () => {
    if (!token || !groupId || !memberToRemove) return;
    try {
      await removeMember({ token, groupId, memberId: memberToRemove });
      toast.success("Member removed from group");
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove");
    }
  };

  const handleStatusChange = async (memberId: Id<"members">, status: string) => {
    if (!token) return;
    const member = members.find((m) => m?._id === memberId);
    if (!member) return;
    try {
      await updateMember({
        token,
        memberId,
        status: status as "new_convert" | "first_timer" | "established" | "visitor" | "inactive",
      });
      toast.success("Member status updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const handleMarkAttendance = async () => {
    if (!token || !groupId) return;
    const invalid = attendanceRecords.filter((r) => r.status !== "present" && !r.reason.trim());
    if (invalid.length > 0) {
      toast.error("Provide a reason for non-present statuses");
      return;
    }
    if (attendanceRecords.length === 0) {
      toast.error("Mark at least one member");
      return;
    }
    try {
      const dateTs = attendanceDate ? new Date(attendanceDate).getTime() : Date.now();
      const result = await bulkCreateAttendance({
        token,
        groupId,
        attendanceRecords: attendanceRecords.map((r) => ({
          memberId: r.memberId,
          date: dateTs,
          attendanceStatus: r.status,
          notes: r.reason.trim() || undefined,
        })),
      });
      if (result.errors?.length) {
        toast.error(result.errors[0].error);
        if (result.created > 0) toast.success(`Marked ${result.created} successfully`);
      } else {
        toast.success(`Marked attendance for ${attendanceRecords.length} members`);
      }
      setMarkAttendanceDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark attendance");
    }
  };

  if (!isClient || !token) return <div className="p-6">Loading...</div>;

  const isLeader = group?.leaderId === currentUser?._id;
  const isAdmin = currentUser?.role === "admin";
  const canManage = isLeader || isAdmin;

  if (!group) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="link" onClick={() => router.push("/dashboard/groups")}>
          Back to Groups
        </Button>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">You don&apos;t have access to this group</p>
        <Button variant="link" onClick={() => router.push("/dashboard/groups")}>
          Back to Groups
        </Button>
      </div>
    );
  }

  const meetingDayLabel = group.meetingDay !== undefined && group.meetingDay !== null
    ? MEETING_DAYS.find((d) => d.value === group.meetingDay)?.label
    : "Not set";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {group.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Meets {meetingDayLabel}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {isLeader && (
                <Button size="sm" onClick={() => setMarkAttendanceDialogOpen(true)}>
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {group.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>Group members - remove or change status</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No members in this group</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member!._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {member!.firstName[0]}
                              {member!.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member!.firstName} {member!.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member!.phone || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={member!.status || ""}
                          onValueChange={(v) => handleStatusChange(member!._id, v)}
                          disabled={!canManage}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMemberToRemove(member!._id);
                              setRemoveMemberDialogOpen(true);
                            }}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Shepherds can edit name and description only</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Remove this member from the group. They can be re-added by admin when the group leader is changed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRemoveMemberDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember}>Remove</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={markAttendanceDialogOpen} onOpenChange={setMarkAttendanceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Group Attendance</DialogTitle>
            <DialogDescription>
              Take attendance for {meetingDayLabel}. Select the meeting date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>
            {existingAttendance && Object.keys(existingAttendance).length > 0 && (
              <div className="border rounded p-3 bg-muted/50">
                <p className="text-sm font-medium text-muted-foreground">Already marked ({Object.keys(existingAttendance).length})</p>
              </div>
            )}
            {membersWithoutAttendance.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-sm font-medium">Mark ({membersWithoutAttendance.length})</p>
                {membersWithoutAttendance.map((m) => {
                  const rec = attendanceRecords.find((r) => r.memberId === m._id);
                  const status = rec?.status || "present";
                  const reason = rec?.reason || "";
                  return (
                    <div key={m._id} className="flex items-center gap-4 p-2 border rounded">
                      <span className="flex-1">{m.firstName} {m.lastName}</span>
                      <Select value={status} onValueChange={(v) => updateAttendanceRecord(m._id, "status", v)}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="excused">Excused</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                        </SelectContent>
                      </Select>
                      {status !== "present" && (
                        <Input
                          placeholder="Reason"
                          value={reason}
                          onChange={(e) => updateAttendanceRecord(m._id, "reason", e.target.value)}
                          className="flex-1"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {membersWithoutAttendance.length === 0 && existingAttendance && Object.keys(existingAttendance).length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">All members have attendance for this date</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMarkAttendanceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleMarkAttendance} disabled={attendanceRecords.length === 0}>
                Mark ({attendanceRecords.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
