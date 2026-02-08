"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, UserPlus, Upload, FileDown, X } from "lucide-react";

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

const pastorSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

interface AddPastorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPastorDialog({ open, onOpenChange }: AddPastorDialogProps): React.JSX.Element {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const register = useMutation(api.auth.register);
  const bulkAdd = useMutation(api.authUsers.bulkAdd);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvError, setCsvError] = React.useState<string | null>(null);

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
      supervisedZones: [],
      notes: "",
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
      "supervisedZones",
      "notes",
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
      "Zone A,Zone B",
      "Notes here",
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

  // Parse CSV file
  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n").filter((line) => line.trim());
          if (lines.length < 2) {
            reject(new Error("CSV file must have at least a header row and one data row"));
            return;
          }

          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
          const data: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i]
              .split(",")
              .map((v) => v.trim().replace(/^"|"$/g, ""));
            const row: any = { role: "pastor" };

            headers.forEach((header, index) => {
              const value = values[index] || "";
              if (value) {
                if (header === "yearsinministry") {
                  row.yearsInMinistry = parseInt(value) || 0;
                } else if (header === "dateofbirth" || header === "ordinationdate") {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    row[header === "dateofbirth" ? "dateOfBirth" : "ordinationDate"] =
                      date.getTime();
                  }
                } else if (header === "ministryfocus" || header === "supervisedzones") {
                  row[header === "ministryfocus" ? "ministryFocus" : "supervisedZones"] =
                    value.split(",").map((v) => v.trim()).filter(Boolean);
                } else {
                  const camelCase = header.replace(/([A-Z])/g, (g) => `_${g[0].toLowerCase()}`);
                  row[header] = value;
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

  // Handle single add
  const onSubmit = async (data: PastorFormValues) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      const submitData: any = {
        ...data,
        role: "pastor" as const,
      };

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

      await register({ token, ...submitData });
      toast.success("Pastor added successfully");
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add pastor");
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

          <TabsContent value="single" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
