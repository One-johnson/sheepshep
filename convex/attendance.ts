import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";


// Helper function to create notification
async function createNotification(
  ctx: any,
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string
) {
  await ctx.db.insert("notifications", {
    userId: userId as any,
    type: type as any,
    title,
    message,
    relatedId,
    relatedType: relatedType as any,
    isRead: false,
    createdAt: Date.now(),
  });
}

// Create attendance record (shepherd submits)
export const create = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
    date: v.number(), // Unix timestamp
    attendanceStatus: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("excused"),
      v.literal("late")
    ),
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

    // Only shepherds can submit attendance
    if (user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds can submit attendance");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if shepherd owns this member
    if (member.shepherdId !== userId) {
      throw new Error("Unauthorized - member not assigned to you");
    }

    // Create attendance record with pending status
    const attendanceId = await ctx.db.insert("attendance", {
      memberId: args.memberId,
      date: args.date,
      attendanceStatus: args.attendanceStatus,
      submittedBy: userId,
      submittedAt: Date.now(),
      approvalStatus: "pending",
      notes: args.notes,
    });

    // Notify admin and pastor (if member's shepherd has an overseer)
    if (user.overseerId) {
      await createNotification(
        ctx,
        user.overseerId,
        "attendance_pending",
        "Attendance Pending Approval",
        `Attendance for ${member.firstName} ${member.lastName} is pending approval`,
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
          `Attendance for ${member.firstName} ${member.lastName} is pending approval`,
          attendanceId,
          "attendance"
        );
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

    // If pastor, check if they oversee the shepherd
    if (user.role === "pastor") {
      const submittedByUser = await ctx.db.get(attendance.submittedBy);
      if (!submittedByUser || submittedByUser.overseerId !== userId) {
        throw new Error("Unauthorized - you don't oversee this shepherd");
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
    if (attendance.attendanceStatus === "present") {
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

    // If pastor, check if they oversee the shepherd
    if (user.role === "pastor") {
      const submittedByUser = await ctx.db.get(attendance.submittedBy);
      if (!submittedByUser || submittedByUser.overseerId !== userId) {
        throw new Error("Unauthorized - you don't oversee this shepherd");
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

// List attendance records
export const list = query({
  args: {
    token: v.string(),
    memberId: v.optional(v.id("members")),
    approvalStatus: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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

    let attendance = await ctx.db.query("attendance").collect();

    // Filter by role permissions
    if (user.role === "shepherd") {
      // Shepherds can only see their own submissions
      attendance = attendance.filter((a) => a.submittedBy === userId);
    } else if (user.role === "pastor") {
      // Pastors can see attendance from their shepherds
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      attendance = attendance.filter((a) => shepherdIds.includes(a.submittedBy));
    }
    // Admins can see all

    // Apply filters
    if (args.memberId) {
      attendance = attendance.filter((a) => a.memberId === args.memberId);
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
export const bulkCreate = mutation({
  args: {
    token: v.string(),
    attendanceRecords: v.array(
      v.object({
        memberId: v.id("members"),
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

    // Only shepherds can submit attendance
    if (user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds can submit attendance");
    }

    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < args.attendanceRecords.length; i++) {
      const record = args.attendanceRecords[i];

      try {
        const member = await ctx.db.get(record.memberId);
        if (!member) {
          errors.push({ index: i, error: "Member not found" });
          continue;
        }

        // Check if shepherd owns this member
        if (member.shepherdId !== userId) {
          errors.push({ index: i, error: "Member not assigned to you" });
          continue;
        }

        // Create attendance record
        const attendanceId = await ctx.db.insert("attendance", {
          memberId: record.memberId,
          date: record.date,
          attendanceStatus: record.attendanceStatus,
          submittedBy: userId,
          submittedAt: Date.now(),
          approvalStatus: "pending",
          notes: record.notes,
        });

        created.push(attendanceId);
      } catch (error: any) {
        errors.push({ index: i, error: error.message || "Unknown error" });
      }
    }

    // Notify admins and pastor if any records were created
    if (created.length > 0) {
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
