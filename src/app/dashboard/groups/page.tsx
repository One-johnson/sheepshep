"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
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
import { Users, Plus, ArrowLeft, Search, Calendar } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useAuth } from "@/contexts/auth-context";

const MEETING_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function GroupsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newMeetingDay, setNewMeetingDay] = React.useState<number>(0);
  const [newDescription, setNewDescription] = React.useState("");
  const [newLeaderId, setNewLeaderId] = React.useState<Id<"users"> | "">("");

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const currentUser = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");
  const groups = useQuery(api.groups.list, token ? { token } : "skip");
  const shepherds = useQuery(
    api.attendance.getShepherds,
    token && currentUser?.role === "admin" ? { token } : "skip"
  );

  const createGroup = useMutation(api.groups.create);

  const filteredGroups = React.useMemo(() => {
    if (!groups) return [];
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  const handleCreateGroup = async () => {
    if (!token || !newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (!newLeaderId) {
      toast.error("Please select a shepherd as group leader");
      return;
    }

    try {
      await createGroup({
        token,
        name: newGroupName.trim(),
        meetingDay: newMeetingDay,
        description: newDescription.trim() || undefined,
        leaderId: newLeaderId,
      });
      toast.success("Group created. Shepherd's members have been added automatically.");
      setCreateDialogOpen(false);
      setNewGroupName("");
      setNewMeetingDay(0);
      setNewDescription("");
      setNewLeaderId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create group");
    }
  };

  if (!isClient || !token) {
    return <div className="p-6">Loading...</div>;
  }

  const isAdmin = currentUser?.role === "admin";
  const canCreateGroup = isAdmin;

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
            <Users className="h-6 w-6 sm:h-8 sm:w-8" />
            Groups
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isAdmin
              ? "Create groups with a meeting day and assign shepherds. Leaders take attendance for members on the meeting day."
              : "Groups assigned to you. Take attendance for members on their meeting day."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">{isAdmin ? "All Groups" : "My Groups"}</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Groups with a meeting day allow leaders to take attendance for members"
                  : "Groups you lead. Take attendance for members on their meeting day."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canCreateGroup && (
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              )}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groups === undefined ? (
            <TableSkeleton columns={4} rows={5} />
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{canCreateGroup ? "No groups yet" : "No groups assigned"}</p>
              <p className="text-sm mt-1">
                {canCreateGroup
                  ? "Create a group and assign a meeting day. Members belonging to the shepherd will be added automatically."
                  : "Contact an admin to have groups assigned to you."}
              </p>
              {canCreateGroup && (
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Meeting Day</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow
                      key={group._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/groups/${group._id}`)}
                    >
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        {group.meetingDay !== undefined && group.meetingDay !== null ? (
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {MEETING_DAYS.find((d) => d.value === group.meetingDay)?.label || "Not set"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.isActive ? "default" : "secondary"}>
                          {group.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Create a group and set its meeting day. Leaders can take attendance for members on the meeting day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Zone A Bacenta"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Shepherd as Leader</Label>
              <Select value={newLeaderId || ""} onValueChange={(v) => setNewLeaderId(v as Id<"users"> | "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a shepherd" />
                </SelectTrigger>
                <SelectContent>
                  {shepherds?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} {s.email ? `(${s.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Members belonging to this shepherd will be automatically added to the group
              </p>
            </div>
            <div className="space-y-2">
              <Label>Meeting Day</Label>
              <Select value={String(newMeetingDay)} onValueChange={(v) => setNewMeetingDay(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_DAYS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Shepherd can take attendance for group members on this day
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || !newLeaderId}>
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
