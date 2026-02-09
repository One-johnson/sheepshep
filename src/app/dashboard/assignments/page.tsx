"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Building2,
  UserCog,
  History,
  Download,
  Upload,
  UserPlus,
  Heart,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export default function AssignmentsPage() {
  const [token, setToken] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem("authToken"));
  }, []);
  
  // Queries
  const stats = useQuery(
    api.userAssignments.getStats,
    token ? { token } : "skip"
  );
  const hierarchy = useQuery(
    api.userAssignments.getHierarchy,
    token ? { token } : "skip"
  );
  const pastors = useQuery(
    api.userAssignments.getPastors,
    token ? { token } : "skip"
  );
  const allZones = useQuery(
    api.userAssignments.getAllZones,
    token ? { token } : "skip"
  );
  
  // Member assignment queries
  const members = useQuery(
    api.members.list,
    token ? { token, isActive: true } : "skip"
  );
  const memberStats = useQuery(
    api.memberAssignments.getMemberAssignmentStats,
    token ? { token } : "skip"
  );

  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPastorFilter, setSelectedPastorFilter] = React.useState<string>("all");
  const [selectedZoneFilter, setSelectedZoneFilter] = React.useState<string>("all");
  const [showUnassignedOnly, setShowUnassignedOnly] = React.useState(false);
  const [selectedShepherds, setSelectedShepherds] = React.useState<Set<Id<"users">>>(new Set());
  
  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = React.useState(false);
  const [zoneAssignDialogOpen, setZoneAssignDialogOpen] = React.useState(false);
  const [supervisedZonesDialogOpen, setSupervisedZonesDialogOpen] = React.useState(false);
  const [selectedPastorForAssign, setSelectedPastorForAssign] = React.useState<Id<"users"> | "">("");
  const [selectedShepherdForAssign, setSelectedShepherdForAssign] = React.useState<Id<"users"> | "">("");
  const [selectedZone, setSelectedZone] = React.useState("");
  const [selectedSupervisedZones, setSelectedSupervisedZones] = React.useState<string[]>([]);
  const [selectedPastorForZones, setSelectedPastorForZones] = React.useState<Id<"users"> | "">("");
  
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

  // Mutations
  const assignShepherd = useMutation(api.userAssignments.assignShepherdToPastor);
  const unassignShepherd = useMutation(api.userAssignments.unassignShepherd);
  const bulkAssignShepherds = useMutation(api.userAssignments.bulkAssignShepherds);
  const assignZone = useMutation(api.userAssignments.assignZoneToShepherd);
  const assignSupervisedZones = useMutation(api.userAssignments.assignSupervisedZonesToPastor);
  
  // Member assignment mutations
  const assignMember = useMutation(api.memberAssignments.assignMemberToShepherd);
  const bulkAssignMembers = useMutation(api.memberAssignments.bulkAssignMembers);
  const createTaskAssignment = useMutation(api.assignments.create);

  // Get filtered shepherds
  const shepherdsQuery = useQuery(
    api.userAssignments.getShepherds,
    token
      ? {
          token,
          pastorId:
            selectedPastorFilter !== "all"
              ? (selectedPastorFilter as Id<"users">)
              : undefined,
          zone: selectedZoneFilter !== "all" ? selectedZoneFilter : undefined,
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

  // Handle zone assignment
  const handleAssignZone = async (shepherdId: Id<"users">, zone: string) => {
    try {
      await assignZone({
        token: token!,
        shepherdId,
        zone,
      });
      toast.success("Zone assigned successfully");
      setZoneAssignDialogOpen(false);
      setSelectedZone("");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign zone");
    }
  };

  // Handle supervised zones assignment
  const handleAssignSupervisedZones = async () => {
    if (!selectedPastorForZones) {
      toast.error("Please select a pastor");
      return;
    }

    try {
      await assignSupervisedZones({
        token: token!,
        pastorId: selectedPastorForZones as Id<"users">,
        zones: selectedSupervisedZones,
      });
      toast.success("Supervised zones assigned successfully");
      setSupervisedZonesDialogOpen(false);
      setSelectedSupervisedZones([]);
      setSelectedPastorForZones("");
    } catch (error: any) {
      toast.error(error.message || "Failed to assign supervised zones");
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
      toast.success("Member assigned successfully");
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
        toast.success(`Successfully assigned ${result.success.length} members`);
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">
            Manage organizational structure and zone assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setBulkAssignDialogOpen(true)}
            disabled={selectedShepherds.size === 0}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Bulk Assign ({selectedShepherds.size})
          </Button>
          <Button onClick={() => setAssignDialogOpen(true)}>
            <UserCog className="mr-2 h-4 w-4" />
            Assign Shepherd
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pastors</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPastors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shepherds</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalShepherds}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unassignedShepherds}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalZones}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="hierarchy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hierarchy">
            <Network className="mr-2 h-4 w-4" />
            Organization Chart
          </TabsTrigger>
          <TabsTrigger value="shepherds">
            <Users className="mr-2 h-4 w-4" />
            Manage Shepherds
          </TabsTrigger>
          <TabsTrigger value="zones">
            <MapPin className="mr-2 h-4 w-4" />
            Zone Management
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="members">
            <UserPlus className="mr-2 h-4 w-4" />
            Member Assignments
          </TabsTrigger>
        </TabsList>

        {/* Organization Chart Tab */}
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
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{item.pastor.name}</CardTitle>
                            <CardDescription>{item.pastor.email}</CardDescription>
                            {item.pastor.supervisedZones.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.pastor.supervisedZones.map((zone) => (
                                  <Badge key={zone} variant="outline">
                                    {zone}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Badge>{item.shepherds.length} Shepherds</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {item.shepherds.length > 0 ? (
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {item.shepherds.map((shepherd) => (
                              <div
                                key={shepherd._id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{shepherd.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {shepherd.email}
                                  </div>
                                  {shepherd.assignedZone && (
                                    <Badge variant="secondary" className="mt-1">
                                      {shepherd.assignedZone}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
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
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {hierarchy.unassignedShepherds.map((shepherd) => (
                            <div
                              key={shepherd._id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="font-medium">{shepherd.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {shepherd.email}
                                </div>
                                {shepherd.assignedZone && (
                                  <Badge variant="secondary" className="mt-1">
                                    {shepherd.assignedZone}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
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

        {/* Manage Shepherds Tab */}
        <TabsContent value="shepherds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Shepherds</CardTitle>
              <CardDescription>
                Assign shepherds to pastors and manage assignments
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
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select
                  value={selectedPastorFilter}
                  onValueChange={setSelectedPastorFilter}
                >
                  <SelectTrigger className="w-[200px]">
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
                <Select
                  value={selectedZoneFilter}
                  onValueChange={setSelectedZoneFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {allZones?.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unassigned-only"
                    checked={showUnassignedOnly}
                    onCheckedChange={(checked: boolean) =>
                      setShowUnassignedOnly(checked === true)
                    }
                  />
                  <Label htmlFor="unassigned-only">Unassigned only</Label>
                </div>
              </div>

              {/* Selection Actions */}
              {selectedShepherds.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedShepherds.size} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBulkAssignDialogOpen(true);
                      }}
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
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <Checkbox
                            checked={selectedShepherds.has(shepherd._id)}
                            onCheckedChange={() =>
                              toggleShepherdSelection(shepherd._id)
                            }
                          />
                          <div className="flex-1">
                            <div className="font-medium">{shepherd.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {shepherd.email}
                            </div>
                            <div className="flex gap-2 mt-1">
                              {shepherd.assignedZone && (
                                <Badge variant="secondary">
                                  {shepherd.assignedZone}
                                </Badge>
                              )}
                              {shepherd.overseerName ? (
                                <Badge>
                                  Overseen by: {shepherd.overseerName}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Unassigned</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {shepherd.overseerId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnassignShepherd(shepherd._id)}
                            >
                              Unassign
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedShepherdForAssign(shepherd._id);
                              setZoneAssignDialogOpen(true);
                            }}
                          >
                            Assign Zone
                          </Button>
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

        {/* Zone Management Tab */}
        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Zone Management</CardTitle>
                  <CardDescription>
                    Assign zones to shepherds and pastors
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setSupervisedZonesDialogOpen(true)}
                >
                  Assign Supervised Zones
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.zoneStats && stats.zoneStats.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stats.zoneStats.map((zoneStat) => (
                    <Card key={zoneStat.zone}>
                      <CardHeader>
                        <CardTitle className="text-lg">{zoneStat.zone}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Shepherds:</span>
                            <span className="font-medium">{zoneStat.shepherdCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Pastors:</span>
                            <span className="font-medium">{zoneStat.pastorCount}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No zones found
                </div>
              )}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Member Assignments</CardTitle>
                  <CardDescription>
                    Assign members to shepherds for care and create task assignments
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setBulkMemberAssignDialogOpen(true)}
                    disabled={selectedMembers.size === 0}
                    variant="outline"
                  >
                    Bulk Assign ({selectedMembers.size})
                  </Button>
                  <Button onClick={() => setMemberAssignDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Member
                  </Button>
                  <Button onClick={() => setTaskAssignmentDialogOpen(true)}>
                    <Heart className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Member Stats */}
              {memberStats && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{memberStats.totalMembers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Shepherds</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{memberStats.totalShepherds}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Members/Shepherd</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {memberStats.totalShepherds > 0
                          ? Math.round(memberStats.totalMembers / memberStats.totalShepherds)
                          : 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select
                  value={selectedShepherdFilter}
                  onValueChange={setSelectedShepherdFilter}
                >
                  <SelectTrigger className="w-[200px]">
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
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedMembers.size} selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMembers(new Set())}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setBulkMemberAssignDialogOpen(true);
                      }}
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
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <Checkbox
                            checked={selectedMembers.has(member._id)}
                            onCheckedChange={() =>
                              toggleMemberSelection(member._id)
                            }
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              {member.firstName} {member.lastName}
                              {member.preferredName && (
                                <span className="text-muted-foreground ml-1">
                                  ({member.preferredName})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email || member.phone}
                            </div>
                            <div className="flex gap-2 mt-1">
                              {shepherd ? (
                                <Badge>
                                  Assigned to: {shepherd.name}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Unassigned</Badge>
                              )}
                              {member.status && (
                                <Badge variant="outline">{member.status}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMemberForAssign(member._id);
                              setMemberAssignDialogOpen(true);
                            }}
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
                          >
                            Create Task
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
      </Tabs>

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

      {/* Assign Zone Dialog */}
      <Dialog open={zoneAssignDialogOpen} onOpenChange={setZoneAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Zone to Shepherd</DialogTitle>
            <DialogDescription>
              Select a zone to assign to the shepherd
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zone</Label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or enter zone" />
                </SelectTrigger>
                <SelectContent>
                  {allZones?.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or enter new zone name"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setZoneAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedShepherdForAssign && selectedZone) {
                    handleAssignZone(
                      selectedShepherdForAssign as Id<"users">,
                      selectedZone
                    );
                  }
                }}
              >
                Assign Zone
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Supervised Zones Dialog */}
      <Dialog
        open={supervisedZonesDialogOpen}
        onOpenChange={setSupervisedZonesDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Supervised Zones to Pastor</DialogTitle>
            <DialogDescription>
              Select zones that this pastor will supervise
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pastor</Label>
              <Select
                value={selectedPastorForZones}
                onValueChange={(value) =>
                  setSelectedPastorForZones(value as Id<"users">)
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
            <div className="space-y-2">
              <Label>Supervised Zones</Label>
              <ScrollArea className="h-48 border rounded-md p-4">
                <div className="space-y-2">
                  {allZones?.map((zone) => (
                    <div key={zone} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedSupervisedZones.includes(zone)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedSupervisedZones([
                              ...selectedSupervisedZones,
                              zone,
                            ]);
                          } else {
                            setSelectedSupervisedZones(
                              selectedSupervisedZones.filter((z) => z !== zone)
                            );
                          }
                        }}
                      />
                      <Label>{zone}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSupervisedZonesDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAssignSupervisedZones}>
                Assign Zones
              </Button>
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
