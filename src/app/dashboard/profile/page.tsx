"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditProfileDialog } from "@/components/dashboard/edit-profile-dialog";
import { useAuth } from "@/contexts/auth-context";

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

function getRoleBadgeClassName(role: string): string {
  switch (role) {
    case "pastor":
      return "bg-blue-500 hover:bg-blue-600 text-white border-blue-500";
    default:
      return "";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [editProfileDialogOpen, setEditProfileDialogOpen] = React.useState(false);
  
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  const profilePhotoUrl = useQuery(
    api.storage.getFileUrl,
    token && currentUser?.profilePhotoId
      ? { token, storageId: currentUser.profilePhotoId }
      : "skip"
  );

  // Force refresh when profilePhotoId changes
  React.useEffect(() => {
    // This ensures the query refreshes when the photo ID changes
  }, [currentUser?.profilePhotoId]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!token) {
    router.push("/login");
    return null;
  }

  if (currentUser === undefined) {
    return (
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            View your profile information
          </p>
        </div>
      </div>

      {/* Profile Photo and Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Basic Information</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditProfileDialogOpen(true)}
            >
              <User className="mr-2 h-4 w-4" />
              Update Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              {profilePhotoUrl ? (
                <AvatarImage 
                  src={profilePhotoUrl} 
                  alt={currentUser.name}
                  className="object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                <Badge 
                  variant={getRoleBadgeVariant(currentUser.role)}
                  className={getRoleBadgeClassName(currentUser.role)}
                >
                  {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </Badge>
              </div>
              {currentUser.preferredName && (
                <p className="text-muted-foreground">({currentUser.preferredName})</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <div className="font-medium">{currentUser.email}</div>
            </div>

            {currentUser.phone && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </div>
                <div className="font-medium">{currentUser.phone}</div>
              </div>
            )}

            {currentUser.whatsappNumber && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </div>
                <div className="font-medium">{currentUser.whatsappNumber}</div>
              </div>
            )}

            {currentUser.gender && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Gender
                </div>
                <div className="font-medium capitalize">{currentUser.gender}</div>
              </div>
            )}

            {currentUser.dateOfBirth && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date of Birth
                </div>
                <div className="font-medium">{formatDate(currentUser.dateOfBirth)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role-Specific Information */}
      {(currentUser.role === "pastor" || currentUser.role === "shepherd") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {currentUser.role === "pastor" ? "Pastor" : "Shepherd"} Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentUser.role === "pastor" && currentUser.ordinationDate && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Ordination Date</div>
                <div className="font-medium">{formatDate(currentUser.ordinationDate)}</div>
              </div>
            )}

            {currentUser.role === "shepherd" && currentUser.commissioningDate && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Commissioning Date</div>
                <div className="font-medium">{formatDate(currentUser.commissioningDate)}</div>
              </div>
            )}

            {currentUser.occupation && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Occupation</div>
                <div className="font-medium">{currentUser.occupation}</div>
              </div>
            )}

            {currentUser.educationalBackground && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Educational Background</div>
                <div className="font-medium">{currentUser.educationalBackground}</div>
              </div>
            )}

            {currentUser.status && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <Badge variant={currentUser.status === "active" ? "default" : "secondary"}>
                  {currentUser.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Badge>
              </div>
            )}

            {currentUser.homeAddress && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Home Address
                </div>
                <div className="font-medium">{currentUser.homeAddress}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Account Status</span>
            <Badge variant={currentUser.isActive ? "default" : "secondary"}>
              {currentUser.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {currentUser.createdAt && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm font-medium">{formatDate(currentUser.createdAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push("/dashboard/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Update Settings
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      {currentUser && (
        <EditProfileDialog
          open={editProfileDialogOpen}
          onOpenChange={setEditProfileDialogOpen}
          user={{
            _id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            whatsappNumber: currentUser.whatsappNumber,
            preferredName: currentUser.preferredName,
            gender: currentUser.gender,
            dateOfBirth: currentUser.dateOfBirth,
            profilePhotoId: currentUser.profilePhotoId,
          }}
        />
      )}
    </div>
  );
}
