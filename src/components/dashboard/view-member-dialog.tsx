"use client";

import * as React from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Eye, Mail, Phone, Calendar, MapPin, User, Users, Heart, Church } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ViewMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
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
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function ViewMemberDialog({ open, onOpenChange, member }: ViewMemberDialogProps) {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  
  const photoUrl = useQuery(
    api.storage.getFileUrl,
    token && member.profilePhotoId ? { token, storageId: member.profilePhotoId } : "skip"
  );

  // Fetch shepherd info from the list of shepherds
  const shepherds = useQuery(
    api.userAssignments.getShepherds,
    token ? { token } : "skip"
  );
  
  const shepherd = shepherds?.find((s) => s._id === member.shepherdId);

  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Member Details
          </DialogTitle>
          <DialogDescription>View complete member information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Photo and Name Header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="h-12 w-12">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={fullName} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{fullName}</h2>
                {member.status && (
                  <Badge variant={getStatusBadgeVariant(member.status)}>
                    {formatStatus(member.status)}
                  </Badge>
                )}
                {member.isActive ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
              {member.preferredName && (
                <p className="text-sm text-muted-foreground">({member.preferredName})</p>
              )}
              {member.customId && (
                <p className="text-sm text-muted-foreground">ID: {member.customId}</p>
              )}
              {member.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {member.email}
                </p>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {member.gender && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Gender</div>
                    <div className="capitalize">{member.gender}</div>
                  </div>
                )}

                {member.dateOfBirth && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>{formatDate(member.dateOfBirth)}</div>
                    </div>
                  </div>
                )}

                {member.maritalStatus && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Marital Status</div>
                    <div className="capitalize">{member.maritalStatus}</div>
                  </div>
                )}

                {member.maritalStatus === "married" && member.weddingAnniversaryDate && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Wedding Anniversary
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <div>{formatDate(member.weddingAnniversaryDate)}</div>
                    </div>
                  </div>
                )}

                {member.spouseName && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Spouse Name</div>
                    <div>{member.spouseName}</div>
                  </div>
                )}

                {member.childrenCount !== undefined && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Number of Children
                    </div>
                    <div>{member.childrenCount}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {member.phone && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Phone</div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>{member.phone}</div>
                  </div>
                </div>
              )}

              {member.whatsappNumber && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">WhatsApp</div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>{member.whatsappNumber}</div>
                  </div>
                </div>
              )}

              {member.emergencyContactName && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Emergency Contact
                  </div>
                  <div>{member.emergencyContactName}</div>
                  {member.emergencyContactPhone && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3" />
                      {member.emergencyContactPhone}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          {member.address && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div>{member.address}</div>
                      {member.nearestLandmark && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Nearest Landmark: {member.nearestLandmark}
                        </div>
                      )}
                      {(member.city || member.state || member.zipCode || member.country) && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {[member.city, member.state, member.zipCode, member.country]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Church Information */}
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Church Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {member.dateJoinedChurch && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    Date Joined Church
                  </div>
                  <div className="flex items-center gap-2">
                    <Church className="h-4 w-4 text-muted-foreground" />
                    <div>{formatDate(member.dateJoinedChurch)}</div>
                  </div>
                </div>
              )}

              {member.baptismDate && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Baptism Date</div>
                  <div className="flex items-center gap-2">
                    <Church className="h-4 w-4 text-muted-foreground" />
                    <div>{formatDate(member.baptismDate)}</div>
                  </div>
                </div>
              )}

              {shepherd && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Assigned Shepherd</div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>{shepherd.name}</div>
                  </div>
                </div>
              )}

              {member.occupation && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Occupation</div>
                  <div>{member.occupation}</div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {member.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Metadata</h3>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Created At</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>{formatDate(member.createdAt)}</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Last Updated</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>{formatDate(member.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
