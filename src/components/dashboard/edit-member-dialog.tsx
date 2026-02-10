"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Pencil, Image as ImageIcon, Camera, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const memberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional(),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().optional(),
  nearestLandmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateJoinedChurch: z.string().optional(),
  baptismDate: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["new_convert", "first_timer", "established", "visitor", "inactive"]).optional(),
  shepherdId: z.string().optional(),
  // Marital information
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  weddingAnniversaryDate: z.string().optional(),
  spouseName: z.string().optional(),
  childrenCount: z.number().min(0).optional(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    preferredName?: string;
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
  };
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
}: EditMemberDialogProps): React.JSX.Element {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const updateMember = useMutation(api.members.update);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadProfilePhoto = useMutation(api.storage.uploadProfilePhoto);
  const getFileUrl = useQuery(
    api.storage.getFileUrl,
    token && member.profilePhotoId
      ? { token, storageId: member.profilePhotoId }
      : "skip"
  );
  const shepherds = useQuery(
    api.attendance.getShepherds,
    token ? { token } : "skip"
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      preferredName: member.preferredName || "",
      gender: member.gender || "male",
      dateOfBirth: member.dateOfBirth
        ? new Date(member.dateOfBirth).toISOString().split("T")[0]
        : "",
      phone: member.phone || "",
      whatsappNumber: member.whatsappNumber || "",
      email: member.email || "",
      address: member.address || "",
      nearestLandmark: member.nearestLandmark || "",
      city: member.city || "",
      state: member.state || "",
      zipCode: member.zipCode || "",
      country: member.country || "",
      dateJoinedChurch: member.dateJoinedChurch
        ? new Date(member.dateJoinedChurch).toISOString().split("T")[0]
        : "",
      baptismDate: member.baptismDate
        ? new Date(member.baptismDate).toISOString().split("T")[0]
        : "",
      occupation: member.occupation || "",
      emergencyContactName: member.emergencyContactName || "",
      emergencyContactPhone: member.emergencyContactPhone || "",
      notes: member.notes || "",
      status: member.status || "established",
      shepherdId: member.shepherdId || "",
      maritalStatus: member.maritalStatus,
      weddingAnniversaryDate: member.weddingAnniversaryDate
        ? new Date(member.weddingAnniversaryDate).toISOString().split("T")[0]
        : "",
      spouseName: member.spouseName || "",
      childrenCount: member.childrenCount,
    },
  });

  const maritalStatus = form.watch("maritalStatus");

  // Reset form and photo preview when member changes
  React.useEffect(() => {
    form.reset({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      preferredName: member.preferredName || "",
      gender: member.gender || "male",
      dateOfBirth: member.dateOfBirth
        ? new Date(member.dateOfBirth).toISOString().split("T")[0]
        : "",
      phone: member.phone || "",
      whatsappNumber: member.whatsappNumber || "",
      email: member.email || "",
      address: member.address || "",
      nearestLandmark: member.nearestLandmark || "",
      city: member.city || "",
      state: member.state || "",
      zipCode: member.zipCode || "",
      country: member.country || "",
      dateJoinedChurch: member.dateJoinedChurch
        ? new Date(member.dateJoinedChurch).toISOString().split("T")[0]
        : "",
      baptismDate: member.baptismDate
        ? new Date(member.baptismDate).toISOString().split("T")[0]
        : "",
      occupation: member.occupation || "",
      emergencyContactName: member.emergencyContactName || "",
      emergencyContactPhone: member.emergencyContactPhone || "",
      notes: member.notes || "",
      status: member.status || "established",
      shepherdId: member.shepherdId || "",
      maritalStatus: member.maritalStatus,
      weddingAnniversaryDate: member.weddingAnniversaryDate
        ? new Date(member.weddingAnniversaryDate).toISOString().split("T")[0]
        : "",
      spouseName: member.spouseName || "",
      childrenCount: member.childrenCount,
    });
    // Reset photo file and preview
    setPhotoFile(null);
    // Set photo preview from existing photo URL if available
    if (getFileUrl) {
      setPhotoPreview(getFileUrl);
    } else {
      setPhotoPreview(null);
    }
  }, [member._id, member.profilePhotoId, getFileUrl, form]);

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload photo and get storage ID
  const uploadPhoto = async (): Promise<Id<"_storage"> | null> => {
    if (!photoFile || !token) return null;

    setIsUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": photoFile.type },
        body: photoFile,
      });
      const { storageId } = await result.json();
      return storageId as Id<"_storage">;
    } catch (error: any) {
      toast.error("Failed to upload photo");
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: MemberFormValues) => {
    if (!token) {
      toast.error("Please log in");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photo if selected, otherwise preserve existing photo
      let profilePhotoId: Id<"_storage"> | undefined = member.profilePhotoId;
      if (photoFile) {
        const uploadedId = await uploadPhoto();
        if (uploadedId) {
          profilePhotoId = uploadedId;
        } else {
          // If upload failed, keep existing photo
          profilePhotoId = member.profilePhotoId;
        }
      }

      // Convert date strings to timestamps
      const dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth).getTime() : undefined;
      const dateJoinedChurch = data.dateJoinedChurch
        ? new Date(data.dateJoinedChurch).getTime()
        : undefined;
      const baptismDate = data.baptismDate ? new Date(data.baptismDate).getTime() : undefined;
      const weddingAnniversaryDate = data.weddingAnniversaryDate
        ? new Date(data.weddingAnniversaryDate).getTime()
        : undefined;

      await updateMember({
        token,
        memberId: member._id,
        firstName: data.firstName,
        lastName: data.lastName,
        preferredName: data.preferredName || undefined,
        gender: data.gender,
        dateOfBirth,
        phone: data.phone || undefined,
        whatsappNumber: data.whatsappNumber || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        nearestLandmark: data.nearestLandmark || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zipCode: data.zipCode || undefined,
        country: data.country || undefined,
        dateJoinedChurch,
        baptismDate,
        occupation: data.occupation || undefined,
        emergencyContactName: data.emergencyContactName || undefined,
        emergencyContactPhone: data.emergencyContactPhone || undefined,
        profilePhotoId,
        notes: data.notes || undefined,
        status: data.status || undefined,
        shepherdId: data.shepherdId ? (data.shepherdId as Id<"users">) : undefined,
        maritalStatus: data.maritalStatus || undefined,
        weddingAnniversaryDate,
        spouseName: data.spouseName || undefined,
        childrenCount: data.childrenCount || undefined,
      });

      toast.success("Member updated successfully");
      setPhotoFile(null);
      setPhotoPreview(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Member
          </DialogTitle>
          <DialogDescription>
            Update member information
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {photoPreview ? (
                    <AvatarImage src={photoPreview} alt="Preview" />
                  ) : (
                    <AvatarFallback>
                      <ImageIcon className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <label
                  htmlFor="photo-upload-edit-member"
                  className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    id="photo-upload-edit-member"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              </div>
              <div className="flex-1">
                <Label>Profile Photo</Label>
                <p className="text-sm text-muted-foreground">
                  Optional. Click the camera icon to upload a photo (max 5MB)
                </p>
                {photoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(getFileUrl || null);
                    }}
                    className="mt-2"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove New Photo
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferredName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shepherdId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Shepherd</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shepherd" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shepherds?.map((shepherd) => (
                            <SelectItem key={shepherd._id} value={shepherd._id}>
                              {shepherd.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Address Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nearestLandmark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nearest Landmark</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Near the park" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Church Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Church Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateJoinedChurch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Joined Church</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="baptismDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baptism Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new_convert">New Convert</SelectItem>
                          <SelectItem value="first_timer">First Timer</SelectItem>
                          <SelectItem value="established">Established</SelectItem>
                          <SelectItem value="visitor">Visitor</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Marital Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Marital Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marital Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {maritalStatus === "married" && (
                  <>
                    <FormField
                      control={form.control}
                      name="weddingAnniversaryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wedding Anniversary Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="spouseName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spouse Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="childrenCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Children</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploadingPhoto}>
                {isSubmitting || isUploadingPhoto ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    Update Member
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
