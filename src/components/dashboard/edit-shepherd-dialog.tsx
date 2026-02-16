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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const shepherdSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredName: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  dateOfBirth: z.string().optional(),
  commissioningDate: z.string().optional(),
  occupation: z.string().optional(),
  status: z.enum(["active", "on_leave", "inactive"]).optional(),
  overseerId: z.string().optional(),
  educationalBackground: z.string().optional(),
  // Marital information
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  weddingAnniversaryDate: z.string().optional(),
  spouseName: z.string().optional(),
  spouseOccupation: z.string().optional(),
  childrenCount: z.number().min(0).optional(),
});

type ShepherdFormValues = z.infer<typeof shepherdSchema>;

interface EditShepherdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    _id: Id<"users">;
    name: string;
    phone?: string;
    whatsappNumber?: string;
    preferredName?: string;
    gender?: "male" | "female";
    dateOfBirth?: number;
    commissioningDate?: number;
    occupation?: string;
    status?: "active" | "on_leave" | "inactive";
    overseerId?: Id<"users">;
    profilePhotoId?: Id<"_storage">;
    educationalBackground?: string;
    maritalStatus?: "single" | "married" | "divorced" | "widowed";
    weddingAnniversaryDate?: number;
    spouseName?: string;
    spouseOccupation?: string;
    childrenCount?: number;
  };
}

export function EditShepherdDialog({
  open,
  onOpenChange,
  user,
}: EditShepherdDialogProps): React.JSX.Element {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const updateUserProfile = useMutation(api.auth.updateUserProfile);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadProfilePhoto = useMutation(api.storage.uploadProfilePhoto);
  const getFileUrl = useQuery(
    api.storage.getFileUrl,
    token && user.profilePhotoId
      ? { token, storageId: user.profilePhotoId }
      : "skip"
  );
  const pastors = useQuery(
    api.userAssignments.getPastors,
    token ? { token } : "skip"
  );
  const regions = useQuery(
    api.regions.listRegionsForSelect,
    token ? { token } : "skip"
  );
  const shepherdBacentas = useQuery(
    api.regions.getBacentasForShepherd,
    token && open ? { token, shepherdId: user._id } : "skip"
  );
  const [selectedRegionId, setSelectedRegionId] = React.useState<Id<"regions"> | null>(null);
  const [selectedBacentaIds, setSelectedBacentaIds] = React.useState<Id<"bacentas">[]>([]);
  const bacentasInRegion = useQuery(
    api.regions.listBacentasByRegionForSelect,
    token && selectedRegionId ? { token, regionId: selectedRegionId } : "skip"
  );
  const setShepherdBacentas = useMutation(api.regions.setShepherdBacentas);

  React.useEffect(() => {
    if (!open) return;
    const list = shepherdBacentas?.filter((b): b is NonNullable<typeof b> => b != null) ?? [];
    if (list.length > 0) {
      setSelectedBacentaIds(list.map((b) => b._id));
      setSelectedRegionId(list[0].regionId);
    } else if (shepherdBacentas && shepherdBacentas.length === 0) {
      setSelectedBacentaIds([]);
      setSelectedRegionId(null);
    }
  }, [open, user._id, shepherdBacentas]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const form = useForm<ShepherdFormValues>({
    resolver: zodResolver(shepherdSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      whatsappNumber: user.whatsappNumber || "",
      preferredName: user.preferredName || "",
      gender: user.gender,
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
      commissioningDate: user.commissioningDate
        ? new Date(user.commissioningDate).toISOString().split("T")[0]
        : "",
      occupation: user.occupation || "",
      status: user.status || "active",
      overseerId: user.overseerId || "none",
      educationalBackground: user.educationalBackground || "",
      maritalStatus: user.maritalStatus,
      weddingAnniversaryDate: user.weddingAnniversaryDate
        ? new Date(user.weddingAnniversaryDate).toISOString().split("T")[0]
        : "",
      spouseName: user.spouseName || "",
      spouseOccupation: user.spouseOccupation || "",
      childrenCount: user.childrenCount,
    },
  });

  // Set photo preview from existing photo URL
  React.useEffect(() => {
    if (getFileUrl && !photoFile) {
      setPhotoPreview(getFileUrl);
    }
  }, [getFileUrl, photoFile]);

  // Reset form when user changes
  React.useEffect(() => {
    form.reset({
      name: user.name || "",
      phone: user.phone || "",
      whatsappNumber: user.whatsappNumber || "",
      preferredName: user.preferredName || "",
      gender: user.gender,
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
      commissioningDate: user.commissioningDate
        ? new Date(user.commissioningDate).toISOString().split("T")[0]
        : "",
      occupation: user.occupation || "",
      status: user.status || "active",
      overseerId: user.overseerId || "none",
      educationalBackground: user.educationalBackground || "",
    });
    // Reset photo preview to existing photo
    if (getFileUrl && !photoFile) {
      setPhotoPreview(getFileUrl);
    } else if (!getFileUrl) {
      setPhotoPreview(null);
    }
  }, [user, form, getFileUrl, photoFile]);

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
      
      // Upload the photo to the user's profile
      await uploadProfilePhoto({ token, storageId, userId: user._id });
      
      return storageId as Id<"_storage">;
    } catch (error: any) {
      toast.error("Failed to upload photo");
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: ShepherdFormValues) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      const submitData: any = {};

      // Convert date strings to timestamps
      if (data.dateOfBirth) {
        const date = new Date(data.dateOfBirth);
        if (!isNaN(date.getTime())) {
          submitData.dateOfBirth = date.getTime();
        }
      }
      if (data.commissioningDate) {
        const date = new Date(data.commissioningDate);
        if (!isNaN(date.getTime())) {
          submitData.commissioningDate = date.getTime();
        }
      }

      if (data.overseerId && data.overseerId !== "none") {
        submitData.overseerId = data.overseerId as any;
      }

      if (data.weddingAnniversaryDate) {
        const date = new Date(data.weddingAnniversaryDate);
        if (!isNaN(date.getTime())) {
          submitData.weddingAnniversaryDate = date.getTime();
        }
      }

      // Include all other fields
      Object.keys(data).forEach((key) => {
        if (
          key !== "dateOfBirth" &&
          key !== "commissioningDate" &&
          key !== "overseerId" &&
          key !== "weddingAnniversaryDate" &&
          data[key as keyof typeof data] !== undefined
        ) {
          submitData[key] = data[key as keyof typeof data];
        }
      });

      // Upload photo if selected
      if (photoFile) {
        await uploadPhoto();
      }

      await updateUserProfile({ token, userId: user._id, ...submitData });
      await setShepherdBacentas({ token, shepherdId: user._id, bacentaIds: selectedBacentaIds });
      toast.success("Shepherd updated successfully");
      setPhotoFile(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update shepherd");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Shepherd
          </DialogTitle>
          <DialogDescription>Update shepherd information</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Photo Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Profile Photo</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Update the profile photo for this shepherd
                </p>
              </div>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  {photoPreview ? (
                    <AvatarImage src={photoPreview} alt="Preview" />
                  ) : (
                    <AvatarFallback>
                      <Camera className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Label
                    htmlFor="photo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {photoFile ? "Change Photo" : "Upload Photo"}
                  </Label>
                  {photoFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(getFileUrl || null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Max 5MB. JPG, PNG, or GIF.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Basic Information Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Basic Information</Label>
                <p className="text-sm text-muted-foreground">
                  Essential details about the shepherd
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
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
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
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
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
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
              </div>
            </div>

            <Separator />

            {/* Ministry Information Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Ministry Information</Label>
                <p className="text-sm text-muted-foreground">
                  Details about the shepherd's ministry role
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="commissioningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commissioning Date</FormLabel>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overseerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overseer (Pastor)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pastor" />
                          </SelectTrigger>
                        </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {pastors?.map((pastor) => (
                              <SelectItem key={pastor._id} value={pastor._id}>
                                {pastor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 space-y-2">
                  <Label>Region</Label>
                  <Select
                    value={selectedRegionId ?? "none"}
                    onValueChange={(v) => {
                      setSelectedRegionId(v === "none" ? null : (v as Id<"regions">));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {regions?.map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a region to assign or change bacentas. A shepherd can have multiple bacentas.
                  </p>
                </div>

                {selectedRegionId && (
                  <div className="md:col-span-2 space-y-2">
                    <Label>Bacentas</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                      {bacentasInRegion?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bacentas in this region.</p>
                      ) : (
                        bacentasInRegion?.map((b) => (
                          <div key={b._id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-bacenta-${b._id}`}
                              checked={selectedBacentaIds.includes(b._id)}
                              onCheckedChange={(checked) => {
                                setSelectedBacentaIds((prev) =>
                                  checked ? [...prev, b._id] : prev.filter((id) => id !== b._id)
                                );
                              }}
                            />
                            <label
                              htmlFor={`edit-bacenta-${b._id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {b.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Professional Information Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Professional Information</Label>
                <p className="text-sm text-muted-foreground">
                  Career and educational background
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input placeholder="Teacher" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="educationalBackground"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Educational Background</FormLabel>
                      <FormControl>
                        <Input placeholder="Bachelor of Science" {...field} />
                      </FormControl>
                      <FormDescription>
                        Highest level of education completed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </div>

                <Separator />

                {/* Marital Information */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Marital Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Marital status and family details
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                    {form.watch("maritalStatus") === "married" && (
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
                                <Input placeholder="Spouse full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="spouseOccupation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Spouse Occupation</FormLabel>
                              <FormControl>
                                <Input placeholder="Spouse occupation" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="childrenCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Children</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>
            </div>

            <Separator />

            {/* Marital Information */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Marital Information</Label>
                <p className="text-sm text-muted-foreground">
                  Marital status and family details
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marital Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                {form.watch("maritalStatus") === "married" && (
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
                            <Input placeholder="Spouse full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="spouseOccupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spouse Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="Spouse occupation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="childrenCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Children</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setPhotoFile(null);
                  setPhotoPreview(getFileUrl || null);
                }}
                disabled={isSubmitting || isUploadingPhoto}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploadingPhoto}>
                {(isSubmitting || isUploadingPhoto) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Shepherd
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
