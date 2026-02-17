"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { Id } from "../../../convex/_generated/dataModel";
import { convertDateToTimestamp, getUserFriendlyError, SUCCESS_SCRIPTURES, ERROR_SCRIPTURES } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

const pastorSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredName: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  dateOfBirth: z.string().optional(),
  ordinationDate: z.string().optional(),
  homeAddress: z.string().optional(),
  qualification: z.string().optional(),
  yearsInMinistry: z.number().min(0).optional(),
  ministryFocus: z.array(z.string()).optional(),
  regionId: z.string().optional(),
  status: z.enum(["active", "on_leave", "inactive"]).optional(),
  notes: z.string().optional(),
  // Marital information
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  weddingAnniversaryDate: z.string().optional(),
  spouseName: z.string().optional(),
  spouseOccupation: z.string().optional(),
  childrenCount: z.number().min(0).optional(),
});

type PastorFormValues = z.infer<typeof pastorSchema>;

interface AddPastorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPastorDialog({ open, onOpenChange }: AddPastorDialogProps): React.JSX.Element {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const createPastor = useMutation(api.auth.createPastor);
  const bulkAdd = useMutation(api.authUsers.bulkAdd);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const regions = useQuery(
    api.regions.listRegionsForSelect,
    token ? { token } : "skip"
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  const form = useForm<PastorFormValues>({
    resolver: zodResolver(pastorSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
      whatsappNumber: "",
      preferredName: "",
      gender: undefined,
      dateOfBirth: "",
      ordinationDate: "",
      homeAddress: "",
      qualification: "",
      yearsInMinistry: undefined,
      ministryFocus: [],
      regionId: "",
      status: "active",
      notes: "",
      maritalStatus: undefined,
      weddingAnniversaryDate: "",
      spouseName: "",
      spouseOccupation: "",
      childrenCount: undefined,
    },
  });

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
      "ordinationDate",
      "homeAddress",
      "qualification",
      "yearsInMinistry",
      "ministryFocus",
      "regionName",
      "status",
      "notes",
      "maritalStatus",
      "weddingAnniversaryDate",
      "spouseName",
      "spouseOccupation",
      "childrenCount",
    ];

    const exampleRow = [
      "pastor@example.com",
      "SecurePassword123!",
      "John Doe",
      "+1234567890",
      "+1234567890",
      "John",
      "male",
      "1980-01-01",
      "2005-06-15",
      "123 Main St",
      "Master of Divinity",
      "15",
      "Youth,Teaching",
      "North Region",
      "active",
      "Notes here",
      "married",
      "2000-06-15",
      "Jane Doe",
      "Teacher",
      "2",
    ];

    const csvContent = [headers, exampleRow]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "pastors_template.csv");
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
      ordinationdate: "ordinationDate",
      ordination_date: "ordinationDate",
      homeaddress: "homeAddress",
      home_address: "homeAddress",
      qualification: "qualification",
      yearsinministry: "yearsInMinistry",
      years_in_ministry: "yearsInMinistry",
      ministryfocus: "ministryFocus",
      ministry_focus: "ministryFocus",
      regionname: "regionName",
      region_name: "regionName",
      regionid: "regionName", // Support old header name for backward compatibility
      region_id: "regionName",
      status: "status",
      notes: "notes",
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
            const row: any = { role: "pastor" };

            headers.forEach((header, index) => {
              const value = values[index] || "";
              if (value) {
                const camelCaseKey = toCamelCase(header);
                
                // Handle special field types
                if (camelCaseKey === "yearsInMinistry") {
                  row.yearsInMinistry = parseFloat(value) || 0;
                } else if (camelCaseKey === "dateOfBirth" || camelCaseKey === "ordinationDate" || camelCaseKey === "weddingAnniversaryDate") {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    row[camelCaseKey] = date.getTime();
                  }
                } else if (camelCaseKey === "ministryFocus") {
                  row[camelCaseKey] = value.split(",").map((v) => v.trim()).filter(Boolean);
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
      const users = await parseCSV(csvFile);
      if (users.length === 0) {
        setCsvError("No valid users found in CSV file");
        setIsSubmitting(false);
        return;
      }

      const result = await bulkAdd({ token, users });
      toast.success(`Successfully imported ${result.created} pastor(s)`);
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} pastor(s) could not be imported`);
        console.error("Import errors:", result.errors);
      }
      setCsvFile(null);
      onOpenChange(false);
    } catch (error: any) {
      setCsvError(error.message || "Failed to import CSV");
      toast.error(error.message || "Failed to import CSV");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Handle single add
  const onSubmit = async (data: PastorFormValues) => {
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

      await createPastor({
        token: token!,
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone || undefined,
        whatsappNumber: data.whatsappNumber || undefined,
        preferredName: data.preferredName || undefined,
        gender: data.gender,
        dateOfBirth: convertDateToTimestamp(data.dateOfBirth),
        ordinationDate: convertDateToTimestamp(data.ordinationDate),
        homeAddress: data.homeAddress || undefined,
        qualification: data.qualification || undefined,
        yearsInMinistry: data.yearsInMinistry,
        ministryFocus: data.ministryFocus,
        regionId: data.regionId && data.regionId !== "none" ? (data.regionId as Id<"regions">) : undefined,
        status: data.status || "active",
        notes: data.notes || undefined,
        profilePhotoId,
        maritalStatus: data.maritalStatus,
        weddingAnniversaryDate: convertDateToTimestamp(data.weddingAnniversaryDate),
        spouseName: data.spouseName || undefined,
        spouseOccupation: data.spouseOccupation || undefined,
        childrenCount: data.childrenCount,
      });
      
      toast.success("Pastor added successfully", {
        description: SUCCESS_SCRIPTURES.pastorCreated,
        duration: 6000,
      });
      
      form.reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      onOpenChange(false);
    } catch (error: any) {
      const errorInfo = getUserFriendlyError(error.message || "Failed to add pastor");
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Pastor
          </DialogTitle>
          <DialogDescription>
            Add a new pastor individually or import multiple pastors from CSV
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
                      Upload a profile photo for this pastor
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="pastor@example.com" {...field} />
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
                    name="regionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Assign Region
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="ml-1 h-3 w-3 inline text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Select a region to assign this pastor to</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a region (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No region</SelectItem>
                            {regions?.map((region) => (
                              <SelectItem key={region._id} value={region._id}>
                                {region.name}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Status
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="ml-1 h-3 w-3 inline text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Current status of the pastor</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "active"}>
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
                    }}
                    disabled={isSubmitting || isUploadingPhoto}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isUploadingPhoto}>
                    {(isSubmitting || isUploadingPhoto) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Pastor
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
                    Upload a CSV file with pastor data
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
