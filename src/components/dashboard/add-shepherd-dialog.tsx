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
import { Checkbox } from "@/components/ui/checkbox";
import { convertDateToTimestamp, getUserFriendlyError, SUCCESS_SCRIPTURES, ERROR_SCRIPTURES } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const shepherdSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

interface AddShepherdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddShepherdDialog({ open, onOpenChange }: AddShepherdDialogProps): React.JSX.Element {
  const { token } = useAuth();
  const createShepherd = useMutation(api.auth.createShepherd);
  const bulkAdd = useMutation(api.authUsers.bulkAdd);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadProfilePhoto = useMutation(api.storage.uploadProfilePhoto);
  const pastors = useQuery(
    api.userAssignments.getPastors,
    token ? { token } : "skip"
  );
  const regions = useQuery(
    api.regions.listRegionsForSelect,
    token ? { token } : "skip"
  );
  const [selectedRegionId, setSelectedRegionId] = React.useState<Id<"regions"> | null>(null);
  const bacentasInRegion = useQuery(
    api.regions.listBacentasByRegionForSelect,
    token && selectedRegionId ? { token, regionId: selectedRegionId } : "skip"
  );
  const selectedRegion = regions?.find((r) => r._id === selectedRegionId);
  const regionPastor = selectedRegion?.pastorId
    ? pastors?.find((p) => p._id === selectedRegion.pastorId)
    : null;

  const [selectedBacentaIds, setSelectedBacentaIds] = React.useState<Id<"bacentas">[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const form = useForm<ShepherdFormValues>({
    resolver: zodResolver(shepherdSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
      whatsappNumber: "",
      preferredName: "",
      gender: undefined,
      dateOfBirth: "",
      commissioningDate: "",
      occupation: "",
      status: "active",
      overseerId: "none",
      educationalBackground: "",
      maritalStatus: undefined,
      weddingAnniversaryDate: "",
      spouseName: "",
      spouseOccupation: "",
      childrenCount: undefined,
    },
  });

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
      "email",
      "password",
      "name",
      "phone",
      "whatsappNumber",
      "preferredName",
      "gender",
      "dateOfBirth",
      "commissioningDate",
      "occupation",
      "status",
      "overseerId",
      "educationalBackground",
      "maritalStatus",
      "weddingAnniversaryDate",
      "spouseName",
      "spouseOccupation",
      "childrenCount",
    ];

    const exampleRow = [
      "shepherd@example.com",
      "SecurePassword123!",
      "John Doe",
      "+1234567890",
      "+1234567890",
      "John",
      "male",
      "1990-01-01",
      "2020-06-15",
      "Teacher",
      "active",
      "",
      "Bachelor of Science",
      "married",
      "2015-06-15",
      "Jane Doe",
      "Nurse",
      "2",
    ];

    const csvContent = [headers, exampleRow]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "shepherds_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Template downloaded");
  };

  // Convert lowercase/snake_case/camelCase header to camelCase
  const toCamelCase = (str: string): string => {
    const lowerStr = str.toLowerCase();
    
    // Special case: convert whatsAppNumber (any case) to whatsappNumber (schema uses lowercase 'a')
    if (lowerStr === "whatsappnumber" || str === "whatsAppNumber") {
      return "whatsappNumber";
    }
    
    // If already camelCase (but not whatsAppNumber), return as is
    if (/^[a-z]+[A-Z]/.test(str) && str !== "whatsAppNumber") {
      return str;
    }

    // Handle common camelCase field mappings (for lowercase/snake_case input)
    const fieldMap: Record<string, string> = {
      email: "email",
      password: "password",
      name: "name",
      phone: "phone",
      whatsappnumber: "whatsappNumber",
      whatsapp_number: "whatsappNumber",
      preferredname: "preferredName",
      preferred_name: "preferredName",
      gender: "gender",
      dateofbirth: "dateOfBirth",
      date_of_birth: "dateOfBirth",
      commissioningdate: "commissioningDate",
      commissioning_date: "commissioningDate",
      occupation: "occupation",
      status: "status",
      overseerid: "overseerId",
      overseer_id: "overseerId",
      educationalbackground: "educationalBackground",
      educational_background: "educationalBackground",
      maritalstatus: "maritalStatus",
      marital_status: "maritalStatus",
      weddinganniversarydate: "weddingAnniversaryDate",
      wedding_anniversary_date: "weddingAnniversaryDate",
      spousename: "spouseName",
      spouse_name: "spouseName",
      spouseoccupation: "spouseOccupation",
      spouse_occupation: "spouseOccupation",
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

  // Parse CSV file
  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = (e.target?.result as string).replace(/^\uFEFF/, "");
          const lines = text.split("\n").filter((line) => line.trim());
          if (lines.length < 2) {
            reject(new Error("CSV file must have at least a header row and one data row"));
            return;
          }

          const splitCsvLine = (line: string): string[] => {
            const out: string[] = [];
            let cur = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') {
                // Escaped quote
                if (inQuotes && line[i + 1] === '"') {
                  cur += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (ch === "," && !inQuotes) {
                out.push(cur.trim());
                cur = "";
              } else {
                cur += ch;
              }
            }
            out.push(cur.trim());
            return out;
          };

          const headers = splitCsvLine(lines[0]).map((h) => h.trim());
          const data: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = splitCsvLine(lines[i].replace(/\r$/, ""));
            const row: any = { role: "shepherd" };

            headers.forEach((header, index) => {
              const value = values[index] || "";
              if (value) {
                const camelCaseKey = toCamelCase(header);
                
                // Handle special field types
                if (camelCaseKey === "dateOfBirth" || camelCaseKey === "commissioningDate" || camelCaseKey === "weddingAnniversaryDate") {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    row[camelCaseKey] = date.getTime();
                  }
                } else if (camelCaseKey === "overseerId" && value !== "none" && value !== "") {
                  row.overseerId = value as any;
                } else if (camelCaseKey === "childrenCount") {
                  row.childrenCount = parseInt(value) || 0;
                } else if (camelCaseKey === "maritalStatus") {
                  // Validate maritalStatus enum values
                  const validStatuses = ["single", "married", "divorced", "widowed"];
                  const normalizedValue = value.toLowerCase().trim();
                  if (validStatuses.includes(normalizedValue)) {
                    row[camelCaseKey] = normalizedValue;
                  }
                  // If invalid, skip it (don't assign)
                } else if (camelCaseKey === "gender") {
                  // Validate gender enum values
                  const validGenders = ["male", "female"];
                  const normalizedValue = value.toLowerCase().trim();
                  if (validGenders.includes(normalizedValue)) {
                    row[camelCaseKey] = normalizedValue;
                  }
                } else if (camelCaseKey === "status") {
                  // Validate status enum values
                  const validStatuses = ["active", "on_leave", "inactive"];
                  const normalizedValue = value.toLowerCase().trim();
                  if (validStatuses.includes(normalizedValue)) {
                    row[camelCaseKey] = normalizedValue;
                  }
                } else {
                  row[camelCaseKey] = value;
                }
              }
            });

            if (row.email && row.password && row.name) {
              data.push(row);
            }
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
      // Validate file type
      if (!csvFile.name.toLowerCase().endsWith('.csv')) {
        throw new Error("Please upload a CSV file");
      }

      // Validate file size (max 5MB)
      if (csvFile.size > 5 * 1024 * 1024) {
        throw new Error("CSV file size must be less than 5MB");
      }

      const users = await parseCSV(csvFile);
      if (users.length === 0) {
        const errorInfo = getUserFriendlyError("No valid users found in CSV file");
        setCsvError(errorInfo.message);
        toast.error(errorInfo.message, {
          description: errorInfo.scripture || ERROR_SCRIPTURES.validation,
          duration: 6000,
        });
        setIsSubmitting(false);
        return;
      }

      // Validate required fields for each user
      const validationErrors: string[] = [];
      users.forEach((user, index) => {
        if (!user.email) validationErrors.push(`Row ${index + 2}: Email is required`);
        if (!user.password) validationErrors.push(`Row ${index + 2}: Password is required`);
        if (!user.name) validationErrors.push(`Row ${index + 2}: Name is required`);
      });

      if (validationErrors.length > 0) {
        const errorMsg = `Validation errors:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more` : ''}`;
        setCsvError(errorMsg);
        toast.error("CSV validation failed", {
          description: ERROR_SCRIPTURES.validation,
          duration: 8000,
        });
        setIsSubmitting(false);
        return;
      }

      const result = await bulkAdd({ token, users });
      
      if (result.created > 0) {
        toast.success(`Successfully imported ${result.created} shepherd(s)`, {
          description: SUCCESS_SCRIPTURES.csvImported,
          duration: 6000,
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        const errorMsg = `${result.errors.length} shepherd(s) could not be imported. Check console for details.`;
        toast.warning(errorMsg, {
          description: ERROR_SCRIPTURES.validation,
          duration: 8000,
        });
        console.error("Import errors:", result.errors);
      }
      
      setCsvFile(null);
      onOpenChange(false);
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error.message || "Failed to import CSV");
      setCsvError(errorInfo.message);
      toast.error(errorInfo.message, {
        description: errorInfo.scripture || ERROR_SCRIPTURES.network,
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle single add
  const onSubmit = async (data: ShepherdFormValues) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      // Upload photo if selected
      let profilePhotoId: Id<"_storage"> | undefined = undefined;
      if (photoFile) {
        const storageId = await uploadPhoto();
        if (!storageId) {
          // Photo upload failed, but allow submission without photo
          toast.warning("Photo upload failed. Continuing without photo.", {
            description: ERROR_SCRIPTURES.upload,
            duration: 5000,
          });
        } else {
          profilePhotoId = storageId;
        }
      }

      const result = await createShepherd({
        token: token!,
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone || undefined,
        whatsappNumber: data.whatsappNumber || undefined,
        preferredName: data.preferredName || undefined,
        gender: data.gender,
        dateOfBirth: convertDateToTimestamp(data.dateOfBirth),
        commissioningDate: convertDateToTimestamp(data.commissioningDate),
        occupation: data.occupation || undefined,
        educationalBackground: data.educationalBackground || undefined,
        status: data.status || "active",
        overseerId: regionPastor?._id || (data.overseerId && data.overseerId !== "none" ? (data.overseerId as Id<"users">) : undefined),
        bacentaIds: selectedBacentaIds.length > 0 ? selectedBacentaIds : undefined,
        profilePhotoId,
        maritalStatus: data.maritalStatus,
        weddingAnniversaryDate: convertDateToTimestamp(data.weddingAnniversaryDate),
        spouseName: data.spouseName || undefined,
        spouseOccupation: data.spouseOccupation || undefined,
        childrenCount: data.childrenCount,
      });
      
      toast.success("Shepherd added successfully", {
        description: SUCCESS_SCRIPTURES.shepherdCreated,
        duration: 6000,
      });
      
      form.reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      setSelectedRegionId(null);
      setSelectedBacentaIds([]);
      onOpenChange(false);
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error.message || "Failed to add shepherd");
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Shepherd
          </DialogTitle>
          <DialogDescription>
            Add a new shepherd individually or import multiple shepherds from CSV
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Add Single</TabsTrigger>
            <TabsTrigger value="import">Import CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Photo Section */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Profile Photo</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a profile photo for this shepherd
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
                            setPhotoPreview(null);
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="shepherd@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormDescription>Minimum 8 characters</FormDescription>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                    {regionPastor && (
                      <div className="md:col-span-2 p-3 bg-muted rounded-md">
                        <Label className="text-sm font-medium">Assigned Pastor</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {regionPastor.name} {regionPastor.email && `(${regionPastor.email})`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This pastor is assigned to the selected region and will oversee this shepherd.
                        </p>
                      </div>
                    )}
                    {!regionPastor && (
                      <FormField
                        control={form.control}
                        name="overseerId"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Overseer (Pastor)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select pastor (optional)" />
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
                            <FormDescription>
                              Select a pastor to oversee this shepherd. If a region with a pastor is selected, that pastor will be used automatically.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="md:col-span-2 space-y-2">
                      <FormLabel>Region</FormLabel>
                      <Select
                        value={selectedRegionId ?? "none"}
                        onValueChange={(v) => {
                          setSelectedRegionId(v === "none" ? null : (v as Id<"regions">));
                          setSelectedBacentaIds([]);
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
                        Select a region to choose bacentas for this shepherd. A shepherd can have multiple bacentas.
                      </p>
                    </div>

                    {selectedRegionId && (
                      <div className="md:col-span-2 space-y-2">
                        <FormLabel>Bacentas</FormLabel>
                        <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                          {bacentasInRegion?.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No bacentas in this region.</p>
                          ) : (
                            bacentasInRegion?.map((b) => (
                              <div key={b._id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`bacenta-${b._id}`}
                                  checked={selectedBacentaIds.includes(b._id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedBacentaIds((prev) =>
                                      checked ? [...prev, b._id] : prev.filter((id) => id !== b._id)
                                    );
                                  }}
                                />
                                <label
                                  htmlFor={`bacenta-${b._id}`}
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      form.reset();
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      setSelectedRegionId(null);
                      setSelectedBacentaIds([]);
                    }}
                    disabled={isSubmitting || isUploadingPhoto}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isUploadingPhoto}>
                    {(isSubmitting || isUploadingPhoto) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Shepherd
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>CSV File</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with shepherd data
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-primary hover:underline">
                        Click to upload
                      </span>
                      <span className="text-sm text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <Input
                      id="csv-upload"
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
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV file only (max 10MB)
                    </p>
                  </div>
                  {csvFile && (
                    <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md">
                      <span className="text-sm">{csvFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setCsvFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {csvError && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {csvError}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCSVImport} disabled={!csvFile || isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
