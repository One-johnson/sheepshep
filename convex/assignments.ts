import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import { createNotification } from "./notificationHelpers";

// Create assignment (admin or pastor assigns member to shepherd)
export const create = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
    shepherdId: v.id("users"),
    assignmentType: v.union(
      v.literal("visitation"),
      v.literal("prayer"),
      v.literal("follow_up"),
      v.literal("other")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
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

    // Only admin or pastor can create assignments
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - only admins and pastors can create assignments");
    }

    // Verify shepherd exists and is a shepherd
    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd || shepherd.role !== "shepherd") {
      throw new Error("Invalid shepherd");
    }

    // If pastor, check if they oversee this shepherd
    if (user.role === "pastor" && shepherd.overseerId !== userId) {
      throw new Error("Unauthorized - you don't oversee this shepherd");
    }

    // Verify member exists
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Create assignment
    const assignmentId = await ctx.db.insert("assignments", {
      memberId: args.memberId,
      shepherdId: args.shepherdId,
      assignedBy: userId,
      assignmentType: args.assignmentType,
      title: args.title,
      description: args.description,
      dueDate: args.dueDate,
      status: "pending",
      priority: args.priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Notify the shepherd
    try {
      await createNotification(
        ctx,
        args.shepherdId,
        "assignment_assigned",
        "New Assignment",
        `You have been assigned: ${args.title}`,
        assignmentId,
        "assignment"
      );
    } catch (error) {
      // Log error but don't fail the assignment creation
      console.error("Failed to create notification:", error);
    }

    // Notify the creator (admin/pastor) about successful assignment creation
    try {
      const memberName = `${member.firstName} ${member.lastName}`;
      await createNotification(
        ctx,
        userId,
        "assignment_assigned",
        "Assignment Created",
        `You successfully created assignment "${args.title}" for ${memberName}`,
        assignmentId,
        "assignment"
      );
    } catch (error) {
      // Log error but don't fail the assignment creation
      console.error("Failed to create creator notification:", error);
    }

    return { assignmentId };
  },
});

// Get assignment by ID
export const getById = query({
  args: {
    token: v.string(),
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.get(args.assignmentId);
  },
});

// List assignments
export const list = query({
  args: {
    token: v.string(),
    memberId: v.optional(v.id("members")),
    shepherdId: v.optional(v.id("users")),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled"))
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

    let assignments = await ctx.db.query("assignments").collect();

    // Filter by role permissions
    if (user.role === "shepherd") {
      // Shepherds can only see their own assignments
      assignments = assignments.filter((a) => a.shepherdId === userId);
    } else if (user.role === "pastor") {
      // Pastors can see assignments for their shepherds
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      assignments = assignments.filter((a) => shepherdIds.includes(a.shepherdId));
    }
    // Admins can see all

    // Apply filters
    if (args.memberId) {
      assignments = assignments.filter((a) => a.memberId === args.memberId);
    }

    if (args.shepherdId) {
      assignments = assignments.filter((a) => a.shepherdId === args.shepherdId);
    }

    if (args.status) {
      assignments = assignments.filter((a) => a.status === args.status);
    }

    return assignments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update assignment status (shepherd updates their assignments)
export const update = mutation({
  args: {
    token: v.string(),
    assignmentId: v.id("assignments"),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled"))
    ),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Shepherds can update their own assignments, admins/pastors can update any
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      assignment.shepherdId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.status !== undefined) {
      updates.status = args.status;
      if (args.status === "completed") {
        updates.completedAt = Date.now();
      }
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.assignmentId, updates);

    // Notify if completed
    if (args.status === "completed") {
      await createNotification(
        ctx,
        assignment.assignedBy,
        "assignment_completed",
        "Assignment Completed",
        `Assignment "${assignment.title}" has been completed`,
        args.assignmentId,
        "assignment"
      );
    }

    return await ctx.db.get(args.assignmentId);
  },
});

// Delete assignment (admin or pastor)
export const remove = mutation({
  args: {
    token: v.string(),
    assignmentId: v.id("assignments"),
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

    // Only admin or pastor can delete
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - only admins and pastors can delete assignments");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // If pastor, check if they oversee the shepherd
    const shepherd = await ctx.db.get(assignment.shepherdId);
    if (user.role === "pastor") {
      if (!shepherd || shepherd.overseerId !== userId) {
        throw new Error("Unauthorized - you don't oversee this shepherd");
      }
    }

    // Get member and shepherd info for audit log
    const member = await ctx.db.get(assignment.memberId);
    const shepherdName = shepherd?.name || "Unknown";
    const memberName = member ? `${member.firstName} ${member.lastName}` : "Unknown";

    await ctx.db.delete(args.assignmentId);

    // Log deletion in audit log
    await ctx.db.insert("auditLogs", {
      userId: userId,
      action: "delete_assignment",
      entityType: "assignments",
      entityId: args.assignmentId,
      details: JSON.stringify({
        assignmentTitle: assignment.title,
        assignmentType: assignment.assignmentType,
        memberId: assignment.memberId,
        memberName: memberName,
        shepherdId: assignment.shepherdId,
        shepherdName: shepherdName,
        status: assignment.status,
        priority: assignment.priority,
      }),
      createdAt: Date.now(),
    });

    // Notify the shepherd
    if (assignment.shepherdId) {
      await createNotification(
        ctx,
        assignment.shepherdId,
        "assignment_deleted",
        "Assignment Deleted",
        `Assignment "${assignment.title}" for ${memberName} has been deleted`,
        args.assignmentId,
        "assignment"
      );
    }

    return { success: true };
  },
});

// Bulk create assignments
export const bulkCreate = mutation({
  args: {
    token: v.string(),
    assignments: v.array(
      v.object({
        memberId: v.id("members"),
        shepherdId: v.id("users"),
        assignmentType: v.union(
          v.literal("visitation"),
          v.literal("prayer"),
          v.literal("follow_up"),
          v.literal("other")
        ),
        title: v.string(),
        description: v.optional(v.string()),
        dueDate: v.optional(v.number()),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
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

    // Only admin or pastor can create assignments
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - only admins and pastors can create assignments");
    }

    const created: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < args.assignments.length; i++) {
      const assignmentData = args.assignments[i];

      try {
        // Verify shepherd exists and is a shepherd
        const shepherd = await ctx.db.get(assignmentData.shepherdId);
        if (!shepherd || shepherd.role !== "shepherd") {
          errors.push({ index: i, error: "Invalid shepherd" });
          continue;
        }

        // If pastor, check if they oversee this shepherd
        if (user.role === "pastor" && shepherd.overseerId !== userId) {
          errors.push({ index: i, error: "You don't oversee this shepherd" });
          continue;
        }

        // Verify member exists
        const member = await ctx.db.get(assignmentData.memberId);
        if (!member) {
          errors.push({ index: i, error: "Member not found" });
          continue;
        }

        // Create assignment
        const assignmentId = await ctx.db.insert("assignments", {
          memberId: assignmentData.memberId,
          shepherdId: assignmentData.shepherdId,
          assignedBy: userId,
          assignmentType: assignmentData.assignmentType,
          title: assignmentData.title,
          description: assignmentData.description,
          dueDate: assignmentData.dueDate,
          status: "pending",
          priority: assignmentData.priority,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        created.push(assignmentId);

        // Notify the shepherd
        try {
          await createNotification(
            ctx,
            assignmentData.shepherdId,
            "assignment_assigned",
            "New Assignment",
            `You have been assigned: ${assignmentData.title}`,
            assignmentId,
            "assignment"
          );
        } catch (error) {
          console.error("Failed to create shepherd notification:", error);
        }

        // Notify the creator (admin/pastor) about successful assignment creation
        try {
          const memberName = `${member.firstName} ${member.lastName}`;
          await createNotification(
            ctx,
            userId,
            "assignment_assigned",
            "Assignment Created",
            `You successfully created assignment "${assignmentData.title}" for ${memberName}`,
            assignmentId,
            "assignment"
          );
        } catch (error) {
          console.error("Failed to create creator notification:", error);
        }
      } catch (error: any) {
        errors.push({ index: i, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      created: created.length,
      total: args.assignments.length,
      assignmentIds: created,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Bulk delete assignments
export const bulkDelete = mutation({
  args: {
    token: v.string(),
    assignmentIds: v.array(v.id("assignments")),
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

    // Only admin or pastor can delete
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - only admins and pastors can delete assignments");
    }

    const deleted: string[] = [];
    const errors: Array<{ assignmentId: string; error: string }> = [];

    for (const assignmentId of args.assignmentIds) {
      try {
        const assignment = await ctx.db.get(assignmentId);
        if (!assignment) {
          errors.push({ assignmentId, error: "Assignment not found" });
          continue;
        }

        // If pastor, check if they oversee the shepherd
        const shepherd = await ctx.db.get(assignment.shepherdId);
        if (user.role === "pastor") {
          if (!shepherd || shepherd.overseerId !== userId) {
            errors.push({ assignmentId, error: "You don't oversee this shepherd" });
            continue;
          }
        }

        // Get member info for audit log
        const member = await ctx.db.get(assignment.memberId);
        const shepherdName = shepherd?.name || "Unknown";
        const memberName = member ? `${member.firstName} ${member.lastName}` : "Unknown";

        await ctx.db.delete(assignmentId);

        // Log deletion in audit log
        await ctx.db.insert("auditLogs", {
          userId: userId,
          action: "delete_assignment",
          entityType: "assignments",
          entityId: assignmentId,
          details: JSON.stringify({
            assignmentTitle: assignment.title,
            assignmentType: assignment.assignmentType,
            memberId: assignment.memberId,
            memberName: memberName,
            shepherdId: assignment.shepherdId,
            shepherdName: shepherdName,
            status: assignment.status,
            priority: assignment.priority,
          }),
          createdAt: Date.now(),
        });

        // Notify the shepherd
        if (assignment.shepherdId) {
          await createNotification(
            ctx,
            assignment.shepherdId,
            "assignment_deleted",
            "Assignment Deleted",
            `Assignment "${assignment.title}" for ${memberName} has been deleted`,
            assignmentId,
            "assignment"
          );
        }

        deleted.push(assignmentId);
      } catch (error: any) {
        errors.push({ assignmentId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      deleted: deleted.length,
      total: args.assignmentIds.length,
      assignmentIds: deleted,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
