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
import { Label } from "@/components/ui/label";

const pastorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredName: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dateOfBirth: z.string().optional(),
  ordinationDate: z.string().optional(),
  homeAddress: z.string().optional(),
  qualification: z.string().optional(),
  yearsInMinistry: z.number().min(0).optional(),
  ministryFocus: z.array(z.string()).optional(),
  supervisedZones: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type PastorFormValues = z.infer<typeof pastorSchema>;

interface EditPastorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    _id: Id<"users">;
    name: string;
    phone?: string;
    whatsappNumber?: string;
    preferredName?: string;
    gender?: "male" | "female" | "other";
    dateOfBirth?: number;
    ordinationDate?: number;
    homeAddress?: string;
    qualification?: string;
    yearsInMinistry?: number;
    ministryFocus?: string[];
    supervisedZones?: string[];
    notes?: string;
    profilePhotoId?: Id<"_storage">;
  };
}

export function EditPastorDialog({ open, onOpenChange, user }: EditPastorDialogProps): React.JSX.Element {
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

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const form = useForm<PastorFormValues>({
    resolver: zodResolver(pastorSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      whatsappNumber: user.whatsappNumber || "",
      preferredName: user.preferredName || "",
      gender: user.gender,
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
      ordinationDate: user.ordinationDate
        ? new Date(user.ordinationDate).toISOString().split("T")[0]
        : "",
      homeAddress: user.homeAddress || "",
      qualification: user.qualification || "",
      yearsInMinistry: user.yearsInMinistry,
      ministryFocus: user.ministryFocus || [],
      supervisedZones: user.supervisedZones || [],
      notes: user.notes || "",
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
      ordinationDate: user.ordinationDate
        ? new Date(user.ordinationDate).toISOString().split("T")[0]
        : "",
      homeAddress: user.homeAddress || "",
      qualification: user.qualification || "",
      yearsInMinistry: user.yearsInMinistry,
      ministryFocus: user.ministryFocus || [],
      supervisedZones: user.supervisedZones || [],
      notes: user.notes || "",
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

  const onSubmit = async (data: PastorFormValues) => {
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
      if (data.ordinationDate) {
        const date = new Date(data.ordinationDate);
        if (!isNaN(date.getTime())) {
          submitData.ordinationDate = date.getTime();
        }
      }

      // Include all other fields
      Object.keys(data).forEach((key) => {
        if (key !== "dateOfBirth" && key !== "ordinationDate" && data[key as keyof typeof data] !== undefined) {
          submitData[key] = data[key as keyof typeof data];
        }
      });

      // Upload photo if selected
      if (photoFile) {
        await uploadPhoto();
      }

      await updateUserProfile({ token, userId: user._id, ...submitData });
      toast.success("Pastor updated successfully");
      setPhotoFile(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update pastor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Pastor
          </DialogTitle>
          <DialogDescription>
            Update pastor information
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Photo Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Profile Photo</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Update the profile photo for this pastor
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

            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Basic Information</Label>
                <p className="text-sm text-muted-foreground">
                  Essential details about the pastor
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
                name="ordinationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordination Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualification</FormLabel>
                    <FormControl>
                      <Input placeholder="Master of Divinity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearsInMinistry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years in Ministry</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="15"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="homeAddress"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Home Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, City, State" {...field} />
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
                      <Textarea placeholder="Additional notes..." {...field} />
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
                Update Pastor
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
