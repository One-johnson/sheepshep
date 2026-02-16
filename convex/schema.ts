import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores admin, pastor, and shepherd accounts
  users: defineTable({
    email: v.string(),
    name: v.string(), // Full Name
    role: v.union(v.literal("admin"), v.literal("pastor"), v.literal("shepherd")),
    passwordHash: v.string(), // Hashed password for custom auth
    isActive: v.boolean(),
    isFirstAdmin: v.optional(v.boolean()), // Flag to identify the first admin (cannot be deleted)
    createdAt: v.number(),
    updatedAt: v.number(),
    // Basic contact fields
    phone: v.optional(v.string()), // Phone Number
    whatsappNumber: v.optional(v.string()), // WhatsApp Number
    // Personal information
    preferredName: v.optional(v.string()), // Preferred Name
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    dateOfBirth: v.optional(v.number()), // Unix timestamp
    // Pastor-specific fields
    ordinationDate: v.optional(v.number()), // Ordination/Commissioning Date (Unix timestamp)
    homeAddress: v.optional(v.string()), // Home Address
    qualification: v.optional(v.string()), // Highest Qualification/Seminary (e.g., "Bachelor of Theology", "MDiv")
    yearsInMinistry: v.optional(v.number()), // Years in Ministry
    ministryFocus: v.optional(v.array(v.string())), // Main Ministry Focus (multi-select: "Youth", "Couples", "Evangelism", "Teaching", etc.)
    supervisedZones: v.optional(v.array(v.string())), // Supervised Zones/Districts (multi-select or text)
    notes: v.optional(v.string()), // Notes
    // Shepherd-specific fields
    commissioningDate: v.optional(v.number()), // Join Date / Commissioning Date (Unix timestamp)
    occupation: v.optional(v.string()), // Occupation / Ministry Role (e.g., "Teacher", "Business Owner", "Worship Leader")
    assignedZone: v.optional(v.string()), // Assigned Zone / Area
    educationalBackground: v.optional(v.string()), // Educational Background / Highest Education Level
    status: v.optional(
      v.union(v.literal("active"), v.literal("on_leave"), v.literal("inactive"))
    ), // Status: Active / On Leave / Inactive (defaults to "active" if isActive is true)
    // Profile and relationships
    profilePhotoId: v.optional(v.id("_storage")),
    // For pastors - track which shepherds they oversee
    // For shepherds - track which pastor oversees them
    overseerId: v.optional(v.id("users")), // Pastor who oversees this shepherd
    // Marital information
    maritalStatus: v.optional(
      v.union(
        v.literal("single"),
        v.literal("married"),
        v.literal("divorced"),
        v.literal("widowed")
      )
    ),
    weddingAnniversaryDate: v.optional(v.number()), // Year of marriage (Unix timestamp)
    spouseName: v.optional(v.string()), // Spouse name (if married)
    spouseOccupation: v.optional(v.string()), // Occupation of spouse
    childrenCount: v.optional(v.number()), // Number of children
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_overseer", ["overseerId"])
    .index("by_ordination_date", ["ordinationDate"])
    .index("by_commissioning_date", ["commissioningDate"])
    .index("by_status", ["status"])
    .index("by_assigned_zone", ["assignedZone"]),

  // Members table - church members managed by shepherds
  members: defineTable({
    // Basic identification
    firstName: v.string(), // Full Name - First Name
    lastName: v.string(), // Full Name - Last Name
    preferredName: v.optional(v.string()), // Preferred Name / Nickname
    customId: v.optional(v.string()), // Custom ID (e.g., MBR-0425 or 2025-123) - auto-generated
    // Personal information
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")), // Required
    dateOfBirth: v.number(), // Required - Unix timestamp
    maritalStatus: v.optional(
      v.union(
        v.literal("single"),
        v.literal("married"),
        v.literal("divorced"),
        v.literal("widowed")
      )
    ),
    weddingAnniversaryDate: v.optional(v.number()), // Conditional - if married (Unix timestamp)
    spouseName: v.optional(v.string()), // Conditional - if married
    childrenCount: v.optional(v.number()), // Number of children
    // Contact information
    phone: v.string(), // Required - Phone Number (personal)
    whatsappNumber: v.optional(v.string()), // WhatsApp Number
    email: v.optional(v.string()), // Email - optional, for bulk communication if consented
    // Address information
    address: v.string(), // Required - Residential Address
    nearestLandmark: v.optional(v.string()), // Nearest Landmark - helps shepherds find the house
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    // Church information
    dateJoinedChurch: v.number(), // Required - Date Joined Church (Unix timestamp) - for membership anniversary reminders
    baptismDate: v.optional(v.number()), // Baptism Date (Unix timestamp) - spiritual milestone
    // Additional information
    occupation: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    profilePhotoId: v.optional(v.id("_storage")), // Profile Photo
    notes: v.optional(v.string()),
    // Member status
    status: v.optional(
      v.union(
        v.literal("new_convert"),
        v.literal("first_timer"),
        v.literal("established"),
        v.literal("visitor"),
        v.literal("inactive")
      )
    ),
    // At-risk tracking
    lastAttendanceDate: v.optional(v.number()), // Last date member attended
    attendanceRiskLevel: v.optional(
      v.union(
        v.literal("none"), // No risk
        v.literal("low"), // 2 weeks without attendance
        v.literal("medium"), // 1 month without attendance
        v.literal("high") // 2+ months without attendance
      )
    ),
    // Relationships
    shepherdId: v.id("users"), // Shepherd responsible for this member
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
    isActive: v.boolean(),
  })
    .index("by_shepherd", ["shepherdId"])
    .index("by_email", ["email"])
    .index("by_custom_id", ["customId"])
    .index("by_phone", ["phone"])
    .index("by_date_of_birth", ["dateOfBirth"])
    .index("by_date_joined", ["dateJoinedChurch"])
    .index("by_baptism_date", ["baptismDate"])
    .index("by_wedding_anniversary", ["weddingAnniversaryDate"])
    .index("by_status", ["status"])
    .index("by_attendance_risk", ["attendanceRiskLevel"])
    .index("by_last_attendance", ["lastAttendanceDate"])
    .index("by_created_at", ["createdAt"]),

  // Attendance records
  attendance: defineTable({
    memberId: v.optional(v.id("members")), // For member attendance
    userId: v.optional(v.id("users")), // For shepherd/user attendance
    groupId: v.optional(v.id("groups")), // When set: group meeting attendance (leader takes for group members on meeting day)
    date: v.number(), // Unix timestamp for the attendance date
    attendanceStatus: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("excused"),
      v.literal("late")
    ),
    // Submission and approval workflow
    submittedBy: v.id("users"), // User who submitted (shepherd, admin, or pastor)
    submittedAt: v.number(),
    approvalStatus: v.union(
      v.literal("pending"), // Awaiting approval
      v.literal("approved"),
      v.literal("rejected")
    ),
    approvedBy: v.optional(v.id("users")), // Admin or pastor who approved
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_member", ["memberId"])
    .index("by_user", ["userId"])
    .index("by_group", ["groupId"])
    .index("by_date", ["date"])
    .index("by_submitted_by", ["submittedBy"])
    .index("by_approval_status", ["approvalStatus"]),

  // Assignments - members assigned to shepherds for visitation/prayers
  assignments: defineTable({
    memberId: v.id("members"),
    shepherdId: v.id("users"),
    assignedBy: v.id("users"), // Admin or pastor who made the assignment
    assignmentType: v.union(
      v.literal("visitation"),
      v.literal("prayer"),
      v.literal("follow_up"),
      v.literal("other")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()), // Unix timestamp
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_member", ["memberId"])
    .index("by_shepherd", ["shepherdId"])
    .index("by_status", ["status"])
    .index("by_assigned_by", ["assignedBy"]),

  // Reports - shepherd reports on assignments
  reports: defineTable({
    assignmentId: v.id("assignments"),
    memberId: v.id("members"),
    shepherdId: v.id("users"),
    reportType: v.union(
      v.literal("visitation"),
      v.literal("prayer"),
      v.literal("follow_up"),
      v.literal("other")
    ),
    title: v.string(),
    content: v.string(), // Report details
    visitDate: v.optional(v.number()), // When the visit/prayer happened
    outcome: v.optional(
      v.union(
        v.literal("successful"),
        v.literal("partial"),
        v.literal("unsuccessful"),
        v.literal("rescheduled")
      )
    ),
    notes: v.optional(v.string()), // Brief notes describing the outcome
    attachments: v.optional(v.array(v.id("_storage"))), // File attachments
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.number(),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_member", ["memberId"])
    .index("by_shepherd", ["shepherdId"])
    .index("by_created_at", ["createdAt"]),

  // Sessions - for authentication
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_expires_at", ["expiresAt"]),

  // Audit Log - system activity logs (admin only)
  auditLogs: defineTable({
    userId: v.id("users"), // User who performed the action
    action: v.string(), // Action performed (e.g., "user_created", "member_updated", "settings_changed")
    entityType: v.string(), // Type of entity affected (e.g., "user", "member", "settings")
    entityId: v.optional(v.string()), // ID of the affected entity
    details: v.optional(v.string()), // Additional details about the action
    ipAddress: v.optional(v.string()), // IP address of the user
    userAgent: v.optional(v.string()), // User agent/browser info
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_entity_type", ["entityType"])
    .index("by_created_at", ["createdAt"]),

  // Settings - application settings (admin only)
  settings: defineTable({
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
    
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }),

  // Registration requests - for shepherd registration approval workflow
  registrationRequests: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    // Basic contact
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    // Personal information
    preferredName: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    dateOfBirth: v.optional(v.number()),
    // Shepherd-specific fields
    commissioningDate: v.optional(v.number()),
    occupation: v.optional(v.string()),
    assignedZone: v.optional(v.string()),
    homeAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Approval workflow
    status: v.union(
      v.literal("pending"), // Awaiting approval
      v.literal("approved"),
      v.literal("rejected")
    ),
    requestedBy: v.id("users"), // User who requested registration (usually the shepherd themselves or admin)
    reviewedBy: v.optional(v.id("users")), // Admin or pastor who reviewed
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    // If approved, link to created user
    userId: v.optional(v.id("users")), // Created user ID after approval
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_requested_by", ["requestedBy"])
    .index("by_reviewed_by", ["reviewedBy"])
    .index("by_email", ["email"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("attendance_pending"),
      v.literal("attendance_approved"),
      v.literal("attendance_rejected"),
      v.literal("assignment_assigned"),
      v.literal("assignment_completed"),
      v.literal("assignment_deleted"),
      v.literal("report_submitted"),
      v.literal("member_assigned"),
      v.literal("member_created"),
      v.literal("member_updated"),
      v.literal("member_deleted"),
      v.literal("user_created"),
      v.literal("user_updated"),
      v.literal("user_deleted"),
      v.literal("profile_updated"),
      v.literal("settings_updated"),
      v.literal("group_created"),
      v.literal("group_updated"),
      v.literal("group_deleted"),
      v.literal("group_member_added"),
      v.literal("group_member_removed"),
      v.literal("event_created"),
      v.literal("event_updated"),
      v.literal("event_deleted"),
      v.literal("prayer_request"),
      v.literal("prayer_response"),
      v.literal("system"),
      v.literal("reminder")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()), // ID of related entity (attendance, assignment, etc.)
    relatedType: v.optional(
      v.union(
        v.literal("attendance"),
        v.literal("assignment"),
        v.literal("report"),
        v.literal("member"),
        v.literal("user"),
        v.literal("group"),
        v.literal("event"),
        v.literal("reminder"),
        v.literal("prayer_request"),
        v.literal("settings")
      )
    ),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_created_at", ["createdAt"]),

  // Groups - bacenta, bible study, etc.
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    meetingDay: v.optional(v.number()), // 0=Sunday, 1=Monday, ... 6=Saturday - day when group meets
    createdBy: v.id("users"),
    leaderId: v.optional(v.id("users")), // Group leader (shepherd/pastor)
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_leader", ["leaderId"]),

  // Group members - many-to-many relationship (members can belong to multiple groups)
  groupMembers: defineTable({
    groupId: v.id("groups"),
    memberId: v.id("members"),
    role: v.optional(v.union(v.literal("member"), v.literal("leader"), v.literal("assistant"))),
    joinedAt: v.number(),
    addedBy: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_member", ["memberId"])
    .index("by_group_member", ["groupId", "memberId"]),

  // Group shepherds - shepherds can also belong to groups
  groupShepherds: defineTable({
    groupId: v.id("groups"),
    shepherdId: v.id("users"), // Shepherd/pastor user ID
    role: v.optional(v.union(v.literal("member"), v.literal("leader"), v.literal("assistant"), v.literal("coordinator"))),
    joinedAt: v.number(),
    addedBy: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_shepherd", ["shepherdId"])
    .index("by_group_shepherd", ["groupId", "shepherdId"]),

  // Events - prayer meeting, evangelism day, etc.
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    eventType: v.union(
      v.literal("prayer_meeting"),
      v.literal("evangelism"),
      v.literal("bible_study"),
      v.literal("worship"),
      v.literal("conference"),
      v.literal("outreach"),
      v.literal("other")
    ),
    status: v.optional(
      v.union(
        v.literal("upcoming"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("postponed")
      )
    ),
    startDate: v.number(), // Unix timestamp
    endDate: v.optional(v.number()), // Unix timestamp
    location: v.optional(v.string()),
    organizerId: v.id("users"), // Admin, pastor, or shepherd who created the event
    groupId: v.optional(v.id("groups")), // Optional: event for a specific group
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_group", ["groupId"])
    .index("by_start_date", ["startDate"])
    .index("by_type", ["eventType"]),

  // Reminders
  reminders: defineTable({
    userId: v.id("users"), // User to remind (shepherd for attendance, member/shepherd for birthday)
    type: v.union(
      v.literal("attendance_deadline"), // Reminder to take attendance by 3pm
      v.literal("birthday"), // Birthday reminder
      v.literal("anniversary"), // Anniversary reminder
      v.literal("event"), // Event reminder
      v.literal("assignment_due") // Assignment due date reminder
    ),
    title: v.string(),
    message: v.string(),
    reminderDate: v.number(), // When to send the reminder (Unix timestamp)
    relatedId: v.optional(v.string()), // ID of related entity
    relatedType: v.optional(
      v.union(
        v.literal("member"),
        v.literal("event"),
        v.literal("assignment"),
        v.literal("attendance")
      )
    ),
    isSent: v.boolean(), // Whether reminder has been sent
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_reminder_date", ["reminderDate"])
    .index("by_type", ["type"])
    .index("by_sent", ["isSent"]),

  // Regions - admin-managed; can have a pastor assigned and color badge
  regions: defineTable({
    name: v.string(),
    pastorId: v.optional(v.id("users")),
    badgeColor: v.optional(v.string()), // e.g. "blue", "green", "red"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pastor", ["pastorId"]),

  // Bacentas - belong to a region
  bacentas: defineTable({
    name: v.string(),
    regionId: v.id("regions"),
    area: v.optional(v.string()),
    meetingDay: v.optional(v.number()), // 0=Sunday, 1=Monday, ... 6=Saturday
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_region", ["regionId"]),

  // Shepherd-Bacenta many-to-many (a shepherd can have multiple bacentas)
  shepherdBacentas: defineTable({
    shepherdId: v.id("users"),
    bacentaId: v.id("bacentas"),
    addedAt: v.number(),
    addedBy: v.optional(v.id("users")),
  })
    .index("by_shepherd", ["shepherdId"])
    .index("by_bacenta", ["bacentaId"])
    .index("by_shepherd_bacenta", ["shepherdId", "bacentaId"]),

  // Prayer requests - shepherds can send prayer requests for members
  prayerRequests: defineTable({
    memberId: v.id("members"),
    requestedBy: v.id("users"), // Shepherd who created the request
    title: v.string(),
    description: v.string(), // Prayer request details
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.union(
      v.literal("open"), // Request is open for prayer
      v.literal("answered"), // Prayer has been answered
      v.literal("closed") // Request is closed
    ),
    // Recipients - who can see this prayer request
    recipients: v.array(v.id("users")), // Array of user IDs (shepherds, pastors, admins)
    // Responses/prayers
    responses: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          message: v.string(),
          createdAt: v.number(),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    answeredAt: v.optional(v.number()),
  })
    .index("by_member", ["memberId"])
    .index("by_requested_by", ["requestedBy"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
});
