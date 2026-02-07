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

// Create report (shepherd submits report on assignment)
export const create = mutation({
  args: {
    token: v.string(),
    assignmentId: v.id("assignments"),
    reportType: v.union(
      v.literal("visitation"),
      v.literal("prayer"),
      v.literal("follow_up"),
      v.literal("other")
    ),
    title: v.string(),
    content: v.string(),
    visitDate: v.optional(v.number()),
    outcome: v.optional(
      v.union(
        v.literal("successful"),
        v.literal("partial"),
        v.literal("unsuccessful"),
        v.literal("rescheduled")
      )
    ),
    attachments: v.optional(v.array(v.id("_storage"))),
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

    // Only shepherds can create reports
    if (user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds can create reports");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Check if assignment belongs to this shepherd
    if (assignment.shepherdId !== userId) {
      throw new Error("Unauthorized - assignment not assigned to you");
    }

    // Create report
    const reportId = await ctx.db.insert("reports", {
      assignmentId: args.assignmentId,
      memberId: assignment.memberId,
      shepherdId: userId,
      reportType: args.reportType,
      title: args.title,
      content: args.content,
      visitDate: args.visitDate,
      outcome: args.outcome,
      attachments: args.attachments,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submittedAt: Date.now(),
    });

    // Notify admin and pastor
    if (user.overseerId) {
      await createNotification(
        ctx,
        user.overseerId,
        "report_submitted",
        "New Report Submitted",
        `Report "${args.title}" has been submitted`,
        reportId,
        "report"
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
          "report_submitted",
          "New Report Submitted",
          `Report "${args.title}" has been submitted`,
          reportId,
          "report"
        );
      }
    }

    return { reportId };
  },
});

// Get report by ID
export const getById = query({
  args: {
    token: v.string(),
    reportId: v.id("reports"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.get(args.reportId);
  },
});

// List reports
export const list = query({
  args: {
    token: v.string(),
    assignmentId: v.optional(v.id("assignments")),
    memberId: v.optional(v.id("members")),
    shepherdId: v.optional(v.id("users")),
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

    let reports = await ctx.db.query("reports").collect();

    // Filter by role permissions
    if (user.role === "shepherd") {
      // Shepherds can only see their own reports
      reports = reports.filter((r) => r.shepherdId === userId);
    } else if (user.role === "pastor") {
      // Pastors can see reports from their shepherds
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      reports = reports.filter((r) => shepherdIds.includes(r.shepherdId));
    }
    // Admins can see all

    // Apply filters
    if (args.assignmentId) {
      reports = reports.filter((r) => r.assignmentId === args.assignmentId);
    }

    if (args.memberId) {
      reports = reports.filter((r) => r.memberId === args.memberId);
    }

    if (args.shepherdId) {
      reports = reports.filter((r) => r.shepherdId === args.shepherdId);
    }

    return reports.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update report (shepherd can update their own reports)
export const update = mutation({
  args: {
    token: v.string(),
    reportId: v.id("reports"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    visitDate: v.optional(v.number()),
    outcome: v.optional(
      v.union(
        v.literal("successful"),
        v.literal("partial"),
        v.literal("unsuccessful"),
        v.literal("rescheduled")
      )
    ),
    attachments: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Shepherds can update their own reports, admins/pastors can update any
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      report.shepherdId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.visitDate !== undefined) updates.visitDate = args.visitDate;
    if (args.outcome !== undefined) updates.outcome = args.outcome;
    if (args.attachments !== undefined) updates.attachments = args.attachments;

    await ctx.db.patch(args.reportId, updates);

    return await ctx.db.get(args.reportId);
  },
});

// Delete report
export const remove = mutation({
  args: {
    token: v.string(),
    reportId: v.id("reports"),
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

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Shepherds can delete their own reports, admins/pastors can delete any
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      report.shepherdId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.reportId);

    return { success: true };
  },
});

// Bulk create reports
export const bulkCreate = mutation({
  args: {
    token: v.string(),
    reports: v.array(
      v.object({
        assignmentId: v.id("assignments"),
        reportType: v.union(
          v.literal("visitation"),
          v.literal("prayer"),
          v.literal("follow_up"),
          v.literal("other")
        ),
        title: v.string(),
        content: v.string(),
        visitDate: v.optional(v.number()),
        outcome: v.optional(
          v.union(
            v.literal("successful"),
            v.literal("partial"),
            v.literal("unsuccessful"),
            v.literal("rescheduled")
          )
        ),
        attachments: v.optional(v.array(v.id("_storage"))),
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

    // Only shepherds can create reports
    if (user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds can create reports");
    }

    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < args.reports.length; i++) {
      const reportData = args.reports[i];

      try {
        const assignment = await ctx.db.get(reportData.assignmentId);
        if (!assignment) {
          errors.push({ index: i, error: "Assignment not found" });
          continue;
        }

        // Check if assignment belongs to this shepherd
        if (assignment.shepherdId !== userId) {
          errors.push({ index: i, error: "Assignment not assigned to you" });
          continue;
        }

        // Create report
        const reportId = await ctx.db.insert("reports", {
          assignmentId: reportData.assignmentId,
          memberId: assignment.memberId,
          shepherdId: userId,
          reportType: reportData.reportType,
          title: reportData.title,
          content: reportData.content,
          visitDate: reportData.visitDate,
          outcome: reportData.outcome,
          attachments: reportData.attachments,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          submittedAt: Date.now(),
        });

        created.push(reportId);

        // Notify admin and pastor
        if (user.overseerId) {
          await createNotification(
            ctx,
            user.overseerId,
            "report_submitted",
            "New Report Submitted",
            `Report "${reportData.title}" has been submitted`,
            reportId,
            "report"
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
              "report_submitted",
              "New Report Submitted",
              `Report "${reportData.title}" has been submitted`,
              reportId,
              "report"
            );
          }
        }
      } catch (error: any) {
        errors.push({ index: i, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      created: created.length,
      total: args.reports.length,
      reportIds: created,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Bulk delete reports
export const bulkDelete = mutation({
  args: {
    token: v.string(),
    reportIds: v.array(v.id("reports")),
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
    const errors: Array<{ reportId: string; error: string }> = [];

    for (const reportId of args.reportIds) {
      try {
        const report = await ctx.db.get(reportId);
        if (!report) {
          errors.push({ reportId, error: "Report not found" });
          continue;
        }

        // Shepherds can delete their own reports, admins/pastors can delete any
        if (
          user.role !== "admin" &&
          user.role !== "pastor" &&
          report.shepherdId !== userId
        ) {
          errors.push({ reportId, error: "Unauthorized" });
          continue;
        }

        await ctx.db.delete(reportId);
        deleted.push(reportId);
      } catch (error: any) {
        errors.push({ reportId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      deleted: deleted.length,
      total: args.reportIds.length,
      reportIds: deleted,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
