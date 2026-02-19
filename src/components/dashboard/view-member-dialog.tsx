"use client";

import * as React from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Eye, Mail, Phone, Calendar, MapPin, User, Users, Heart, Church, Printer, Download } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ConvexReactClient } from "convex/react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

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
  const { token } = useAuth();
  
  const photoUrl = useQuery(
    api.storage.getFileUrl,
    token && member.profilePhotoId ? { token, storageId: member.profilePhotoId } : "skip"
  );

  // Fetch shepherd info from the list of shepherds
  const shepherds = useQuery(
    api.attendance.getShepherds,
    token ? { token } : "skip"
  );
  
  const shepherd = shepherds?.find((s) => s._id === member.shepherdId);

  const fullName = `${member.firstName} ${member.lastName}`;

  // Helper function to convert image URL to base64
  const imageUrlToBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to convert image to base64"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return null;
    }
  };

  // Ref for printable content
  const printRef = useRef<HTMLDivElement>(null);

  // React-to-print hook
  const reactToPrintContent = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Member Details - ${fullName}`,
    pageStyle: `
      @page {
        margin: 2cm;
      }
      @media print {
        body {
          padding: 0;
        }
      }
    `,
  });

  const handlePrint = () => {
    // Temporarily show content for react-to-print to access
    if (printRef.current) {
      const originalStyles = {
        visibility: printRef.current.style.visibility,
        position: printRef.current.style.position,
        height: printRef.current.style.height,
        overflow: printRef.current.style.overflow,
      };
      
      printRef.current.style.visibility = 'visible';
      printRef.current.style.position = 'static';
      printRef.current.style.height = 'auto';
      printRef.current.style.overflow = 'visible';
      
      // Trigger print
      reactToPrintContent();
      
      // Restore original styles after a short delay
      setTimeout(() => {
        if (printRef.current) {
          printRef.current.style.visibility = originalStyles.visibility || 'hidden';
          printRef.current.style.position = originalStyles.position || 'absolute';
          printRef.current.style.height = originalStyles.height || '0';
          printRef.current.style.overflow = originalStyles.overflow || 'hidden';
        }
      }, 500);
    } else {
      reactToPrintContent();
    }
  };

  const handleDownloadPDF = async () => {
    const loadingToast = toast.loading("Preparing PDF...");

    try {
      let photoBase64: string | null = null;
      
      if (member.profilePhotoId && token) {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          const convexClient = new ConvexReactClient(convexUrl);
          try {
            const photoUrl = await convexClient.query(api.storage.getFileUrl, {
              token,
              storageId: member.profilePhotoId,
            });
            if (photoUrl) {
              photoBase64 = await imageUrlToBase64(photoUrl);
            }
          } catch (error) {
            console.error("Failed to load photo:", error);
          }
        }
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.dismiss(loadingToast);
        toast.error("Please allow popups to export PDF");
        return;
      }

      const photoHtml = photoBase64
        ? `<img src="${photoBase64}" alt="${fullName}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 2px solid #ddd;" />`
        : `<div style="width: 80px; height: 80px; border-radius: 50%; background-color: #3b82f6; color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px;">${getInitials(member.firstName, member.lastName)}</div>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Member Details - ${fullName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
              .header-info { flex: 1; }
              h1 { margin: 0 0 10px 0; font-size: 28px; }
              .badges { display: flex; gap: 10px; margin-top: 10px; }
              .badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
              .section { margin-bottom: 30px; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .field { margin-bottom: 15px; }
              .field-label { font-size: 12px; color: #666; margin-bottom: 5px; font-weight: bold; }
              .field-value { font-size: 14px; color: #333; }
              .full-width { grid-column: 1 / -1; }
              @media print { 
                @page { margin: 2cm; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              ${photoHtml}
              <div class="header-info">
                <h1>${fullName}</h1>
                ${member.preferredName ? `<p style="color: #666; margin: 5px 0;">(${member.preferredName})</p>` : ""}
                ${member.customId ? `<p style="color: #666; margin: 5px 0;">ID: ${member.customId}</p>` : ""}
                ${member.email ? `<p style="color: #666; margin: 5px 0;">${member.email}</p>` : ""}
                <div class="badges">
                  ${member.status ? `<span class="badge" style="background-color: #e0e0e0;">${formatStatus(member.status)}</span>` : ""}
                  ${member.isActive ? `<span class="badge" style="background-color: #4caf50; color: white;">Active</span>` : `<span class="badge" style="background-color: #f44336; color: white;">Inactive</span>`}
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Basic Information</div>
              <div class="grid">
                ${member.gender ? `<div class="field"><div class="field-label">Gender</div><div class="field-value">${member.gender.charAt(0).toUpperCase() + member.gender.slice(1)}</div></div>` : ""}
                ${member.dateOfBirth ? `<div class="field"><div class="field-label">Date of Birth</div><div class="field-value">${formatDate(member.dateOfBirth)}</div></div>` : ""}
                ${member.maritalStatus ? `<div class="field"><div class="field-label">Marital Status</div><div class="field-value">${member.maritalStatus.charAt(0).toUpperCase() + member.maritalStatus.slice(1)}</div></div>` : ""}
                ${member.maritalStatus === "married" && member.weddingAnniversaryDate ? `<div class="field"><div class="field-label">Wedding Anniversary</div><div class="field-value">${formatDate(member.weddingAnniversaryDate)}</div></div>` : ""}
                ${member.spouseName ? `<div class="field"><div class="field-label">Spouse Name</div><div class="field-value">${member.spouseName}</div></div>` : ""}
                ${member.childrenCount !== undefined ? `<div class="field"><div class="field-label">Number of Children</div><div class="field-value">${member.childrenCount}</div></div>` : ""}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Contact Information</div>
              <div class="grid">
                ${member.phone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${member.phone}</div></div>` : ""}
                ${member.whatsappNumber ? `<div class="field"><div class="field-label">WhatsApp</div><div class="field-value">${member.whatsappNumber}</div></div>` : ""}
                ${member.emergencyContactName ? `<div class="field full-width"><div class="field-label">Emergency Contact</div><div class="field-value">${member.emergencyContactName}${member.emergencyContactPhone ? ` - ${member.emergencyContactPhone}` : ""}</div></div>` : ""}
              </div>
            </div>

            ${member.address ? `
            <div class="section">
              <div class="section-title">Address</div>
              <div class="field">
                <div class="field-value">${member.address}${member.nearestLandmark ? `<br/><span style="color: #666; font-size: 12px;">Nearest Landmark: ${member.nearestLandmark}</span>` : ""}${(member.city || member.state || member.zipCode || member.country) ? `<br/><span style="color: #666; font-size: 12px;">${[member.city, member.state, member.zipCode, member.country].filter(Boolean).join(", ")}</span>` : ""}</div>
              </div>
            </div>
            ` : ""}

            <div class="section">
              <div class="section-title">Church Information</div>
              <div class="grid">
                ${member.dateJoinedChurch ? `<div class="field"><div class="field-label">Date Joined Church</div><div class="field-value">${formatDate(member.dateJoinedChurch)}</div></div>` : ""}
                ${member.baptismDate ? `<div class="field"><div class="field-label">Baptism Date</div><div class="field-value">${formatDate(member.baptismDate)}</div></div>` : ""}
                ${shepherd ? `<div class="field"><div class="field-label">Assigned Shepherd</div><div class="field-value">${shepherd.name}</div></div>` : ""}
                ${member.occupation ? `<div class="field"><div class="field-label">Occupation</div><div class="field-value">${member.occupation}</div></div>` : ""}
              </div>
            </div>

            ${member.notes ? `
            <div class="section">
              <div class="section-title">Notes</div>
              <div class="field">
                <div class="field-value" style="white-space: pre-wrap;">${member.notes}</div>
              </div>
            </div>
            ` : ""}

            <div class="section">
              <div class="section-title">Metadata</div>
              <div class="grid">
                <div class="field"><div class="field-label">Created At</div><div class="field-value">${formatDate(member.createdAt)}</div></div>
                <div class="field"><div class="field-label">Last Updated</div><div class="field-value">${formatDate(member.updatedAt)}</div></div>
              </div>
            </div>

            <p style="margin-top: 40px; color: #666; font-size: 12px; text-align: center;">
              Generated on: ${new Date().toLocaleString()}
            </p>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      toast.dismiss(loadingToast);
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Failed to export PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <DialogTitle>Member Details</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <DialogDescription>View complete member information</DialogDescription>
        </DialogHeader>

        {/* Printable content - hidden from screen but visible when printing */}
        <div ref={printRef} className="print-only-content" style={{ visibility: 'hidden', position: 'absolute', height: 0, overflow: 'hidden' }}>
          <style>{`
            @media print {
              @page {
                margin: 2cm;
              }
              body {
                padding: 0;
                font-family: Arial, sans-serif;
              }
              .print-only-content {
                visibility: visible !important;
                position: static !important;
                height: auto !important;
                overflow: visible !important;
              }
            }
          `}</style>
          <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
            {/* Printable Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", paddingBottom: "20px", borderBottom: "2px solid #ddd", marginBottom: "30px" }}>
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={fullName} 
                  style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid #ddd" }}
                />
              ) : (
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#3b82f6", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "24px" }}>
                  {getInitials(member.firstName, member.lastName)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0" }}>{fullName}</h2>
                {member.preferredName && (
                  <p style={{ color: "#666", margin: "5px 0", fontSize: "14px" }}>({member.preferredName})</p>
                )}
                {member.customId && (
                  <p style={{ color: "#666", margin: "5px 0", fontSize: "14px" }}>ID: {member.customId}</p>
                )}
                {member.email && (
                  <p style={{ color: "#666", margin: "5px 0", fontSize: "14px" }}>{member.email}</p>
                )}
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  {member.status && (
                    <span style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: "#e0e0e0" }}>
                      {formatStatus(member.status)}
                    </span>
                  )}
                  {member.isActive ? (
                    <span style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: "#4caf50", color: "white" }}>
                      Active
                    </span>
                  ) : (
                    <span style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: "#f44336", color: "white" }}>
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Basic Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {member.gender && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Gender</div>
                    <div style={{ fontSize: "14px", color: "#333", textTransform: "capitalize" }}>{member.gender}</div>
                  </div>
                )}
                {member.dateOfBirth && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Date of Birth</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{formatDate(member.dateOfBirth)}</div>
                  </div>
                )}
                {member.maritalStatus && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Marital Status</div>
                    <div style={{ fontSize: "14px", color: "#333", textTransform: "capitalize" }}>{member.maritalStatus}</div>
                  </div>
                )}
                {member.maritalStatus === "married" && member.weddingAnniversaryDate && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Wedding Anniversary</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{formatDate(member.weddingAnniversaryDate)}</div>
                  </div>
                )}
                {member.spouseName && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Spouse Name</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{member.spouseName}</div>
                  </div>
                )}
                {member.childrenCount !== undefined && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Number of Children</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{member.childrenCount}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Contact Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {member.phone && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Phone</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{member.phone}</div>
                  </div>
                )}
                {member.whatsappNumber && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>WhatsApp</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{member.whatsappNumber}</div>
                  </div>
                )}
                {member.emergencyContactName && (
                  <div style={{ marginBottom: "15px", gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Emergency Contact</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{member.emergencyContactName}{member.emergencyContactPhone ? ` - ${member.emergencyContactPhone}` : ""}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            {member.address && (
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Address</h3>
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ fontSize: "14px", color: "#333" }}>{member.address}</div>
                  {member.nearestLandmark && (
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>Nearest Landmark: {member.nearestLandmark}</div>
                  )}
                  {(member.city || member.state || member.zipCode || member.country) && (
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                      {[member.city, member.state, member.zipCode, member.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Church Information */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Church Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {member.dateJoinedChurch && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Date Joined Church</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{formatDate(member.dateJoinedChurch)}</div>
                  </div>
                )}
                {member.baptismDate && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Baptism Date</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{formatDate(member.baptismDate)}</div>
                  </div>
                )}
                {shepherd && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Assigned Shepherd</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{shepherd.name}</div>
                  </div>
                )}
                {member.occupation && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Occupation</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{member.occupation}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {member.notes && (
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Notes</h3>
                <p style={{ fontSize: "14px", color: "#333", whiteSpace: "pre-wrap" }}>{member.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Metadata</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "14px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ color: "#666", marginBottom: "5px" }}>Created At</div>
                  <div style={{ color: "#333" }}>{formatDate(member.createdAt)}</div>
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ color: "#666", marginBottom: "5px" }}>Last Updated</div>
                  <div style={{ color: "#333" }}>{formatDate(member.updatedAt)}</div>
                </div>
              </div>
            </div>

            <p style={{ marginTop: "40px", color: "#666", fontSize: "12px", textAlign: "center" }}>
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Visible content in dialog */}
        <div className="space-y-6 print:hidden">
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
