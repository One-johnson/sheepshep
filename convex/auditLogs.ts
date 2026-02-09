import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import { Id } from "./_generated/dataModel";

// List audit logs (admin only)
export const list = query({
  args: {
    token: v.string(),
    action: v.optional(v.string()),
    entityType: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    paginationToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Apply filters
    if (args.action) {
      logs = logs.filter((log) => log.action === args.action);
    }

    if (args.entityType) {
      logs = logs.filter((log) => log.entityType === args.entityType);
    }

    if (args.userId) {
      logs = logs.filter((log) => log.userId === args.userId);
    }

    if (args.startDate) {
      logs = logs.filter((log) => log.createdAt >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter((log) => log.createdAt <= args.endDate!);
    }

    // Apply limit
    const limit = args.limit || 50;
    const paginatedLogs = logs.slice(0, limit);

    // Get user details and entity custom IDs for each log
    const logsWithUsers = await Promise.all(
      paginatedLogs.map(async (log) => {
        const logUser = await ctx.db.get(log.userId);
        
        // Fetch customId for members
        let entityCustomId: string | undefined;
        if (log.entityType === "member" && log.entityId) {
          try {
            const member = await ctx.db.get(log.entityId as Id<"members">);
            entityCustomId = member?.customId;
          } catch {
            // Entity might not exist anymore, ignore
          }
        }
        
        return {
          ...log,
          userName: logUser?.name || "Unknown",
          userEmail: logUser?.email || "Unknown",
          userRole: logUser?.role || "Unknown",
          entityCustomId,
        };
      })
    );

    return {
      logs: logsWithUsers,
      total: logs.length,
      hasMore: logs.length > limit,
    };
  },
});

// Create audit log entry (internal - called by other mutations)
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      details: args.details,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

// Delete single audit log (admin only)
export const deleteLog = mutation({
  args: {
    token: v.string(),
    logId: v.id("auditLogs"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    const log = await ctx.db.get(args.logId);
    if (!log) {
      throw new Error("Audit log not found");
    }

    await ctx.db.delete(args.logId);
    return { success: true };
  },
});

// Bulk delete audit logs (admin only)
export const bulkDelete = mutation({
  args: {
    token: v.string(),
    logIds: v.array(v.id("auditLogs")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(currentUserId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    const deleted: string[] = [];
    const errors: Array<{ logId: string; error: string }> = [];

    for (const logId of args.logIds) {
      try {
        const log = await ctx.db.get(logId);
        if (!log) {
          errors.push({ logId, error: "Audit log not found" });
          continue;
        }

        await ctx.db.delete(logId);
        deleted.push(logId);
      } catch (error: any) {
        errors.push({ logId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      deleted: deleted.length,
      total: args.logIds.length,
      logIds: deleted,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
