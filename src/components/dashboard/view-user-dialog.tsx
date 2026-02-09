"use client";

import * as React from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Eye, Mail, Phone, Calendar, MapPin, User, Shield } from "lucide-react";

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

interface ViewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    _id: Id<"users">;
    email: string;
    name: string;
    role: "admin" | "pastor" | "shepherd";
    isActive: boolean;
    phone?: string;
    whatsappNumber?: string;
    preferredName?: string;
    gender?: "male" | "female";
    dateOfBirth?: number;
    ordinationDate?: number;
    commissioningDate?: number;
    homeAddress?: string;
    qualification?: string;
    yearsInMinistry?: number;
    ministryFocus?: string[];
    supervisedZones?: string[];
    occupation?: string;
    assignedZone?: string;
    status?: "active" | "on_leave" | "inactive";
    notes?: string;
    profilePhotoId?: Id<"_storage">;
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

function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "admin":
      return "destructive";
    case "pastor":
      return "default";
    case "shepherd":
      return "secondary";
    default:
      return "outline";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ViewUserDialog({ open, onOpenChange, user }: ViewUserDialogProps) {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  
  const photoUrl = useQuery(
    api.storage.getFileUrl,
    token && user.profilePhotoId ? { token, storageId: user.profilePhotoId } : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>View complete user information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Photo and Name Header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="h-12 w-12">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
              {user.preferredName && (
                <p className="text-sm text-muted-foreground">({user.preferredName})</p>
              )}
              {user.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="flex items-center gap-2">
                    {user.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                    {user.status && (
                      <Badge variant="outline">{user.status.replace("_", " ")}</Badge>
                    )}
                  </div>
                </div>

                {user.phone && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Phone</div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>{user.phone}</div>
                    </div>
                  </div>
                )}

                {user.whatsappNumber && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">WhatsApp</div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>{user.whatsappNumber}</div>
                    </div>
                  </div>
                )}

                {user.gender && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Gender</div>
                    <div className="capitalize">{user.gender}</div>
                  </div>
                )}

                {user.dateOfBirth && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>{formatDate(user.dateOfBirth)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pastor-specific Information */}
          {user.role === "pastor" && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pastor Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {user.ordinationDate && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        Ordination Date
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>{formatDate(user.ordinationDate)}</div>
                      </div>
                    </div>
                  )}

                  {user.qualification && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        Qualification
                      </div>
                      <div>{user.qualification}</div>
                    </div>
                  )}

                  {user.yearsInMinistry !== undefined && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        Years in Ministry
                      </div>
                      <div>{user.yearsInMinistry} years</div>
                    </div>
                  )}

                  {user.homeAddress && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Home Address
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>{user.homeAddress}</div>
                      </div>
                    </div>
                  )}

                  {user.ministryFocus && user.ministryFocus.length > 0 && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Ministry Focus
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.ministryFocus.map((focus, index) => (
                          <Badge key={index} variant="outline">
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {user.supervisedZones && user.supervisedZones.length > 0 && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Supervised Zones
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.supervisedZones.map((zone, index) => (
                          <Badge key={index} variant="outline">
                            {zone}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Shepherd-specific Information */}
          {user.role === "shepherd" && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Shepherd Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {user.commissioningDate && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        Commissioning Date
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>{formatDate(user.commissioningDate)}</div>
                      </div>
                    </div>
                  )}

                  {user.occupation && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Occupation</div>
                      <div>{user.occupation}</div>
                    </div>
                  )}

                  {user.assignedZone && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        Assigned Zone
                      </div>
                      <div>{user.assignedZone}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {user.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.notes}</p>
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
                  <div>{formatDate(user.createdAt)}</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Last Updated</div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>{formatDate(user.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
