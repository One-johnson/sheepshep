"use client";

import * as React from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Eye, Mail, Phone, Calendar, MapPin, User, Shield, Printer, Download } from "lucide-react";

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
import { ConvexReactClient } from "convex/react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

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

function getRoleBadgeClassName(role: string): string {
  switch (role) {
    case "pastor":
      return "bg-blue-500 hover:bg-blue-600 text-white border-blue-500";
    default:
      return "";
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
    documentTitle: `User Details - ${user.name}`,
    pageStyle: `
      @page {
        margin: 2cm;
      }
      @media print {
        body {
          padding: 0;
          font-family: Arial, sans-serif;
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
      
      if (user.profilePhotoId && token) {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          const convexClient = new ConvexReactClient(convexUrl);
          try {
            const photoUrl = await convexClient.query(api.storage.getFileUrl, {
              token,
              storageId: user.profilePhotoId,
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
        ? `<img src="${photoBase64}" alt="${user.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 2px solid #ddd;" />`
        : `<div style="width: 80px; height: 80px; border-radius: 50%; background-color: #3b82f6; color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px;">${getInitials(user.name)}</div>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>User Details - ${user.name}</title>
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
                <h1>${user.name}</h1>
                ${user.preferredName ? `<p style="color: #666; margin: 5px 0;">(${user.preferredName})</p>` : ""}
                ${user.email ? `<p style="color: #666; margin: 5px 0;">${user.email}</p>` : ""}
                <div class="badges">
                  <span class="badge" style="background-color: ${user.role === "admin" ? "#f44336" : user.role === "pastor" ? "#2196f3" : "#4caf50"}; color: white;">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                  ${user.isActive ? `<span class="badge" style="background-color: #4caf50; color: white;">Active</span>` : `<span class="badge" style="background-color: #f44336; color: white;">Inactive</span>`}
                  ${user.status ? `<span class="badge" style="background-color: #e0e0e0;">${user.status.replace("_", " ")}</span>` : ""}
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Basic Information</div>
              <div class="grid">
                ${user.phone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${user.phone}</div></div>` : ""}
                ${user.whatsappNumber ? `<div class="field"><div class="field-label">WhatsApp</div><div class="field-value">${user.whatsappNumber}</div></div>` : ""}
                ${user.gender ? `<div class="field"><div class="field-label">Gender</div><div class="field-value">${user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}</div></div>` : ""}
                ${user.dateOfBirth ? `<div class="field"><div class="field-label">Date of Birth</div><div class="field-value">${formatDate(user.dateOfBirth)}</div></div>` : ""}
              </div>
            </div>

            ${user.role === "pastor" ? `
            <div class="section">
              <div class="section-title">Pastor Information</div>
              <div class="grid">
                ${user.ordinationDate ? `<div class="field"><div class="field-label">Ordination Date</div><div class="field-value">${formatDate(user.ordinationDate)}</div></div>` : ""}
                ${user.qualification ? `<div class="field"><div class="field-label">Qualification</div><div class="field-value">${user.qualification}</div></div>` : ""}
                ${user.yearsInMinistry !== undefined ? `<div class="field"><div class="field-label">Years in Ministry</div><div class="field-value">${user.yearsInMinistry} years</div></div>` : ""}
                ${user.homeAddress ? `<div class="field full-width"><div class="field-label">Home Address</div><div class="field-value">${user.homeAddress}</div></div>` : ""}
                ${user.ministryFocus && user.ministryFocus.length > 0 ? `<div class="field full-width"><div class="field-label">Ministry Focus</div><div class="field-value">${user.ministryFocus.join(", ")}</div></div>` : ""}
                ${user.supervisedZones && user.supervisedZones.length > 0 ? `<div class="field full-width"><div class="field-label">Supervised Zones</div><div class="field-value">${user.supervisedZones.join(", ")}</div></div>` : ""}
              </div>
            </div>
            ` : ""}

            ${user.role === "shepherd" ? `
            <div class="section">
              <div class="section-title">Shepherd Information</div>
              <div class="grid">
                ${user.commissioningDate ? `<div class="field"><div class="field-label">Commissioning Date</div><div class="field-value">${formatDate(user.commissioningDate)}</div></div>` : ""}
                ${user.occupation ? `<div class="field"><div class="field-label">Occupation</div><div class="field-value">${user.occupation}</div></div>` : ""}
                ${user.assignedZone ? `<div class="field"><div class="field-label">Assigned Zone</div><div class="field-value">${user.assignedZone}</div></div>` : ""}
              </div>
            </div>
            ` : ""}

            ${user.notes ? `
            <div class="section">
              <div class="section-title">Notes</div>
              <div class="field">
                <div class="field-value" style="white-space: pre-wrap;">${user.notes}</div>
              </div>
            </div>
            ` : ""}

            <div class="section">
              <div class="section-title">Metadata</div>
              <div class="grid">
                <div class="field"><div class="field-label">Created At</div><div class="field-value">${formatDate(user.createdAt)}</div></div>
                <div class="field"><div class="field-label">Last Updated</div><div class="field-value">${formatDate(user.updatedAt)}</div></div>
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
              <DialogTitle>User Details</DialogTitle>
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
          <DialogDescription>View complete user information</DialogDescription>
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
                  alt={user.name} 
                  style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid #ddd" }}
                />
              ) : (
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#3b82f6", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "24px" }}>
                  {getInitials(user.name)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 10px 0" }}>{user.name}</h2>
                {user.preferredName && (
                  <p style={{ color: "#666", margin: "5px 0", fontSize: "14px" }}>({user.preferredName})</p>
                )}
                {user.email && (
                  <p style={{ color: "#666", margin: "5px 0", fontSize: "14px" }}>{user.email}</p>
                )}
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <span style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: user.role === "admin" ? "#f44336" : user.role === "pastor" ? "#2196f3" : "#4caf50", color: "white" }}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                  {user.isActive ? (
                    <span style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: "#4caf50", color: "white" }}>
                      Active
                    </span>
                  ) : (
                    <span style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: "#f44336", color: "white" }}>
                      Inactive
                    </span>
                  )}
                  {user.status && (
                    <span style={{ padding: "4px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: "#e0e0e0" }}>
                      {user.status.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Basic Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {user.phone && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Phone</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{user.phone}</div>
                  </div>
                )}
                {user.whatsappNumber && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>WhatsApp</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{user.whatsappNumber}</div>
                  </div>
                )}
                {user.gender && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Gender</div>
                    <div style={{ fontSize: "14px", color: "#333", textTransform: "capitalize" }}>{user.gender}</div>
                  </div>
                )}
                {user.dateOfBirth && (
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Date of Birth</div>
                    <div style={{ fontSize: "14px", color: "#333" }}>{formatDate(user.dateOfBirth)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Pastor-specific Information */}
            {user.role === "pastor" && (
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Pastor Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {user.ordinationDate && (
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Ordination Date</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{formatDate(user.ordinationDate)}</div>
                    </div>
                  )}
                  {user.qualification && (
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Qualification</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{user.qualification}</div>
                    </div>
                  )}
                  {user.yearsInMinistry !== undefined && (
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Years in Ministry</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{user.yearsInMinistry} years</div>
                    </div>
                  )}
                  {user.homeAddress && (
                    <div style={{ marginBottom: "15px", gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Home Address</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{user.homeAddress}</div>
                    </div>
                  )}
                  {user.ministryFocus && user.ministryFocus.length > 0 && (
                    <div style={{ marginBottom: "15px", gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Ministry Focus</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{user.ministryFocus.join(", ")}</div>
                    </div>
                  )}
                  {user.supervisedZones && user.supervisedZones.length > 0 && (
                    <div style={{ marginBottom: "15px", gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Supervised Zones</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{user.supervisedZones.join(", ")}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shepherd-specific Information */}
            {user.role === "shepherd" && (
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Shepherd Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {user.commissioningDate && (
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Commissioning Date</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{formatDate(user.commissioningDate)}</div>
                    </div>
                  )}
                  {user.occupation && (
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Occupation</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{user.occupation}</div>
                    </div>
                  )}
                  {user.assignedZone && (
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px", fontWeight: "bold" }}>Assigned Zone</div>
                      <div style={{ fontSize: "14px", color: "#333" }}>{user.assignedZone}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {user.notes && (
              <div style={{ marginBottom: "30px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Notes</h3>
                <p style={{ fontSize: "14px", color: "#333", whiteSpace: "pre-wrap" }}>{user.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px", color: "#333" }}>Metadata</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "14px" }}>
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ color: "#666", marginBottom: "5px" }}>Created At</div>
                  <div style={{ color: "#333" }}>{formatDate(user.createdAt)}</div>
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ color: "#666", marginBottom: "5px" }}>Last Updated</div>
                  <div style={{ color: "#333" }}>{formatDate(user.updatedAt)}</div>
                </div>
              </div>
            </div>

            <p style={{ marginTop: "40px", color: "#666", fontSize: "12px", textAlign: "center" }}>
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Visible content in dialog */}
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
                <Badge 
                  variant={getRoleBadgeVariant(user.role)}
                  className={getRoleBadgeClassName(user.role)}
                >
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
