"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

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
  };
}

export function EditPastorDialog({ open, onOpenChange, user }: EditPastorDialogProps): JSX.Element {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const updateUserProfile = useMutation(api.auth.updateUserProfile);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
  }, [user, form]);

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

      await updateUserProfile({ token, userId: user._id, ...submitData });
      toast.success("Pastor updated successfully");
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
                Update Pastor
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
