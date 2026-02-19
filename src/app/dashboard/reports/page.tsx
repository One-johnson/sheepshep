"use client";

import * as React from "react";
import { useQuery } from "convex/react";
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
import {
  FileText,
  Search,
  Eye,
  Filter,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

function getReportTypeBadge(type: string) {
  switch (type) {
    case "visitation":
      return { variant: "default" as const, label: "Visitation" };
    case "prayer":
      return { variant: "secondary" as const, label: "Prayer" };
    case "follow_up":
      return { variant: "outline" as const, label: "Follow Up" };
    default:
      return { variant: "outline" as const, label: "Other" };
  }
}

function getOutcomeBadge(outcome?: string) {
  switch (outcome) {
    case "successful":
      return { variant: "default" as const, className: "bg-green-500 hover:bg-green-600 text-white", label: "Successful" };
    case "partial":
      return { variant: "secondary" as const, className: "bg-amber-500 hover:bg-amber-600 text-white", label: "Partial" };
    case "unsuccessful":
      return { variant: "destructive" as const, label: "Unsuccessful" };
    case "rescheduled":
      return { variant: "outline" as const, label: "Rescheduled" };
    default:
      return { variant: "outline" as const, label: "N/A" };
  }
}

export default function ReportsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedShepherd, setSelectedShepherd] = React.useState<string>("all");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<any>(null);
  const [openReportIds, setOpenReportIds] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Get current user
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  // Determine user role
  const isAdmin = currentUser?.role === "admin";
  const isPastor = currentUser?.role === "pastor";
  const isShepherd = currentUser?.role === "shepherd";

  // Get reports (filtered by role - shepherd sees own, pastor sees shepherds', admin sees all)
  const reports = useQuery(
    api.reports.list,
    token ? { token } : "skip"
  );

  // Get shepherds for filter
  const shepherds = useQuery(
    api.attendance.getShepherds,
    token && (isAdmin || isPastor) ? { token } : "skip"
  );

  // Get members for display
  const members = useQuery(
    api.members.list,
    token ? { token, isActive: true } : "skip"
  );

  // Get assignments for display
  const assignments = useQuery(
    api.assignments.list,
    token ? { token } : "skip"
  );

  // Filter reports
  const filteredReports = React.useMemo(() => {
    if (!reports) return [];

    let filtered = reports;

    // Filter by shepherd
    if (selectedShepherd !== "all") {
      filtered = filtered.filter((r) => r.shepherdId === selectedShepherd);
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((r) => r.reportType === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reports, selectedShepherd, selectedType, searchQuery]);

  const isLoading = reports === undefined || currentUser === undefined;

  if (!isClient || !token) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
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
            <FileText className="h-6 w-6 sm:h-8 sm:w-8" />
            Reports
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
          {isShepherd
            ? "View and submit your reports"
            : isPastor
              ? "View reports from your shepherds"
              : "View all reports from shepherds"}
          </p>
        </div>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="min-w-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 min-w-0 w-full">
            <div className="min-w-0 shrink-0">
              <CardTitle className="text-lg sm:text-xl">Reports</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {isShepherd ? "Your submitted reports" : "View and analyze reports from shepherds"}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto min-w-0 shrink">
              <div className="relative w-full sm:w-64 min-w-0">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full min-w-0"
                />
              </div>
              {(isAdmin || isPastor) && shepherds && shepherds.length > 0 && (
                <Select value={selectedShepherd} onValueChange={setSelectedShepherd}>
                  <SelectTrigger className="w-full sm:w-40 min-w-0">
                    <SelectValue placeholder="All Shepherds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shepherds</SelectItem>
                    {shepherds.map((shepherd) => (
                      <SelectItem key={shepherd._id} value={shepherd._id}>
                        {shepherd.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-40 min-w-0">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="visitation">Visitation</SelectItem>
                  <SelectItem value="prayer">Prayer</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery || selectedShepherd !== "all" || selectedType !== "all"
                ? "No reports found matching your filters"
                : "No reports found"}
            </div>
          ) : (
            <>
              {/* Mobile: Collapsible Cards */}
              <div className="md:hidden space-y-3">
                {filteredReports.map((report) => {
                  const shepherd = shepherds?.find((s) => s._id === report.shepherdId);
                  const member = members?.find((m) => m._id === report.memberId);
                  const assignment = assignments?.find((a) => a._id === report.assignmentId);
                  const typeBadge = getReportTypeBadge(report.reportType);
                  const outcomeBadge = getOutcomeBadge(report.outcome);
                  const isOpen = openReportIds[report._id] ?? false;

                  return (
                    <Collapsible
                      key={report._id}
                      open={isOpen}
                      onOpenChange={(open) => {
                        setOpenReportIds((prev) => ({ ...prev, [report._id]: open }));
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
                            <Badge variant={typeBadge.variant} className="text-xs shrink-0">
                              {typeBadge.label}
                            </Badge>
                            <Badge
                              variant={outcomeBadge.variant}
                              className={`text-xs shrink-0 ${outcomeBadge.className}`}
                            >
                              {outcomeBadge.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {report.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(report.createdAt)} · {format(new Date(report.createdAt), "HH:mm")}
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
                          {!isShepherd && shepherd && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Shepherd</span>
                              <div className="flex items-center gap-2">
                                <UserPhotoCell
                                  userId={shepherd._id}
                                  photoId={shepherd.profilePhotoId}
                                  name={shepherd.name}
                                  token={token}
                                />
                                <span>{shepherd.name}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Member</span>
                            <span>{member ? `${member.firstName} ${member.lastName}` : "Unknown"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Type</span>
                            <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Outcome</span>
                            <Badge variant={outcomeBadge.variant} className={outcomeBadge.className}>
                              {outcomeBadge.label}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedReport({
                                ...report,
                                shepherd,
                                member,
                                assignment,
                              });
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Report
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
                      {!isShepherd && <TableHead>Shepherd</TableHead>}
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const shepherd = shepherds?.find((s) => s._id === report.shepherdId);
                      const member = members?.find((m) => m._id === report.memberId);
                      const assignment = assignments?.find((a) => a._id === report.assignmentId);
                      const typeBadge = getReportTypeBadge(report.reportType);
                      const outcomeBadge = getOutcomeBadge(report.outcome);

                      return (
                        <TableRow key={report._id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {formatDate(report.createdAt)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(report.createdAt), "HH:mm")}
                              </span>
                            </div>
                          </TableCell>
                          {!isShepherd && (
                            <TableCell>
                              {shepherd ? (
                                <div className="flex items-center gap-2">
                                  <UserPhotoCell
                                    userId={shepherd._id}
                                    photoId={shepherd.profilePhotoId}
                                    name={shepherd.name}
                                    token={token}
                                  />
                                  <span className="text-sm">{shepherd.name}</span>
                                </div>
                              ) : (
                                "Unknown"
                              )}
                            </TableCell>
                          )}
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
                          <TableCell>
                            <Badge variant={typeBadge.variant}>
                              {typeBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {report.title}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={outcomeBadge.variant}
                              className={outcomeBadge.className}
                            >
                              {outcomeBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedReport({
                                  ...report,
                                  shepherd,
                                  member,
                                  assignment,
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

      {/* View Report Dialog */}
      {selectedReport && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedReport.title}</DialogTitle>
              <DialogDescription>
                Report submitted on {formatDateTime(selectedReport.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                {/* Report Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Shepherd</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedReport.shepherd && (
                        <>
                          <UserPhotoCell
                            userId={selectedReport.shepherd._id}
                            photoId={selectedReport.shepherd.profilePhotoId}
                            name={selectedReport.shepherd.name}
                            token={token}
                          />
                          <span>{selectedReport.shepherd.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Member</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedReport.member && (
                        <>
                          <MemberPhotoCell
                            memberId={selectedReport.member._id}
                            photoId={selectedReport.member.profilePhotoId}
                            firstName={selectedReport.member.firstName}
                            lastName={selectedReport.member.lastName}
                            token={token}
                          />
                          <span>
                            {selectedReport.member.firstName} {selectedReport.member.lastName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <div className="mt-1">
                      <Badge {...getReportTypeBadge(selectedReport.reportType)}>
                        {getReportTypeBadge(selectedReport.reportType).label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Outcome</Label>
                    <div className="mt-1">
                      <Badge {...getOutcomeBadge(selectedReport.outcome)}>
                        {getOutcomeBadge(selectedReport.outcome).label}
                      </Badge>
                    </div>
                  </div>
                  {selectedReport.visitDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Visit Date</Label>
                      <div className="mt-1 text-sm">
                        {formatDate(selectedReport.visitDate)}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Report Content */}
                <div>
                  <Label className="text-xs text-muted-foreground">Report Content</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.content}</p>
                  </div>
                </div>

                {/* Notes */}
                {selectedReport.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.notes}</p>
                    </div>
                  </div>
                )}

                {/* Assignment Info */}
                {selectedReport.assignment && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Related Assignment</Label>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">{selectedReport.assignment.title}</p>
                        {selectedReport.assignment.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedReport.assignment.description}
                          </p>
                        )}
                      </div>
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
