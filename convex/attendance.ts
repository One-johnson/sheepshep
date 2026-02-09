import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import { createNotification } from "./notificationHelpers";
import { Id } from "./_generated/dataModel";

// Create attendance record
// - Shepherds: can create pending attendance for their members
// - Admins/Pastors: can create approved attendance for members and shepherds
export const create = mutation({
  args: {
    token: v.string(),
    memberId: v.optional(v.id("members")), // For member attendance
    userId: v.optional(v.id("users")), // For shepherd/user attendance
    date: v.number(), // Unix timestamp
    attendanceStatus: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("excused"),
      v.literal("late")
    ),
    notes: v.optional(v.string()),
    autoApprove: v.optional(v.boolean()), // For admins/pastors to create approved attendance
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user) {
      throw new Error("User not found");
    }

    // Must have either memberId or userId, but not both
    if (!args.memberId && !args.userId) {
      throw new Error("Either memberId or userId must be provided");
    }
    if (args.memberId && args.userId) {
      throw new Error("Cannot specify both memberId and userId");
    }

    let approvalStatus: "pending" | "approved" = "pending";
    let approvedBy: Id<"users"> | undefined = undefined;
    let approvedAt: number | undefined = undefined;

    // Admins and pastors can create approved attendance directly
    if (user.role === "admin" || user.role === "pastor") {
      if (args.autoApprove) {
        approvalStatus = "approved";
        approvedBy = currentUserId;
        approvedAt = Date.now();
      }
    } else if (user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds, admins, and pastors can create attendance");
    }

    // Validate member or user exists
    if (args.memberId) {
      const member = await ctx.db.get(args.memberId);
      if (!member) {
        throw new Error("Member not found");
      }

      // If shepherd, check if they own this member
      if (user.role === "shepherd" && member.shepherdId !== currentUserId) {
        throw new Error("Unauthorized - member not assigned to you");
      }

      // If pastor, check if they oversee the member's shepherd
      if (user.role === "pastor") {
        const memberShepherd = await ctx.db.get(member.shepherdId);
        if (!memberShepherd || memberShepherd.overseerId !== currentUserId) {
          throw new Error("Unauthorized - you don't oversee this member's shepherd");
        }
      }
    }

    if (args.userId) {
      // Only admins and pastors can create attendance for users (shepherds)
      if (user.role !== "admin" && user.role !== "pastor") {
        throw new Error("Unauthorized - only admins and pastors can create attendance for shepherds");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("User not found");
      }

      // If pastor, check if they oversee this shepherd
      if (user.role === "pastor" && targetUser.overseerId !== currentUserId) {
        throw new Error("Unauthorized - you don't oversee this shepherd");
      }

      // Check for existing attendance for this user on this date
      const date = new Date(args.date);
      date.setHours(0, 0, 0, 0);
      const startOfDay = date.getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      const existingAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      const duplicate = existingAttendance.find(
        (a) => a.date >= startOfDay && a.date < endOfDay
      );

      if (duplicate) {
        throw new Error("Attendance already marked for this user on this date");
      }

      // Auto-approve user attendance when created by admin/pastor
      approvalStatus = "approved";
      approvedBy = currentUserId;
      approvedAt = Date.now();
    }

    // Check for existing attendance for this member on this date
    if (args.memberId) {
      const date = new Date(args.date);
      date.setHours(0, 0, 0, 0);
      const startOfDay = date.getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      const existingAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
        .collect();

      const duplicate = existingAttendance.find(
        (a) => a.date >= startOfDay && a.date < endOfDay
      );

      if (duplicate) {
        throw new Error("Attendance already marked for this member on this date");
      }
    }

    // Create attendance record
    const attendanceId = await ctx.db.insert("attendance", {
      memberId: args.memberId,
      userId: args.userId,
      date: args.date,
      attendanceStatus: args.attendanceStatus,
      submittedBy: currentUserId,
      submittedAt: Date.now(),
      approvalStatus,
      approvedBy,
      approvedAt,
      notes: args.notes,
    });

    // Update member's last attendance date if present
    if (args.memberId && args.attendanceStatus === "present" && approvalStatus === "approved") {
      const member = await ctx.db.get(args.memberId);
      if (member) {
        await ctx.db.patch(args.memberId, {
          lastAttendanceDate: args.date,
          attendanceRiskLevel: "none",
          updatedAt: Date.now(),
        });
      }
    }

    // Notify admins and pastor if pending (shepherd submission)
    if (approvalStatus === "pending" && user.role === "shepherd" && args.memberId) {
      const memberForNotification = await ctx.db.get(args.memberId);
      if (memberForNotification) {
        if (user.overseerId) {
          await createNotification(
            ctx,
            user.overseerId,
            "attendance_pending",
            "Attendance Pending Approval",
            `Attendance for ${memberForNotification.firstName} ${memberForNotification.lastName} is pending approval`,
            attendanceId,
            "attendance"
          );
        }

        // Notify all admins
        const admins = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .collect();

        for (const admin of admins) {
          if (admin.isActive) {
            await createNotification(
              ctx,
              admin._id,
              "attendance_pending",
              "Attendance Pending Approval",
              `Attendance for ${memberForNotification.firstName} ${memberForNotification.lastName} is pending approval`,
              attendanceId,
              "attendance"
            );
          }
        }
      }
    }

    return { attendanceId };
  },
});

// Approve attendance (admin or pastor)
export const approve = mutation({
  args: {
    token: v.string(),
    attendanceId: v.id("attendance"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Only admin or pastor can approve
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - only admins and pastors can approve attendance");
    }

    const attendance = await ctx.db.get(args.attendanceId);
    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    // If pastor, check permissions
    if (user.role === "pastor") {
      const submittedByUser = await ctx.db.get(attendance.submittedBy);
      if (!submittedByUser) {
        throw new Error("User who submitted attendance not found");
      }
      // For member attendance, check if pastor oversees the member's shepherd
      if (attendance.memberId) {
        const member = await ctx.db.get(attendance.memberId);
        if (!member) {
          throw new Error("Member not found");
        }
        const memberShepherd = await ctx.db.get(member.shepherdId);
        if (!memberShepherd || memberShepherd.overseerId !== userId) {
          throw new Error("Unauthorized - you don't oversee this member's shepherd");
        }
      } else if (attendance.userId) {
        // For user attendance, check if pastor oversees the user
        const targetUser = await ctx.db.get(attendance.userId);
        if (!targetUser || targetUser.overseerId !== userId) {
          throw new Error("Unauthorized - you don't oversee this shepherd");
        }
      }
    }

    // Update attendance status
    await ctx.db.patch(args.attendanceId, {
      approvalStatus: "approved",
      approvedBy: userId,
      approvedAt: Date.now(),
      notes: args.notes || attendance.notes,
    });

    // Update member's last attendance date if present
    if (attendance.attendanceStatus === "present" && attendance.memberId) {
      const member = await ctx.db.get(attendance.memberId);
      if (member) {
        // Update last attendance date and reset risk level
        await ctx.db.patch(attendance.memberId, {
          lastAttendanceDate: attendance.date,
          attendanceRiskLevel: "none", // Reset risk level when they attend
          updatedAt: Date.now(),
        });
      }
    }

    // Notify the shepherd
    await createNotification(
      ctx,
      attendance.submittedBy,
      "attendance_approved",
      "Attendance Approved",
      `Attendance for member has been approved`,
      args.attendanceId,
      "attendance"
    );

    return { success: true };
  },
});

// Reject attendance (admin or pastor)
export const reject = mutation({
  args: {
    token: v.string(),
    attendanceId: v.id("attendance"),
    rejectionReason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Only admin or pastor can reject
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - only admins and pastors can reject attendance");
    }

    const attendance = await ctx.db.get(args.attendanceId);
    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    // If pastor, check permissions
    if (user.role === "pastor") {
      const submittedByUser = await ctx.db.get(attendance.submittedBy);
      if (!submittedByUser) {
        throw new Error("User who submitted attendance not found");
      }
      // For member attendance, check if pastor oversees the member's shepherd
      if (attendance.memberId) {
        const member = await ctx.db.get(attendance.memberId);
        if (!member) {
          throw new Error("Member not found");
        }
        const memberShepherd = await ctx.db.get(member.shepherdId);
        if (!memberShepherd || memberShepherd.overseerId !== userId) {
          throw new Error("Unauthorized - you don't oversee this member's shepherd");
        }
      } else if (attendance.userId) {
        // For user attendance, check if pastor oversees the user
        const targetUser = await ctx.db.get(attendance.userId);
        if (!targetUser || targetUser.overseerId !== userId) {
          throw new Error("Unauthorized - you don't oversee this shepherd");
        }
      }
    }

    // Update attendance status
    await ctx.db.patch(args.attendanceId, {
      approvalStatus: "rejected",
      approvedBy: userId,
      approvedAt: Date.now(),
      rejectionReason: args.rejectionReason,
    });

    // Notify the shepherd
    await createNotification(
      ctx,
      attendance.submittedBy,
      "attendance_rejected",
      "Attendance Rejected",
      `Attendance was rejected: ${args.rejectionReason}`,
      args.attendanceId,
      "attendance"
    );

    return { success: true };
  },
});

// Get attendance by ID
export const getById = query({
  args: {
    token: v.string(),
    attendanceId: v.id("attendance"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.get(args.attendanceId);
  },
});

// Check existing attendance for members on a specific date
export const checkExistingAttendance = query({
  args: {
    token: v.string(),
    memberIds: v.array(v.id("members")),
    date: v.number(), // Unix timestamp for the date
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate start and end of the day
    const date = new Date(args.date);
    date.setHours(0, 0, 0, 0);
    const startOfDay = date.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    // Get all attendance records for these members on this date
    const allAttendance = await ctx.db.query("attendance").collect();
    
    const existingAttendance = allAttendance.filter(
      (a) =>
        a.memberId &&
        args.memberIds.includes(a.memberId) &&
        a.date >= startOfDay &&
        a.date < endOfDay
    );

    // Return a map of memberId -> attendance record
    const result: Record<string, any> = {};
    for (const attendance of existingAttendance) {
      if (attendance.memberId) {
        result[attendance.memberId] = attendance;
      }
    }

    return result;
  },
});

// List attendance records
export const list = query({
  args: {
    token: v.string(),
    memberId: v.optional(v.id("members")),
    userId: v.optional(v.id("users")), // Filter by user (shepherd) attendance
    approvalStatus: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user) {
      throw new Error("User not found");
    }

    let attendance = await ctx.db.query("attendance").collect();

    // Filter by role permissions
    if (user.role === "shepherd") {
      // Shepherds can only see attendance for their own members
      const myMembers = await ctx.db
        .query("members")
        .withIndex("by_shepherd", (q) => q.eq("shepherdId", currentUserId))
        .collect();
      const myMemberIds = myMembers.map((m) => m._id);
      attendance = attendance.filter(
        (a) => (a.memberId && myMemberIds.includes(a.memberId)) || a.submittedBy === currentUserId
      );
    } else if (user.role === "pastor") {
      // Pastors can see attendance from their shepherds and their members
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", currentUserId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      
      // Get members assigned to these shepherds
      const members = await ctx.db.query("members").collect();
      const pastorMemberIds = members
        .filter((m) => shepherdIds.includes(m.shepherdId))
        .map((m) => m._id);

      attendance = attendance.filter(
        (a) =>
          (a.memberId && pastorMemberIds.includes(a.memberId)) ||
          (a.userId && shepherdIds.includes(a.userId)) ||
          shepherdIds.includes(a.submittedBy)
      );
    }
    // Admins can see all

    // Apply filters
    if (args.memberId) {
      attendance = attendance.filter((a) => a.memberId === args.memberId);
    }

    if (args.userId) {
      attendance = attendance.filter((a) => a.userId === args.userId);
    }

    if (args.approvalStatus) {
      attendance = attendance.filter((a) => a.approvalStatus === args.approvalStatus);
    }

    if (args.startDate) {
      attendance = attendance.filter((a) => a.date >= args.startDate!);
    }

    if (args.endDate) {
      attendance = attendance.filter((a) => a.date <= args.endDate!);
    }

    return attendance.sort((a, b) => b.date - a.date);
  },
});

// Update attendance (shepherd can update pending records)
export const update = mutation({
  args: {
    token: v.string(),
    attendanceId: v.id("attendance"),
    attendanceStatus: v.optional(
      v.union(v.literal("present"), v.literal("absent"), v.literal("excused"), v.literal("late"))
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const attendance = await ctx.db.get(args.attendanceId);
    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    // Only allow updates if pending and submitted by the same user
    if (attendance.approvalStatus !== "pending" || attendance.submittedBy !== userId) {
      throw new Error("Unauthorized - can only update pending records you submitted");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.attendanceStatus !== undefined) {
      updates.attendanceStatus = args.attendanceStatus;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.attendanceId, updates);

    return await ctx.db.get(args.attendanceId);
  },
});

// Delete attendance (only pending records by submitter)
export const remove = mutation({
  args: {
    token: v.string(),
    attendanceId: v.id("attendance"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const attendance = await ctx.db.get(args.attendanceId);
    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    // Only allow deletion if pending and submitted by the same user, or if admin
    if (
      user.role !== "admin" &&
      (attendance.approvalStatus !== "pending" || attendance.submittedBy !== userId)
    ) {
      throw new Error("Unauthorized - can only delete pending records you submitted");
    }

    await ctx.db.delete(args.attendanceId);

    return { success: true };
  },
});

// Bulk create attendance records
// - Shepherds: can create pending attendance for their members
// - Admins/Pastors: can create approved attendance for members and shepherds
export const bulkCreate = mutation({
  args: {
    token: v.string(),
    attendanceRecords: v.array(
      v.object({
        memberId: v.optional(v.id("members")),
        userId: v.optional(v.id("users")), // For shepherd attendance
        date: v.number(),
        attendanceStatus: v.union(
          v.literal("present"),
          v.literal("absent"),
          v.literal("excused"),
          v.literal("late")
        ),
        notes: v.optional(v.string()),
      })
    ),
    autoApprove: v.optional(v.boolean()), // For admins/pastors to create approved attendance
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user) {
      throw new Error("User not found");
    }

    // Admins and pastors can create approved attendance directly
    let approvalStatus: "pending" | "approved" = "pending";
    let approvedBy: Id<"users"> | undefined = undefined;
    let approvedAt: number | undefined = undefined;

    if (user.role === "admin" || user.role === "pastor") {
      if (args.autoApprove) {
        approvalStatus = "approved";
        approvedBy = currentUserId;
        approvedAt = Date.now();
      }
    } else if (user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds, admins, and pastors can create attendance");
    }

    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < args.attendanceRecords.length; i++) {
      const record = args.attendanceRecords[i];

      try {
        // Must have either memberId or userId, but not both
        if (!record.memberId && !record.userId) {
          errors.push({ index: i, error: "Either memberId or userId must be provided" });
          continue;
        }
        if (record.memberId && record.userId) {
          errors.push({ index: i, error: "Cannot specify both memberId and userId" });
          continue;
        }

        if (record.memberId) {
          const member = await ctx.db.get(record.memberId);
          if (!member) {
            errors.push({ index: i, error: "Member not found" });
            continue;
          }

          // If shepherd, check if they own this member
          if (user.role === "shepherd" && member.shepherdId !== currentUserId) {
            errors.push({ index: i, error: "Member not assigned to you" });
            continue;
          }

          // If pastor, check if they oversee the member's shepherd
          if (user.role === "pastor") {
            const memberShepherd = await ctx.db.get(member.shepherdId);
            if (!memberShepherd || memberShepherd.overseerId !== currentUserId) {
              errors.push({ index: i, error: "You don't oversee this member's shepherd" });
              continue;
            }
          }

          // Check for existing attendance for this member on this date
          const date = new Date(record.date);
          date.setHours(0, 0, 0, 0);
          const startOfDay = date.getTime();
          const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

          const existingAttendance = await ctx.db
            .query("attendance")
            .withIndex("by_member", (q) => q.eq("memberId", record.memberId))
            .collect();

          const duplicate = existingAttendance.find(
            (a) => a.date >= startOfDay && a.date < endOfDay
          );

          if (duplicate) {
            errors.push({ index: i, error: "Attendance already marked for this member on this date" });
            continue;
          }

          // Create attendance record
          const attendanceId = await ctx.db.insert("attendance", {
            memberId: record.memberId,
            date: record.date,
            attendanceStatus: record.attendanceStatus,
            submittedBy: currentUserId,
            submittedAt: Date.now(),
            approvalStatus,
            approvedBy,
            approvedAt,
            notes: record.notes,
          });

          // Update member's last attendance date if present and approved
          if (record.attendanceStatus === "present" && approvalStatus === "approved") {
            await ctx.db.patch(record.memberId, {
              lastAttendanceDate: record.date,
              attendanceRiskLevel: "none",
              updatedAt: Date.now(),
            });
          }

          created.push(attendanceId);
        } else if (record.userId) {
          // Only admins and pastors can create attendance for users (shepherds)
          if (user.role !== "admin" && user.role !== "pastor") {
            errors.push({
              index: i,
              error: "Only admins and pastors can create attendance for shepherds",
            });
            continue;
          }

          const targetUser = await ctx.db.get(record.userId);
          if (!targetUser) {
            errors.push({ index: i, error: "User not found" });
            continue;
          }

          // If pastor, check if they oversee this shepherd
          if (user.role === "pastor" && targetUser.overseerId !== currentUserId) {
            errors.push({ index: i, error: "You don't oversee this shepherd" });
            continue;
          }

          // Check for existing attendance for this user on this date
          const date = new Date(record.date);
          date.setHours(0, 0, 0, 0);
          const startOfDay = date.getTime();
          const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

          const existingAttendance = await ctx.db
            .query("attendance")
            .withIndex("by_user", (q) => q.eq("userId", record.userId))
            .collect();

          const duplicate = existingAttendance.find(
            (a) => a.date >= startOfDay && a.date < endOfDay
          );

          if (duplicate) {
            errors.push({ index: i, error: "Attendance already marked for this user on this date" });
            continue;
          }

          // Auto-approve user attendance when created by admin/pastor
          const attendanceId = await ctx.db.insert("attendance", {
            userId: record.userId,
            date: record.date,
            attendanceStatus: record.attendanceStatus,
            submittedBy: currentUserId,
            submittedAt: Date.now(),
            approvalStatus: "approved",
            approvedBy: currentUserId,
            approvedAt: Date.now(),
            notes: record.notes,
          });

          created.push(attendanceId);
        }
      } catch (error: any) {
        errors.push({ index: i, error: error.message || "Unknown error" });
      }
    }

    // Notify admins and pastor if any records were created as pending (shepherd submission)
    if (created.length > 0 && approvalStatus === "pending" && user.role === "shepherd") {
      if (user.overseerId) {
        await createNotification(
          ctx,
          user.overseerId,
          "attendance_pending",
          "Bulk Attendance Pending Approval",
          `${created.length} attendance records are pending approval`,
          created[0],
          "attendance"
        );
      }

      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();

      for (const admin of admins) {
        if (admin.isActive) {
          await createNotification(
            ctx,
            admin._id,
            "attendance_pending",
            "Bulk Attendance Pending Approval",
            `${created.length} attendance records are pending approval`,
            created[0],
            "attendance"
          );
        }
      }
    }

    return {
      success: true,
      created: created.length,
      total: args.attendanceRecords.length,
      attendanceIds: created,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Bulk delete attendance records
export const bulkDelete = mutation({
  args: {
    token: v.string(),
    attendanceIds: v.array(v.id("attendance")),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const deleted: string[] = [];
    const errors: Array<{ attendanceId: string; error: string }> = [];

    for (const attendanceId of args.attendanceIds) {
      try {
        const attendance = await ctx.db.get(attendanceId);
        if (!attendance) {
          errors.push({ attendanceId, error: "Attendance record not found" });
          continue;
        }

        // Check permissions
        if (
          user.role !== "admin" &&
          (attendance.approvalStatus !== "pending" || attendance.submittedBy !== userId)
        ) {
          errors.push({
            attendanceId,
            error: "Unauthorized - can only delete pending records you submitted",
          });
          continue;
        }

        await ctx.db.delete(attendanceId);
        deleted.push(attendanceId);
      } catch (error: any) {
        errors.push({ attendanceId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      deleted: deleted.length,
      total: args.attendanceIds.length,
      attendanceIds: deleted,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Get shepherds for attendance management (role-based)
export const getShepherds = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let shepherds = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "shepherd"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter by role permissions
    if (user.role === "pastor") {
      // Pastors can only see their shepherds
      shepherds = shepherds.filter((s) => s.overseerId === userId);
    } else if (user.role === "shepherd") {
      // Shepherds cannot see other shepherds
      return [];
    }
    // Admins can see all

    // Remove password hashes from response
    return shepherds.map((s) => {
      const { passwordHash: _, ...shepherdWithoutPassword } = s;
      return shepherdWithoutPassword;
    });
  },
});
