"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Save, Key, ArrowLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ChangePasswordDialog } from "@/components/dashboard/change-password-dialog";

const settingsSchema = z.object({
  // General
  churchName: z.string().optional(),
  churchEmail: z.string().email().optional().or(z.literal("")),
  churchPhone: z.string().optional(),
  churchAddress: z.string().optional(),
  churchWebsite: z.string().url().optional().or(z.literal("")),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  
  // Attendance
  attendanceReminderTime: z.string().optional(),
  requireAttendanceApproval: z.boolean().optional(),
  autoApproveAfterHours: z.number().min(0).optional(),
  lowRiskDays: z.number().min(1).optional(),
  mediumRiskDays: z.number().min(1).optional(),
  highRiskDays: z.number().min(1).optional(),
  enableAtRiskTracking: z.boolean().optional(),
  
  // Notifications
  enableEmailNotifications: z.boolean().optional(),
  enableInAppNotifications: z.boolean().optional(),
  notificationRetentionDays: z.number().min(1).optional(),
  birthdayReminderDays: z.number().min(0).optional(),
  anniversaryReminderDays: z.number().min(0).optional(),
  assignmentReminderDays: z.number().min(0).optional(),
  
  // User Management
  requireShepherdApproval: z.boolean().optional(),
  autoApproveFirstAdmin: z.boolean().optional(),
  defaultMemberStatus: z.string().optional(),
  customIdPrefix: z.string().optional(),
  autoGenerateCustomIds: z.boolean().optional(),
  
  // Password Policy
  minPasswordLength: z.number().min(4).max(32).optional(),
  requireUppercase: z.boolean().optional(),
  requireLowercase: z.boolean().optional(),
  requireNumbers: z.boolean().optional(),
  requireSpecialChars: z.boolean().optional(),
  passwordExpirationDays: z.number().min(0).optional(),
  
  // Session
  sessionTimeoutMinutes: z.number().min(5).optional(),
  maxConcurrentSessions: z.number().min(1).optional(),
  
  // Assignments
  defaultAssignmentDuration: z.number().min(1).optional(),
  requireReportsForAssignments: z.boolean().optional(),
  autoCloseAssignmentsAfterDays: z.number().min(1).optional(),
  
  // Reports
  requireNotesInReports: z.boolean().optional(),
  reportSubmissionDeadlineHours: z.number().min(1).optional(),
  enableReportAttachments: z.boolean().optional(),
  
  // Data Retention
  inactiveMemberRetentionDays: z.number().min(1).optional(),
  archiveAttendanceAfterDays: z.number().min(1).optional(),
  deleteNotificationsAfterDays: z.number().min(1).optional(),
  
  // Export & Backup
  enableCsvExports: z.boolean().optional(),
  enablePdfExports: z.boolean().optional(),
  autoBackupFrequency: z.string().optional(),
  
  // Privacy
  showContactToShepherds: z.boolean().optional(),
  showContactToPastors: z.boolean().optional(),
  requireDataConsent: z.boolean().optional(),
  
  // Security
  enableTwoFactorAuth: z.boolean().optional(),
  loginAttemptLimit: z.number().min(1).max(10).optional(),
  lockoutDurationMinutes: z.number().min(1).optional(),
  enableAuditLog: z.boolean().optional(),
  auditLogRetentionDays: z.number().min(1).optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  
  const settings = useQuery(
    api.settings.get,
    token ? { token } : "skip"
  );

  const updateSettings = useMutation(api.settings.update);
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      // General
      churchName: "",
      churchEmail: "",
      churchPhone: "",
      churchAddress: "",
      churchWebsite: "",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12",
      
      // Attendance
      attendanceReminderTime: "15:00",
      requireAttendanceApproval: true,
      autoApproveAfterHours: 0,
      lowRiskDays: 14,
      mediumRiskDays: 30,
      highRiskDays: 60,
      enableAtRiskTracking: true,
      
      // Notifications
      enableEmailNotifications: false,
      enableInAppNotifications: true,
      notificationRetentionDays: 30,
      birthdayReminderDays: 1,
      anniversaryReminderDays: 1,
      assignmentReminderDays: 1,
      
      // User Management
      requireShepherdApproval: true,
      autoApproveFirstAdmin: true,
      defaultMemberStatus: "new_convert",
      customIdPrefix: "MBR-",
      autoGenerateCustomIds: true,
      
      // Password Policy
      minPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpirationDays: 0,
      
      // Session
      sessionTimeoutMinutes: 480,
      maxConcurrentSessions: 3,
      
      // Assignments
      defaultAssignmentDuration: 7,
      requireReportsForAssignments: true,
      autoCloseAssignmentsAfterDays: 30,
      
      // Reports
      requireNotesInReports: false,
      reportSubmissionDeadlineHours: 48,
      enableReportAttachments: true,
      
      // Data Retention
      inactiveMemberRetentionDays: 365,
      archiveAttendanceAfterDays: 365,
      deleteNotificationsAfterDays: 90,
      
      // Export & Backup
      enableCsvExports: true,
      enablePdfExports: true,
      autoBackupFrequency: "weekly",
      
      // Privacy
      showContactToShepherds: true,
      showContactToPastors: true,
      requireDataConsent: false,
      
      // Security
      enableTwoFactorAuth: false,
      loginAttemptLimit: 5,
      lockoutDurationMinutes: 30,
      enableAuditLog: true,
      auditLogRetentionDays: 365,
    },
  });

  React.useEffect(() => {
    if (settings) {
      // Ensure all values are defined (no undefined)
      const settingsWithDefaults = {
        churchName: settings.churchName ?? "",
        churchEmail: settings.churchEmail ?? "",
        churchPhone: settings.churchPhone ?? "",
        churchAddress: settings.churchAddress ?? "",
        churchWebsite: settings.churchWebsite ?? "",
        timezone: settings.timezone ?? "UTC",
        dateFormat: settings.dateFormat ?? "MM/DD/YYYY",
        timeFormat: settings.timeFormat ?? "12",
        attendanceReminderTime: settings.attendanceReminderTime ?? "15:00",
        requireAttendanceApproval: settings.requireAttendanceApproval ?? true,
        autoApproveAfterHours: settings.autoApproveAfterHours ?? 0,
        lowRiskDays: settings.lowRiskDays ?? 14,
        mediumRiskDays: settings.mediumRiskDays ?? 30,
        highRiskDays: settings.highRiskDays ?? 60,
        enableAtRiskTracking: settings.enableAtRiskTracking ?? true,
        enableEmailNotifications: settings.enableEmailNotifications ?? false,
        enableInAppNotifications: settings.enableInAppNotifications ?? true,
        notificationRetentionDays: settings.notificationRetentionDays ?? 30,
        birthdayReminderDays: settings.birthdayReminderDays ?? 1,
        anniversaryReminderDays: settings.anniversaryReminderDays ?? 1,
        assignmentReminderDays: settings.assignmentReminderDays ?? 1,
        requireShepherdApproval: settings.requireShepherdApproval ?? true,
        autoApproveFirstAdmin: settings.autoApproveFirstAdmin ?? true,
        defaultMemberStatus: settings.defaultMemberStatus ?? "new_convert",
        customIdPrefix: settings.customIdPrefix ?? "MBR-",
        autoGenerateCustomIds: settings.autoGenerateCustomIds ?? true,
        minPasswordLength: settings.minPasswordLength ?? 8,
        requireUppercase: settings.requireUppercase ?? true,
        requireLowercase: settings.requireLowercase ?? true,
        requireNumbers: settings.requireNumbers ?? true,
        requireSpecialChars: settings.requireSpecialChars ?? true,
        passwordExpirationDays: settings.passwordExpirationDays ?? 0,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 480,
        maxConcurrentSessions: settings.maxConcurrentSessions ?? 3,
        defaultAssignmentDuration: settings.defaultAssignmentDuration ?? 7,
        requireReportsForAssignments: settings.requireReportsForAssignments ?? true,
        autoCloseAssignmentsAfterDays: settings.autoCloseAssignmentsAfterDays ?? 30,
        requireNotesInReports: settings.requireNotesInReports ?? false,
        reportSubmissionDeadlineHours: settings.reportSubmissionDeadlineHours ?? 48,
        enableReportAttachments: settings.enableReportAttachments ?? true,
        inactiveMemberRetentionDays: settings.inactiveMemberRetentionDays ?? 365,
        archiveAttendanceAfterDays: settings.archiveAttendanceAfterDays ?? 365,
        deleteNotificationsAfterDays: settings.deleteNotificationsAfterDays ?? 90,
        enableCsvExports: settings.enableCsvExports ?? true,
        enablePdfExports: settings.enablePdfExports ?? true,
        autoBackupFrequency: settings.autoBackupFrequency ?? "weekly",
        showContactToShepherds: settings.showContactToShepherds ?? true,
        showContactToPastors: settings.showContactToPastors ?? true,
        requireDataConsent: settings.requireDataConsent ?? false,
        enableTwoFactorAuth: settings.enableTwoFactorAuth ?? false,
        loginAttemptLimit: settings.loginAttemptLimit ?? 5,
        lockoutDurationMinutes: settings.lockoutDurationMinutes ?? 30,
        enableAuditLog: settings.enableAuditLog ?? true,
        auditLogRetentionDays: settings.auditLogRetentionDays ?? 365,
      };
      form.reset(settingsWithDefaults);
    }
  }, [settings, form]);

  const onSubmit = async (values: SettingsFormValues) => {
    if (!token) return;
    
    try {
      await updateSettings({ token, settings: values });
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    }
  };

  const isLoading = settings === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="flex-shrink-0 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
            Manage your church management system settings
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto min-w-max sm:min-w-0 gap-1 sm:gap-[3px]">
                <TabsTrigger value="general" className="text-xs sm:text-sm py-2 sm:py-1 px-2 sm:px-2 whitespace-nowrap">General</TabsTrigger>
                <TabsTrigger value="attendance" className="text-xs sm:text-sm py-2 sm:py-1 px-2 sm:px-2 whitespace-nowrap">Attendance</TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs sm:text-sm py-2 sm:py-1 px-2 sm:px-2 whitespace-nowrap">Notifications</TabsTrigger>
                <TabsTrigger value="users" className="text-xs sm:text-sm py-2 sm:py-1 px-2 sm:px-2 whitespace-nowrap">Users</TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm py-2 sm:py-1 px-2 sm:px-2 whitespace-nowrap">Security</TabsTrigger>
              </TabsList>
            </div>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Church Information</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Basic information about your church
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="churchName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Church Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter church name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="churchEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Church Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="church@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="churchPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Church Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="churchAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Church Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, City, State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="churchWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Church Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Localization</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Date, time, and regional settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            <SelectItem value="Africa/Accra">Africa/Accra (GMT)</SelectItem>
                            <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12">12-hour</SelectItem>
                            <SelectItem value="24">24-hour</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Settings */}
            <TabsContent value="attendance" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Attendance Reminders</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure when and how attendance reminders are sent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="attendanceReminderTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reminder Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription>
                          Time when attendance reminders are sent (default: 3:00 PM)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Approval Workflow</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure attendance approval settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="requireAttendanceApproval"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Approval</FormLabel>
                          <FormDescription>
                            Require admin/pastor approval for attendance submissions
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="autoApproveAfterHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auto-Approve After (Hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0 (disabled)"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Automatically approve attendance after X hours (0 to disable)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">At-Risk Tracking</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure thresholds for identifying at-risk members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="enableAtRiskTracking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable At-Risk Tracking</FormLabel>
                          <FormDescription>
                            Automatically flag members with low attendance
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lowRiskDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Risk (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 14)}
                          />
                        </FormControl>
                        <FormDescription>
                          Days without attendance to mark as low risk
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mediumRiskDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medium Risk (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormDescription>
                          Days without attendance to mark as medium risk
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="highRiskDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>High Risk (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                          />
                        </FormControl>
                        <FormDescription>
                          Days without attendance to mark as high risk
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Settings */}
            <TabsContent value="notifications" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Notification Preferences</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure notification settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="enableEmailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Email Notifications</FormLabel>
                          <FormDescription>
                            Enable email notifications
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="enableInAppNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">In-App Notifications</FormLabel>
                          <FormDescription>
                            Enable in-app notifications
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notificationRetentionDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Retention (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormDescription>
                          How long to keep notifications before auto-deleting
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Reminder Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure reminder notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="birthdayReminderDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birthday Reminder (Days Before)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>
                          Send birthday reminders X days before
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="anniversaryReminderDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anniversary Reminder (Days Before)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>
                          Send anniversary reminders X days before
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignmentReminderDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment Reminder (Days Before)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>
                          Send assignment due date reminders X days before
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management Settings */}
            <TabsContent value="users" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Registration Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure user registration and approval
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="requireShepherdApproval"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Shepherd Approval</FormLabel>
                          <FormDescription>
                            Require admin/pastor approval for shepherd registrations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="autoApproveFirstAdmin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-Approve First Admin</FormLabel>
                          <FormDescription>
                            Automatically approve the first user as admin
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Member Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure default member settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="defaultMemberStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Member Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select default status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new_convert">New Convert</SelectItem>
                            <SelectItem value="first_timer">First Timer</SelectItem>
                            <SelectItem value="established">Established</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customIdPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom ID Prefix</FormLabel>
                        <FormControl>
                          <Input placeholder="MBR-" {...field} />
                        </FormControl>
                        <FormDescription>
                          Prefix for auto-generated member IDs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="autoGenerateCustomIds"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-Generate Custom IDs</FormLabel>
                          <FormDescription>
                            Automatically generate custom IDs for new members
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Password Policy</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure password requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="minPasswordLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Password Length</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 8)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requireUppercase"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Uppercase</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requireLowercase"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Lowercase</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requireNumbers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Numbers</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requireSpecialChars"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Special Characters</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Session Management</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure user session settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="sessionTimeoutMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Timeout (Minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 480)}
                          />
                        </FormControl>
                        <FormDescription>
                          Auto-logout after inactivity (default: 480 minutes / 8 hours)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxConcurrentSessions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Concurrent Sessions</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of simultaneous sessions per user
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-4 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Change Password</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Update your account password
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPasswordDialogOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Authentication Security</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure authentication and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="enableTwoFactorAuth"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Two-Factor Authentication</FormLabel>
                          <FormDescription>
                            Require 2FA for all users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loginAttemptLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Login Attempt Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum failed login attempts before lockout
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lockoutDurationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lockout Duration (Minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormDescription>
                          How long to lock account after failed attempts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Audit & Logging</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure audit logging and data retention
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="enableAuditLog"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Audit Log</FormLabel>
                          <FormDescription>
                            Log all system activities and changes
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="auditLogRetentionDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audit Log Retention (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 365)}
                          />
                        </FormControl>
                        <FormDescription>
                          How long to keep audit logs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Privacy Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure data privacy and visibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 pt-0">
                  <FormField
                    control={form.control}
                    name="showContactToShepherds"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Contact Info to Shepherds</FormLabel>
                          <FormDescription>
                            Allow shepherds to view member contact information
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="showContactToPastors"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Contact Info to Pastors</FormLabel>
                          <FormDescription>
                            Allow pastors to view member contact information
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requireDataConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Data Consent</FormLabel>
                          <FormDescription>
                            Require explicit consent before storing member data
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 sm:pt-6">
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {token && (
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          token={token}
        />
      )}
    </div>
  );
}
