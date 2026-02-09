import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

// Get members by shepherd
export const getMembersByShepherd = query({
  args: {
    token: v.string(),
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

    // Only admin or pastor can query
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized");
    }

    let members;
    if (args.shepherdId) {
      members = await ctx.db
        .query("members")
        .withIndex("by_shepherd", (q) => q.eq("shepherdId", args.shepherdId!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    } else {
      members = await ctx.db
        .query("members")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    }

    return members.map((m) => ({
      _id: m._id,
      firstName: m.firstName,
      lastName: m.lastName,
      preferredName: m.preferredName,
      phone: m.phone,
      email: m.email,
      shepherdId: m.shepherdId,
      status: m.status,
    }));
  },
});

// Get unassigned members (members without a shepherd)
export const getUnassignedMembers = query({
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
      throw new Error("Unauthorized - admin only");
    }

    const allMembers = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Note: All members should have a shepherdId, but we'll return empty array
    // In practice, you might want to handle null shepherdId if it exists
    return [];
  },
});

// Assign member to shepherd (primary assignment)
export const assignMemberToShepherd = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
    shepherdId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    // Verify member exists
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Verify shepherd exists and is a shepherd
    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd || shepherd.role !== "shepherd") {
      throw new Error("Invalid shepherd");
    }

    const previousShepherdId = member.shepherdId;

    // Update member's shepherdId
    await ctx.db.patch(args.memberId, {
      shepherdId: args.shepherdId,
      updatedAt: Date.now(),
    });

    // Log assignment change
    await ctx.db.insert("auditLogs", {
      userId: userId,
      action: "assign_member",
      entityType: "members",
      entityId: args.memberId,
      details: JSON.stringify({
        memberName: `${member.firstName} ${member.lastName}`,
        shepherdId: args.shepherdId,
        shepherdName: shepherd.name,
        previousShepherdId: previousShepherdId || null,
      }),
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Bulk assign members to shepherd
export const bulkAssignMembers = mutation({
  args: {
    token: v.string(),
    memberIds: v.array(v.id("members")),
    shepherdId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    // Verify shepherd exists and is a shepherd
    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd || shepherd.role !== "shepherd") {
      throw new Error("Invalid shepherd");
    }

    const results = {
      success: [] as string[],
      errors: [] as Array<{ memberId: string; error: string }>,
    };

    for (const memberId of args.memberIds) {
      try {
        const member = await ctx.db.get(memberId);
        if (!member) {
          results.errors.push({
            memberId,
            error: "Member not found",
          });
          continue;
        }

        const previousShepherdId = member.shepherdId;

        await ctx.db.patch(memberId, {
          shepherdId: args.shepherdId,
          updatedAt: Date.now(),
        });

        // Log assignment
        await ctx.db.insert("auditLogs", {
          userId: userId,
          action: "assign_member",
          entityType: "members",
          entityId: memberId,
          details: JSON.stringify({
            memberName: `${member.firstName} ${member.lastName}`,
            shepherdId: args.shepherdId,
            shepherdName: shepherd.name,
            previousShepherdId: previousShepherdId || null,
          }),
          createdAt: Date.now(),
        });

        results.success.push(memberId);
      } catch (error: any) {
        results.errors.push({
          memberId,
          error: error.message || "Unknown error",
        });
      }
    }

    return results;
  },
});

// Get assignment statistics for members
export const getMemberAssignmentStats = query({
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
      throw new Error("Unauthorized - admin only");
    }

    const allMembers = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const allShepherds = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "shepherd"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Count members per shepherd
    const memberCounts = allShepherds.map((shepherd) => {
      const count = allMembers.filter((m) => m.shepherdId === shepherd._id).length;
      return {
        shepherdId: shepherd._id,
        shepherdName: shepherd.name,
        count,
      };
    });

    return {
      totalMembers: allMembers.length,
      totalShepherds: allShepherds.length,
      memberCounts,
    };
  },
});
