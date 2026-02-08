import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

// Get all settings (admin only)
export const get = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    // Get settings or return defaults
    const settingsDoc = await ctx.db
      .query("settings")
      .first();

    if (!settingsDoc) {
      // Return default settings
      return {
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
        attendanceReminderTime: "15:00", // 3 PM
        attendanceReminderDays: [0, 6], // Sunday and Saturday
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
        sessionTimeoutMinutes: 480, // 8 hours
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
      };
    }

    return settingsDoc;
  },
});

// Update settings (admin only)
export const update = mutation({
  args: {
    token: v.string(),
    settings: v.object({
      // General
      churchName: v.optional(v.string()),
      churchEmail: v.optional(v.string()),
      churchPhone: v.optional(v.string()),
      churchAddress: v.optional(v.string()),
      churchWebsite: v.optional(v.string()),
      timezone: v.optional(v.string()),
      dateFormat: v.optional(v.string()),
      timeFormat: v.optional(v.string()),
      
      // Attendance
      attendanceReminderTime: v.optional(v.string()),
      attendanceReminderDays: v.optional(v.array(v.number())),
      requireAttendanceApproval: v.optional(v.boolean()),
      autoApproveAfterHours: v.optional(v.number()),
      lowRiskDays: v.optional(v.number()),
      mediumRiskDays: v.optional(v.number()),
      highRiskDays: v.optional(v.number()),
      enableAtRiskTracking: v.optional(v.boolean()),
      
      // Notifications
      enableEmailNotifications: v.optional(v.boolean()),
      enableInAppNotifications: v.optional(v.boolean()),
      notificationRetentionDays: v.optional(v.number()),
      birthdayReminderDays: v.optional(v.number()),
      anniversaryReminderDays: v.optional(v.number()),
      assignmentReminderDays: v.optional(v.number()),
      
      // User Management
      requireShepherdApproval: v.optional(v.boolean()),
      autoApproveFirstAdmin: v.optional(v.boolean()),
      defaultMemberStatus: v.optional(v.string()),
      customIdPrefix: v.optional(v.string()),
      autoGenerateCustomIds: v.optional(v.boolean()),
      
      // Password Policy
      minPasswordLength: v.optional(v.number()),
      requireUppercase: v.optional(v.boolean()),
      requireLowercase: v.optional(v.boolean()),
      requireNumbers: v.optional(v.boolean()),
      requireSpecialChars: v.optional(v.boolean()),
      passwordExpirationDays: v.optional(v.number()),
      
      // Session
      sessionTimeoutMinutes: v.optional(v.number()),
      maxConcurrentSessions: v.optional(v.number()),
      
      // Assignments
      defaultAssignmentDuration: v.optional(v.number()),
      requireReportsForAssignments: v.optional(v.boolean()),
      autoCloseAssignmentsAfterDays: v.optional(v.number()),
      
      // Reports
      requireNotesInReports: v.optional(v.boolean()),
      reportSubmissionDeadlineHours: v.optional(v.number()),
      enableReportAttachments: v.optional(v.boolean()),
      
      // Data Retention
      inactiveMemberRetentionDays: v.optional(v.number()),
      archiveAttendanceAfterDays: v.optional(v.number()),
      deleteNotificationsAfterDays: v.optional(v.number()),
      
      // Export & Backup
      enableCsvExports: v.optional(v.boolean()),
      enablePdfExports: v.optional(v.boolean()),
      autoBackupFrequency: v.optional(v.string()),
      
      // Privacy
      showContactToShepherds: v.optional(v.boolean()),
      showContactToPastors: v.optional(v.boolean()),
      requireDataConsent: v.optional(v.boolean()),
      
      // Security
      enableTwoFactorAuth: v.optional(v.boolean()),
      loginAttemptLimit: v.optional(v.number()),
      lockoutDurationMinutes: v.optional(v.number()),
      enableAuditLog: v.optional(v.boolean()),
      auditLogRetentionDays: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    // Get existing settings or create new
    const existingSettings = await ctx.db
      .query("settings")
      .first();

    const settingsData = {
      ...args.settings,
      updatedAt: Date.now(),
      updatedBy: userId,
    };

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, settingsData);
      return { success: true, id: existingSettings._id };
    } else {
      const id = await ctx.db.insert("settings", {
        ...settingsData,
        createdAt: Date.now(),
      });
      return { success: true, id };
    }
  },
});
