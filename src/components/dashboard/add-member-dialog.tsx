"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, UserPlus, Upload, FileDown, X, Image as ImageIcon, Camera } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { convertDateToTimestamp, getUserFriendlyError, SUCCESS_SCRIPTURES, ERROR_SCRIPTURES } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const memberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional(),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(1, "Phone is required"),
  whatsappNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  nearestLandmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateJoinedChurch: z.string().min(1, "Date joined church is required"),
  baptismDate: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["new_convert", "first_timer", "established", "visitor", "inactive"]).optional(),
  shepherdId: z.string().min(1, "Shepherd is required"),
  regionId: z.string().optional(), // Select region to show bacentas in that region
  bacentaId: z.string().min(1, "Bacenta is required"),
  // Marital information
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  weddingAnniversaryDate: z.string().optional(),
  spouseName: z.string().optional(),
  childrenCount: z.number().min(0).optional(),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps): React.JSX.Element {
  const { token } = useAuth();
  const createMember = useMutation(api.members.create);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadProfilePhoto = useMutation(api.storage.uploadProfilePhoto);
  const shepherds = useQuery(
    api.attendance.getShepherds,
    token ? { token } : "skip"
  );
  const regions = useQuery(
    api.regions.listRegionsForSelect,
    token ? { token } : "skip"
  );
  const allBacentas = useQuery(
    api.regions.listBacentasForSelect,
    token ? { token } : "skip"
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      preferredName: "",
      gender: "male",
      dateOfBirth: "",
      phone: "",
      whatsappNumber: "",
      email: "",
      address: "",
      nearestLandmark: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      dateJoinedChurch: "",
      baptismDate: "",
      occupation: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
      status: "established",
      shepherdId: "",
      regionId: "",
      bacentaId: "",
      maritalStatus: undefined,
      weddingAnniversaryDate: "",
      spouseName: "",
      childrenCount: undefined,
    },
  });

  const selectedRegionId = form.watch("regionId");
  const bacentasInRegion = useQuery(
    api.regions.listBacentasByRegionForSelect,
    token && selectedRegionId && selectedRegionId !== "" ? { token, regionId: selectedRegionId as Id<"regions"> } : "skip"
  );

  const maritalStatus = form.watch("maritalStatus");

  // Auto-select shepherd when there's only one (e.g. shepherd adding to themselves)
  React.useEffect(() => {
    if (shepherds?.length === 1 && !form.getValues("shepherdId")) {
      form.setValue("shepherdId", shepherds[0]._id);
    }
  }, [shepherds, form]);

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
      
      if (!uploadUrl) {
        throw new Error("Failed to get upload URL");
      }
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": photoFile.type },
        body: photoFile,
      });
      
      if (!result.ok) {
        throw new Error(`Upload failed with status ${result.status}`);
      }
      
      const { storageId } = await result.json();
      if (!storageId) {
        throw new Error("No storage ID returned from upload");
      }
      
      return storageId as Id<"_storage">;
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error.message || "Failed to upload photo");
      toast.error(errorInfo.message, {
        description: errorInfo.scripture || ERROR_SCRIPTURES.upload,
        duration: 6000,
      });
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const headers = [
      "firstName",
      "lastName",
      "preferredName",
      "gender",
      "dateOfBirth",
      "phone",
      "whatsappNumber",
      "email",
      "address",
      "nearestLandmark",
      "city",
      "state",
      "zipCode",
      "country",
      "dateJoinedChurch",
      "baptismDate",
      "occupation",
      "emergencyContactName",
      "emergencyContactPhone",
      "status",
      "shepherdId",
      "bacentaId",
      "maritalStatus",
      "weddingAnniversaryDate",
      "spouseName",
      "childrenCount",
    ];

    const exampleRow = [
      "John",
      "Doe",
      "Johnny",
      "male",
      "1990-01-01",
      "+1234567890",
      "+1234567890",
      "john@example.com",
      "123 Main St",
      "Near the park",
      "City",
      "State",
      "12345",
      "Country",
      "2020-01-01",
      "2020-06-15",
      "Teacher",
      "Jane Doe",
      "+1234567891",
      "established",
      "",
      "",
      "married",
      "2015-06-15",
      "Jane Doe",
      "2",
    ];

    const csvContent = [headers, exampleRow]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "members_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Template downloaded");
  };

  // Convert lowercase/snake_case/camelCase header to camelCase
  const toCamelCase = (str: string): string => {
    const lowerStr = str.toLowerCase();
    
    // If already camelCase, return as is
    if (/^[a-z]+[A-Z]/.test(str)) {
      return str;
    }

    // Handle common camelCase field mappings
    const fieldMap: Record<string, string> = {
      firstname: "firstName",
      first_name: "firstName",
      lastname: "lastName",
      last_name: "lastName",
      preferredname: "preferredName",
      preferred_name: "preferredName",
      gender: "gender",
      dateofbirth: "dateOfBirth",
      date_of_birth: "dateOfBirth",
      phone: "phone",
      whatsappnumber: "whatsappNumber",
      whatsapp_number: "whatsAppNumber",
      email: "email",
      address: "address",
      nearestlandmark: "nearestLandmark",
      nearest_landmark: "nearestLandmark",
      city: "city",
      state: "state",
      zipcode: "zipCode",
      zip_code: "zipCode",
      country: "country",
      datejoinedchurch: "dateJoinedChurch",
      date_joined_church: "dateJoinedChurch",
      baptismdate: "baptismDate",
      baptism_date: "baptismDate",
      occupation: "occupation",
      emergencycontactname: "emergencyContactName",
      emergency_contact_name: "emergencyContactName",
      emergencycontactphone: "emergencyContactPhone",
      emergency_contact_phone: "emergencyContactPhone",
      status: "status",
      shepherdid: "shepherdId",
      shepherd_id: "shepherdId",
      maritalstatus: "maritalStatus",
      marital_status: "maritalStatus",
      weddinganniversarydate: "weddingAnniversaryDate",
      wedding_anniversary_date: "weddingAnniversaryDate",
      spousename: "spouseName",
      spouse_name: "spouseName",
      childrencount: "childrenCount",
      children_count: "childrenCount",
    };

    if (fieldMap[lowerStr]) {
      return fieldMap[lowerStr];
    }

    // Convert snake_case to camelCase
    return str
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^[a-z]/, (letter) => letter.toLowerCase());
  };

  // Parse CSV file with proper handling of quoted fields
  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          
          // Handle different line endings
          const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          const lines = normalizedText.split("\n").filter((line) => line.trim());
          
          if (lines.length < 2) {
            reject(new Error("CSV file must have at least a header row and one data row"));
            return;
          }

          // Parse CSV line handling quoted fields
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = "";
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  // Escaped quote
                  current += '"';
                  i++; // Skip next quote
                } else {
                  // Toggle quote state
                  inQuotes = !inQuotes;
                }
              } else if (char === "," && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            
            // Add last field
            result.push(current.trim());
            return result;
          };

          const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
          const data: any[] = [];
          const validationErrors: string[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, "").trim());
            const row: any = {};

            headers.forEach((header, index) => {
              const value = values[index] || "";
              if (value) {
                const camelCaseKey = toCamelCase(header);
                
                // Handle special field types
                if (
                  camelCaseKey === "dateOfBirth" ||
                  camelCaseKey === "dateJoinedChurch" ||
                  camelCaseKey === "baptismDate" ||
                  camelCaseKey === "weddingAnniversaryDate"
                ) {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    row[camelCaseKey] = date.getTime();
                  } else {
                    validationErrors.push(`Row ${i + 1}: Invalid date format for ${header}: ${value}`);
                  }
                } else if (camelCaseKey === "shepherdId") {
                  // Store shepherdId as-is (will be resolved during import)
                  if (value && value !== "none" && value !== "") {
                    row.shepherdId = value;
                  }
                } else if (camelCaseKey === "bacentaId") {
                  // Store bacentaId as-is (will be resolved during import)
                  if (value && value !== "none" && value !== "") {
                    row.bacentaId = value;
                  }
                } else if (camelCaseKey === "childrenCount") {
                  const parsed = parseInt(value);
                  if (!isNaN(parsed)) {
                    row.childrenCount = parsed;
                  }
                } else {
                  row[camelCaseKey] = value;
                }
              }
            });

            // Validate required fields
            const missingFields: string[] = [];
            if (!row.firstName) missingFields.push("firstName");
            if (!row.lastName) missingFields.push("lastName");
            if (!row.gender) missingFields.push("gender");
            if (!row.dateOfBirth) missingFields.push("dateOfBirth");
            if (!row.phone) missingFields.push("phone");
            if (!row.address) missingFields.push("address");
            if (!row.dateJoinedChurch) missingFields.push("dateJoinedChurch");
            if (!row.shepherdId) missingFields.push("shepherdId");
            if (!row.bacentaId) missingFields.push("bacentaId");

            if (missingFields.length === 0) {
              data.push(row);
            } else {
              validationErrors.push(`Row ${i + 1}: Missing required fields: ${missingFields.join(", ")}`);
            }
          }

          if (validationErrors.length > 0) {
            console.warn("CSV Validation Warnings:", validationErrors);
          }

          resolve(data);
        } catch (error: any) {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  // Handle CSV import
  const handleCSVImport = async () => {
    if (!csvFile || !token) return;

    setIsSubmitting(true);
    setCsvError(null);

    try {
      const members = await parseCSV(csvFile);
      
      console.log("Parsed members:", members);
      console.log("Available shepherds:", shepherds);
      
      if (members.length === 0) {
        const errorInfo = getUserFriendlyError("No valid members found in CSV file. Please check that all required fields are present and valid.");
        setCsvError(errorInfo.message);
        toast.error(errorInfo.message, {
          description: errorInfo.scripture || ERROR_SCRIPTURES.validation,
          duration: 8000,
        });
        setIsSubmitting(false);
        return;
      }

      // Create members one by one (since there's no bulk create for members)
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Check if shepherds are loaded
      if (!shepherds || shepherds.length === 0) {
        setCsvError("Shepherds not loaded. Please wait a moment and try again.");
        setIsSubmitting(false);
        return;
      }

      for (const memberData of members) {
        try {
          // Resolve shepherdId if it's a name instead of an ID
          const providedShepherdId = memberData.shepherdId;
          
          if (!providedShepherdId) {
            throw new Error("Shepherd ID is required");
          }

          // Try to find shepherd by name or ID
          const shepherd = shepherds.find((s) => {
            const providedStr = String(providedShepherdId).toLowerCase().trim();
            const shepherdName = s.name.toLowerCase().trim();
            const shepherdId = s._id.toLowerCase();
            
            return shepherdName === providedStr || shepherdId === providedStr || s._id === providedShepherdId;
          });
          
          if (!shepherd) {
            throw new Error(`Shepherd "${providedShepherdId}" not found. Available shepherds: ${shepherds.map(s => s.name).join(", ")}`);
          }

          const shepherdId = shepherd._id;

          // Resolve bacentaId if it's a name instead of an ID
          let bacentaId: Id<"bacentas"> | undefined = undefined;
          if (memberData.bacentaId) {
            if (!allBacentas || allBacentas.length === 0) {
              throw new Error("Bacentas not loaded. Please wait a moment and try again.");
            }

            const providedBacentaId = memberData.bacentaId;
            const bacenta = allBacentas.find((b) => {
              const providedStr = String(providedBacentaId).toLowerCase().trim();
              const bacentaName = b.name.toLowerCase().trim();
              const bacentaIdStr = b._id.toLowerCase();
              
              return bacentaName === providedStr || bacentaIdStr === providedStr || b._id === providedBacentaId;
            });

            if (!bacenta) {
              throw new Error(`Bacenta "${providedBacentaId}" not found. Available bacentas: ${allBacentas.map(b => b.name).join(", ")}`);
            }

            bacentaId = bacenta._id;
          } else {
            throw new Error("Bacenta ID is required");
          }

          await createMember({
            token: token!,
            ...memberData,
            shepherdId: shepherdId,
            bacentaId: bacentaId,
          });
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${memberData.firstName || "Unknown"} ${memberData.lastName || ""}: ${error.message}`);
        }
      }

      if (errorCount > 0) {
        toast.warning(
          `Created ${successCount} members. ${errorCount} failed. Check console for details.`
        );
        console.error("CSV Import Errors:", errors);
      } else {
        toast.success(`Successfully created ${successCount} members`, {
          description: SUCCESS_SCRIPTURES.csvImported,
          duration: 6000,
        });
      }

      setCsvFile(null);
      form.reset();
    } catch (error: any) {
      setCsvError(error.message || "Failed to import CSV");
      toast.error(error.message || "Failed to import CSV");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: MemberFormValues) => {
    if (!token) {
      toast.error("Please log in");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photo if selected
      let profilePhotoId: Id<"_storage"> | undefined = undefined;
      if (photoFile) {
        const uploadedId = await uploadPhoto();
        if (!uploadedId) {
          // Photo upload failed, but allow submission without photo
          toast.warning("Photo upload failed. Continuing without photo.", {
            description: ERROR_SCRIPTURES.upload,
            duration: 5000,
          });
        } else {
          profilePhotoId = uploadedId;
        }
      }

      // Convert date strings to timestamps using utility
      const dateOfBirth = convertDateToTimestamp(data.dateOfBirth);
      const dateJoinedChurch = convertDateToTimestamp(data.dateJoinedChurch);
      const baptismDate = convertDateToTimestamp(data.baptismDate);
      const weddingAnniversaryDate = convertDateToTimestamp(data.weddingAnniversaryDate);

      if (!dateOfBirth || !dateJoinedChurch) {
        throw new Error("Date of birth and date joined church are required");
      }

      await createMember({
        token,
        firstName: data.firstName,
        lastName: data.lastName,
        preferredName: data.preferredName || undefined,
        gender: data.gender,
        dateOfBirth,
        phone: data.phone,
        whatsappNumber: data.whatsappNumber || undefined,
        email: data.email || undefined,
        address: data.address,
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
        shepherdId: data.shepherdId as Id<"users">,
        bacentaId: data.bacentaId as Id<"bacentas">,
        maritalStatus: data.maritalStatus || undefined,
        weddingAnniversaryDate,
        spouseName: data.spouseName || undefined,
        childrenCount: data.childrenCount || undefined,
      });

      toast.success("Member created successfully", {
        description: SUCCESS_SCRIPTURES.memberCreated,
        duration: 6000,
      });
      form.reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      onOpenChange(false);
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error.message || "Failed to create member");
      toast.error(errorInfo.message, {
        description: errorInfo.scripture || ERROR_SCRIPTURES.validation,
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Add a new church member to the system
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
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
                      htmlFor="photo-upload-member"
                      className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90"
                    >
                      <Camera className="h-4 w-4" />
                      <input
                        id="photo-upload-member"
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
                          setPhotoPreview(null);
                        }}
                        className="mt-2"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove Photo
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
                          <FormLabel>Date of Birth *</FormLabel>
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
                          <FormLabel>Assigned Shepherd *</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="regionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={(value) => {
                              field.onChange(value || "");
                              form.setValue("bacentaId", ""); // Reset bacenta when region changes
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regions?.map((region) => (
                                <SelectItem key={region._id} value={region._id}>
                                  {region.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select a region to show bacentas in that region below.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bacentaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bacenta *</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            disabled={!selectedRegionId || selectedRegionId === ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedRegionId ? "Select bacenta" : "Select a region first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bacentasInRegion?.map((bacenta) => (
                                <SelectItem key={bacenta._id} value={bacenta._id}>
                                  {bacenta.name}
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
                          <FormLabel>Phone *</FormLabel>
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
                          <FormLabel>Address *</FormLabel>
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
                          <FormLabel>Date Joined Church *</FormLabel>
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
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Member
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Bulk Import Members</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file to add multiple members at once
                  </p>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Label htmlFor="csv-upload-member" className="cursor-pointer">
                  <span className="text-primary hover:underline">
                    Click to upload CSV file
                  </span>
                  <input
                    id="csv-upload-member"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                        setCsvError(null);
                      }
                    }}
                  />
                </Label>
                {csvFile && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-sm">{csvFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCsvFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {csvError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{csvError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvError(null);
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCSVImport}
                  disabled={!csvFile || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
