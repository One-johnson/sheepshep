"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Checkbox as CheckboxComponent } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Search,
  Eye,
  Pencil,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EditShepherdDialog } from "@/components/dashboard/edit-shepherd-dialog";
import { ViewUserDialog } from "@/components/dashboard/view-user-dialog";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useQuery as useQueryHook } from "convex/react";

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
  const photoUrl = useQueryHook(
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
  const photoUrl = useQueryHook(
    api.storage.getFileUrl,
    token && photoId ? { token, storageId: photoId } : "skip"
  );

  const getInitials = (first: string, last: string) => {
    return `${first[0]}${last[0]}`.toUpperCase();
  };

  return (
    <Avatar className="h-6 w-6">
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

// Component for members hover card
function MembersHoverCard({
  shepherdId,
  memberCount,
  members,
  token,
}: {
  shepherdId: Id<"users">;
  memberCount: number;
  members: Array<{
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    preferredName?: string;
    profilePhotoId?: Id<"_storage">;
    status?: string;
  }>;
  token: string | null;
}) {
  if (memberCount === 0) {
    return (
      <div className="flex items-center gap-1">
        <UserCheck className="h-4 w-4 text-muted-foreground" />
        <span>0</span>
      </div>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{memberCount}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-96">
        <div className="space-y-2">
          <div className="font-semibold text-sm">Members ({memberCount})</div>
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-3 gap-3">
              {members.slice(0, 50).map((member) => (
                <div key={member._id} className="flex flex-col items-center gap-1 p-2 rounded hover:bg-muted transition-colors">
                  <MemberPhotoCell
                    memberId={member._id}
                    photoId={member.profilePhotoId}
                    firstName={member.firstName}
                    lastName={member.lastName}
                    token={token}
                  />
                  <div className="text-xs font-medium text-center truncate w-full">
                    {member.preferredName || `${member.firstName} ${member.lastName}`}
                  </div>
                  {member.status && (
                    <Badge variant="outline" className="text-xs">
                      {member.status.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {members.length > 50 && (
              <div className="text-xs text-muted-foreground text-center py-2 mt-2">
                ... and {members.length - 50} more
              </div>
            )}
          </ScrollArea>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function ShepherdsPage() {
  const [token, setToken] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedShepherd, setSelectedShepherd] = React.useState<any>(null);
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = React.useState<Set<Id<"users">>>(new Set());

  React.useEffect(() => {
    setIsClient(true);
    setToken(localStorage.getItem("authToken"));
  }, []);

  // Get current user
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  // Determine user role
  const isAdmin = currentUser?.role === "admin";
  const isPastor = currentUser?.role === "pastor";

  // Get shepherds (filtered by role - pastors only see their shepherds)
  const shepherds = useQuery(
    api.attendance.getShepherds,
    token && (isAdmin || isPastor) ? { token } : "skip"
  );

  // Get member counts for each shepherd
  const members = useQuery(
    api.members.list,
    token ? { token, isActive: true } : "skip"
  );

  // Calculate member counts per shepherd
  const shepherdMemberCounts = React.useMemo(() => {
    if (!members || !shepherds) return new Map();
    const counts = new Map<Id<"users">, number>();
    shepherds.forEach((shepherd) => {
      const count = members.filter((m) => m.shepherdId === shepherd._id).length;
      counts.set(shepherd._id, count);
    });
    return counts;
  }, [members, shepherds]);

  // Get members per shepherd
  const shepherdMembers = React.useMemo(() => {
    if (!members || !shepherds) return new Map();
    const memberMap = new Map<Id<"users">, typeof members>();
    shepherds.forEach((shepherd) => {
      const shepherdMembersList = members.filter((m) => m.shepherdId === shepherd._id);
      memberMap.set(shepherd._id, shepherdMembersList);
    });
    return memberMap;
  }, [members, shepherds]);

  // Filter shepherds based on search
  const filteredShepherds = React.useMemo(() => {
    if (!shepherds) return [];
    if (!searchQuery) return shepherds;

    const query = searchQuery.toLowerCase();
    return shepherds.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.phone?.toLowerCase().includes(query)
    );
  }, [shepherds, searchQuery]);

  const isLoading = shepherds === undefined || currentUser === undefined;

  // Export to CSV
  const handleExportCSV = (shepherdsToExport?: typeof filteredShepherds) => {
    const exportShepherds = shepherdsToExport || filteredShepherds || [];
    
    if (exportShepherds.length === 0) {
      toast.error("No shepherds to export");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "WhatsApp",
      "Preferred Name",
      "Status",
      "Members Count",
      "Occupation",
      "Educational Background",
      "Commissioning Date",
      "Created At",
    ];

    const rows = exportShepherds.map((shepherd) => {
      const memberCount = shepherdMemberCounts.get(shepherd._id) || 0;
      return [
        shepherd.name || "",
        shepherd.email || "",
        shepherd.phone || "",
        shepherd.whatsappNumber || "",
        shepherd.preferredName || "",
        shepherd.status || "",
        memberCount.toString(),
        shepherd.occupation || "",
        shepherd.educationalBackground || "",
        shepherd.commissioningDate ? new Date(shepherd.commissioningDate).toLocaleDateString() : "",
        shepherd.createdAt ? new Date(shepherd.createdAt).toLocaleDateString() : "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = exportShepherds.length === 1
      ? `shepherd_${exportShepherds[0].name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
      : `shepherds_${exportShepherds.length}_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${exportShepherds.length} shepherd(s) exported to CSV`);
  };

  // Export to PDF
  const handleExportPDF = async (shepherdsToExport?: typeof filteredShepherds) => {
    const exportShepherds = shepherdsToExport || filteredShepherds || [];
    
    if (exportShepherds.length === 0) {
      toast.error("No shepherds to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to export PDF");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shepherds Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print { @page { margin: 1cm; } }
          </style>
        </head>
        <body>
          <h1>Shepherds Export</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Shepherds: ${exportShepherds.length}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Members</th>
                <th>Occupation</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              ${exportShepherds.map((shepherd) => {
                const memberCount = shepherdMemberCounts.get(shepherd._id) || 0;
                return `
                <tr>
                  <td>${shepherd.name || ""}</td>
                  <td>${shepherd.email || ""}</td>
                  <td>${shepherd.phone || "N/A"}</td>
                  <td>${shepherd.status || "N/A"}</td>
                  <td>${memberCount}</td>
                  <td>${shepherd.occupation || "N/A"}</td>
                  <td>${shepherd.createdAt ? new Date(shepherd.createdAt).toLocaleDateString() : "N/A"}</td>
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
    printWindow.print();

    toast.success(`Opening PDF preview for ${exportShepherds.length} shepherd(s)`);
  };

  // Toggle row selection
  const toggleRowSelection = (shepherdId: Id<"users">) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shepherdId)) {
        newSet.delete(shepherdId);
      } else {
        newSet.add(shepherdId);
      }
      return newSet;
    });
  };

  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.size === filteredShepherds.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredShepherds.map((s) => s._id)));
    }
  };

  if (!isClient || !token) {
    return <div className="p-6">Loading...</div>;
  }

  // Only allow admin and pastor access
  if (!isAdmin && !isPastor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 sm:h-8 sm:w-8" />
          Shepherd Management
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
          {isPastor
            ? "Manage your assigned shepherds"
            : "Manage all shepherds in the system"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">Shepherds</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {isPastor
                  ? "View and manage your assigned shepherds"
                  : "View and manage all shepherds"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedRows.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selectedShepherds = filteredShepherds.filter((s) => selectedRows.has(s._id));
                      handleExportCSV(selectedShepherds);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV ({selectedRows.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selectedShepherds = filteredShepherds.filter((s) => selectedRows.has(s._id));
                      handleExportPDF(selectedShepherds);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF ({selectedRows.size})
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCSV()}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPDF()}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
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
            <TableSkeleton columns={6} rows={5} />
          ) : filteredShepherds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery
                ? "No shepherds found matching your search"
                : isPastor
                ? "No shepherds assigned to you"
                : "No shepherds found"}
            </div>
          ) : (
            <>
              {/* Mobile: Collapsible Cards */}
              <div className="md:hidden space-y-3">
                {filteredShepherds.map((shepherd) => {
                  const memberCount = shepherdMemberCounts.get(shepherd._id) || 0;
                  const isOpen = openRows[shepherd._id] || false;
                  return (
                    <Collapsible
                      key={shepherd._id}
                      open={isOpen}
                      onOpenChange={(open) => {
                        setOpenRows((prev) => ({ ...prev, [shepherd._id]: open }));
                      }}
                      className="rounded-lg border bg-card"
                    >
                      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <UserPhotoCell
                            userId={shepherd._id}
                            photoId={shepherd.profilePhotoId}
                            name={shepherd.name}
                            token={token}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {shepherd.name}
                              {shepherd.preferredName && (
                                <span className="text-muted-foreground ml-1">
                                  ({shepherd.preferredName})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {shepherd.email}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {shepherd.status === "active" ? (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            ) : shepherd.status === "on_leave" ? (
                              <Badge variant="secondary" className="text-xs">On Leave</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Inactive</Badge>
                            )}
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-3 space-y-2">
                        <div className="pt-2 border-t space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Phone
                            </span>
                            <span className="font-medium">{shepherd.phone || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              Members
                            </span>
                            <MembersHoverCard
                              shepherdId={shepherd._id}
                              memberCount={memberCount}
                              members={shepherdMembers.get(shepherd._id) || []}
                              token={token}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4 mr-2" />
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedShepherd(shepherd);
                                    setViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedShepherd(shepherd);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportCSV([shepherd]);
                                  }}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Export CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportPDF([shepherd]);
                                  }}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Export PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                      <TableHead className="w-12">
                        <CheckboxComponent
                          checked={selectedRows.size === filteredShepherds.length && filteredShepherds.length > 0}
                          onCheckedChange={toggleAllRows}
                        />
                      </TableHead>
                      <TableHead>Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShepherds.map((shepherd) => {
                      const memberCount = shepherdMemberCounts.get(shepherd._id) || 0;
                      const isSelected = selectedRows.has(shepherd._id);
                      return (
                        <TableRow key={shepherd._id}>
                          <TableCell>
                            <CheckboxComponent
                              checked={isSelected}
                              onCheckedChange={() => toggleRowSelection(shepherd._id)}
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
                          <TableCell className="font-medium">
                            {shepherd.name}
                            {shepherd.preferredName && (
                              <span className="text-muted-foreground ml-1">
                                ({shepherd.preferredName})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{shepherd.email}</TableCell>
                          <TableCell>{shepherd.phone || "N/A"}</TableCell>
                          <TableCell>
                            <MembersHoverCard
                              shepherdId={shepherd._id}
                              memberCount={memberCount}
                              members={shepherdMembers.get(shepherd._id) || []}
                              token={token}
                            />
                          </TableCell>
                          <TableCell>
                            {shepherd.status === "active" ? (
                              <Badge variant="default">Active</Badge>
                            ) : shepherd.status === "on_leave" ? (
                              <Badge variant="secondary">On Leave</Badge>
                            ) : (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedShepherd(shepherd);
                                    setViewDialogOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedShepherd(shepherd);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleExportCSV([shepherd])}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Export CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExportPDF([shepherd])}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Export PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* View Dialog */}
      {selectedShepherd && (
        <ViewUserDialog
          open={viewDialogOpen}
          onOpenChange={(open) => {
            setViewDialogOpen(open);
            if (!open) {
              setSelectedShepherd(null);
            }
          }}
          user={selectedShepherd}
        />
      )}

      {/* Edit Dialog */}
      {selectedShepherd && (
        <EditShepherdDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedShepherd(null);
            }
          }}
          user={selectedShepherd}
        />
      )}
    </div>
  );
}
