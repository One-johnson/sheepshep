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
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import {
  Heart,
  Search,
  Eye,
  Filter,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

// Component to display user photo
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

function formatDate(timestamp: number): string {
  return format(new Date(timestamp), "MMM dd, yyyy");
}

function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), "MMM dd, yyyy HH:mm");
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return { variant: "destructive" as const, label: "Urgent" };
    case "high":
      return { variant: "destructive" as const, className: "bg-red-500 hover:bg-red-600 text-white", label: "High" };
    case "medium":
      return { variant: "secondary" as const, className: "bg-amber-500 hover:bg-amber-600 text-white", label: "Medium" };
    case "low":
      return { variant: "outline" as const, label: "Low" };
    default:
      return { variant: "outline" as const, label: "Low" };
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "answered":
      return { variant: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white", label: "Answered" };
    case "closed":
      return { variant: "secondary" as const, label: "Closed" };
    case "open":
      return { variant: "outline" as const, label: "Open" };
    default:
      return { variant: "outline" as const, label: "Open" };
  }
}

export default function PrayerRequestsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const [responseMessage, setResponseMessage] = React.useState("");
  const [openRequestIds, setOpenRequestIds] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Get current user
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  // Get prayer requests
  const prayerRequests = useQuery(
    api.prayerRequests.list,
    token ? { token } : "skip"
  );

  // Get members for display
  const members = useQuery(
    api.members.list,
    token ? { token, isActive: true } : "skip"
  );

  // Get users for recipient/requester display (role-based: admins see all, pastors/shepherds see limited set)
  const allUsers = useQuery(
    api.authUsers.listForDisplay,
    token ? { token } : "skip"
  );

  // Mutations
  const createPrayerRequest = useMutation(api.prayerRequests.create);
  const addResponse = useMutation(api.prayerRequests.addResponse);
  const updateStatus = useMutation(api.prayerRequests.updateStatus);

  const isShepherd = currentUser?.role === "shepherd";

  // Create prayer request state
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createDescription, setCreateDescription] = React.useState("");
  const [createMemberId, setCreateMemberId] = React.useState<string>("");
  const [createPriority, setCreatePriority] = React.useState<string>("medium");
  const [createRecipientIds, setCreateRecipientIds] = React.useState<Set<Id<"users">>>(new Set());
  const [isCreating, setIsCreating] = React.useState(false);

  // Filter prayer requests
  const filteredRequests = React.useMemo(() => {
    if (!prayerRequests) return [];

    let filtered = prayerRequests;

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((pr) => pr.status === selectedStatus);
    }

    // Filter by priority
    if (selectedPriority !== "all") {
      filtered = filtered.filter((pr) => pr.priority === selectedPriority);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pr) =>
          pr.title.toLowerCase().includes(query) ||
          pr.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [prayerRequests, selectedStatus, selectedPriority, searchQuery]);

  const isLoading = prayerRequests === undefined || currentUser === undefined;

  // Recipients for create form - shepherds and pastors (exclude self)
  const recipientOptions = React.useMemo(() => {
    if (!allUsers || !currentUser) return [];
    return allUsers.filter(
      (u) =>
        u._id !== currentUser._id &&
        (u.role === "shepherd" || u.role === "pastor" || u.role === "admin")
    );
  }, [allUsers, currentUser]);

  // Shepherd's members for create form
  const shepherdMembers = React.useMemo(() => {
    if (!members || !isShepherd) return [];
    return members;
  }, [members, isShepherd]);

  const toggleRecipient = (userId: Id<"users">) => {
    setCreateRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreatePrayerRequest = async () => {
    if (!token || !createMemberId || !createTitle.trim() || !createDescription.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (createRecipientIds.size === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setIsCreating(true);
    try {
      await createPrayerRequest({
        token,
        memberId: createMemberId as Id<"members">,
        title: createTitle.trim(),
        description: createDescription.trim(),
        priority: createPriority as "low" | "medium" | "high" | "urgent",
        recipientIds: Array.from(createRecipientIds),
      });
      toast.success("Prayer request created successfully");
      setCreateDialogOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateMemberId("");
      setCreatePriority("medium");
      setCreateRecipientIds(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to create prayer request");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateMemberId("");
    setCreatePriority("medium");
    setCreateRecipientIds(new Set());
  };

  // Handle add response
  const handleAddResponse = async () => {
    if (!token || !selectedRequest || !responseMessage.trim()) {
      toast.error("Please enter a response message");
      return;
    }

    try {
      await addResponse({
        token,
        prayerRequestId: selectedRequest._id,
        message: responseMessage.trim(),
      });
      toast.success("Response added successfully");
      setResponseMessage("");
      // Refresh the request
      setSelectedRequest(null);
      setViewDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add response");
    }
  };

  // Handle update status
  const handleUpdateStatus = async (status: "open" | "answered" | "closed") => {
    if (!token || !selectedRequest) return;

    try {
      await updateStatus({
        token,
        prayerRequestId: selectedRequest._id,
        status,
      });
      toast.success(`Prayer request marked as ${status}`);
      setSelectedRequest(null);
      setViewDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  if (!isClient || !token) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between gap-4">
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8" />
              Prayer Requests
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
              {isShepherd ? "Create, view and respond to prayer requests" : "View and respond to prayer requests"}
            </p>
          </div>
        </div>
        {isShepherd && (
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Request
          </Button>
        )}
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="min-w-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 min-w-0 w-full">
            <div className="min-w-0 shrink-0">
              <CardTitle className="text-lg sm:text-xl">Prayer Requests</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and respond to prayer requests from shepherds
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto min-w-0 shrink">
              <div className="relative w-full sm:w-64 min-w-0">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full min-w-0"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-40 min-w-0">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-full sm:w-40 min-w-0">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery || selectedStatus !== "all" || selectedPriority !== "all"
                ? "No prayer requests found matching your filters"
                : "No prayer requests found"}
            </div>
          ) : (
            <>
              {/* Mobile: Collapsible Cards */}
              <div className="md:hidden space-y-3">
                {filteredRequests.map((request) => {
                  const member = members?.find((m) => m._id === request.memberId);
                  const requester = allUsers?.find((u) => u._id === request.requestedBy);
                  const priorityBadge = getPriorityBadge(request.priority);
                  const statusBadge = getStatusBadge(request.status);
                  const responseCount = request.responses?.length || 0;
                  const isOpen = openRequestIds[request._id] ?? false;

                  return (
                    <Collapsible
                      key={request._id}
                      open={isOpen}
                      onOpenChange={(open) => {
                        setOpenRequestIds((prev) => ({ ...prev, [request._id]: open }));
                      }}
                      className="rounded-lg border bg-card"
                    >
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {member && (
                              <div className="flex items-center gap-2 shrink-0">
                                <MemberPhotoCell
                                  memberId={member._id}
                                  photoId={member.profilePhotoId}
                                  firstName={member.firstName}
                                  lastName={member.lastName}
                                  token={token}
                                />
                                <span className="text-sm font-medium truncate">
                                  {member.firstName} {member.lastName}
                                </span>
                              </div>
                            )}
                            <Badge variant={priorityBadge.variant} className={`text-xs shrink-0 ${priorityBadge.className}`}>
                              {priorityBadge.label}
                            </Badge>
                            <Badge variant={statusBadge.variant} className={`text-xs shrink-0 ${statusBadge.className}`}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate mt-1">
                            {request.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            {formatDate(request.createdAt)} · {format(new Date(request.createdAt), "HH:mm")}
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {responseCount}
                            </span>
                          </p>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-3">
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Member</span>
                            <span>{member ? `${member.firstName} ${member.lastName}` : "Unknown"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Priority</span>
                            <Badge variant={priorityBadge.variant} className={priorityBadge.className}>
                              {priorityBadge.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={statusBadge.variant} className={statusBadge.className}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          {request.description && (
                            <p className="text-sm text-muted-foreground line-clamp-3">{request.description}</p>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedRequest({
                                ...request,
                                member,
                                requester,
                                recipients: allUsers?.filter((u) =>
                                  request.recipients.includes(u._id)
                                ),
                                responses: request.responses?.map((r: any) => ({
                                  ...r,
                                  user: allUsers?.find((u) => u._id === r.userId),
                                })),
                              });
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View & Respond
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => {
                      const member = members?.find((m) => m._id === request.memberId);
                      const requester = allUsers?.find((u) => u._id === request.requestedBy);
                      const priorityBadge = getPriorityBadge(request.priority);
                      const statusBadge = getStatusBadge(request.status);
                      const responseCount = request.responses?.length || 0;

                      return (
                        <TableRow key={request._id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {formatDate(request.createdAt)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(request.createdAt), "HH:mm")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member ? (
                              <div className="flex items-center gap-2">
                                <MemberPhotoCell
                                  memberId={member._id}
                                  photoId={member.profilePhotoId}
                                  firstName={member.firstName}
                                  lastName={member.lastName}
                                  token={token}
                                />
                                <span className="text-sm">
                                  {member.firstName} {member.lastName}
                                </span>
                              </div>
                            ) : (
                              "Unknown"
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {request.title}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={priorityBadge.variant}
                              className={priorityBadge.className}
                            >
                              {priorityBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusBadge.variant}
                              className={statusBadge.className}
                            >
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span>{responseCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRequest({
                                  ...request,
                                  member,
                                  requester,
                                  recipients: allUsers?.filter((u) =>
                                    request.recipients.includes(u._id)
                                  ),
                                  responses: request.responses?.map((r: any) => ({
                                    ...r,
                                    user: allUsers?.find((u) => u._id === r.userId),
                                  })),
                                });
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Prayer Request Dialog (shepherd only) */}
      {isShepherd && (
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Prayer Request</DialogTitle>
              <DialogDescription>
                Request prayer for a member and assign to other shepherds or pastors
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-member">Member *</Label>
                <Select
                  value={createMemberId}
                  onValueChange={setCreateMemberId}
                >
                  <SelectTrigger id="create-member">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {shepherdMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-title">Title *</Label>
                <Input
                  id="create-title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Brief title for the prayer request"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description *</Label>
                <Textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Describe the prayer need..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-priority">Priority</Label>
                <Select
                  value={createPriority}
                  onValueChange={setCreatePriority}
                >
                  <SelectTrigger id="create-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign to (select recipients) *</Label>
                <ScrollArea className="h-[180px] rounded-md border p-3">
                  <div className="space-y-2">
                    {recipientOptions.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`recipient-${user._id}`}
                          checked={createRecipientIds.has(user._id)}
                          onCheckedChange={() => toggleRecipient(user._id)}
                        />
                        <label
                          htmlFor={`recipient-${user._id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {user.name}
                          <span className="text-muted-foreground ml-2">
                            ({user.role})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {recipientOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No shepherds or pastors available to assign
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetCreateForm();
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePrayerRequest}
                disabled={
                  isCreating ||
                  !createMemberId ||
                  !createTitle.trim() ||
                  !createDescription.trim() ||
                  createRecipientIds.size === 0
                }
              >
                {isCreating ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Prayer Request Dialog */}
      {selectedRequest && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRequest.title}</DialogTitle>
              <DialogDescription>
                Prayer request from {formatDateTime(selectedRequest.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Member</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedRequest.member && (
                        <>
                          <MemberPhotoCell
                            memberId={selectedRequest.member._id}
                            photoId={selectedRequest.member.profilePhotoId}
                            firstName={selectedRequest.member.firstName}
                            lastName={selectedRequest.member.lastName}
                            token={token}
                          />
                          <span>
                            {selectedRequest.member.firstName} {selectedRequest.member.lastName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Requested By</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedRequest.requester && (
                        <>
                          <UserPhotoCell
                            userId={selectedRequest.requester._id}
                            photoId={selectedRequest.requester.profilePhotoId}
                            name={selectedRequest.requester.name}
                            token={token}
                          />
                          <span>{selectedRequest.requester.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <div className="mt-1">
                      <Badge {...getPriorityBadge(selectedRequest.priority)}>
                        {getPriorityBadge(selectedRequest.priority).label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge {...getStatusBadge(selectedRequest.status)}>
                        {getStatusBadge(selectedRequest.status).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
                  </div>
                </div>

                {/* Recipients */}
                {selectedRequest.recipients && selectedRequest.recipients.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Recipients</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedRequest.recipients.map((recipient: any) => (
                        <Badge key={recipient._id} variant="outline">
                          {recipient.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Responses */}
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Responses ({selectedRequest.responses?.length || 0})
                  </Label>
                  <div className="mt-2 space-y-3">
                    {selectedRequest.responses && selectedRequest.responses.length > 0 ? (
                      selectedRequest.responses.map((response: any, index: number) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {response.user && (
                              <>
                                <UserPhotoCell
                                  userId={response.user._id}
                                  photoId={response.user.profilePhotoId}
                                  name={response.user.name}
                                  token={token}
                                />
                                <span className="text-sm font-medium">{response.user.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(response.createdAt)}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No responses yet</p>
                    )}
                  </div>
                </div>

                {/* Add Response */}
                {selectedRequest.status === "open" && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Add Response</Label>
                      <Textarea
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Enter your response..."
                        className="mt-2"
                        rows={3}
                      />
                      <Button
                        onClick={handleAddResponse}
                        className="mt-2"
                        disabled={!responseMessage.trim()}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Response
                      </Button>
                    </div>
                  </>
                )}

                {/* Status Actions */}
                {selectedRequest.status === "open" && (
                  <>
                    <Separator />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus("answered")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Answered
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus("closed")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Close Request
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
