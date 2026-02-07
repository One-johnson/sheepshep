import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

// Create group
export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    groupType: v.union(
      v.literal("bacenta"),
      v.literal("bible_study"),
      v.literal("prayer_group"),
      v.literal("youth_group"),
      v.literal("women_group"),
      v.literal("men_group"),
      v.literal("ushers"),
      v.literal("first_service_choir"),
      v.literal("second_service_choir"),
      v.literal("other")
    ),
    leaderId: v.optional(v.id("users")),
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

    // Admin, pastor, or shepherd can create groups
    if (user.role !== "admin" && user.role !== "pastor" && user.role !== "shepherd") {
      throw new Error("Unauthorized - only admins, pastors, and shepherds can create groups");
    }

    // Verify leader if provided
    if (args.leaderId) {
      const leader = await ctx.db.get(args.leaderId);
      if (!leader || (leader.role !== "shepherd" && leader.role !== "pastor")) {
        throw new Error("Invalid leader - must be a shepherd or pastor");
      }
    }

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      groupType: args.groupType,
      createdBy: userId,
      leaderId: args.leaderId || userId,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { groupId };
  },
});

// Get group by ID
export const getById = query({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.get(args.groupId);
  },
});

// List groups
export const list = query({
  args: {
    token: v.string(),
    groupType: v.optional(
      v.union(
        v.literal("bacenta"),
        v.literal("bible_study"),
        v.literal("prayer_group"),
        v.literal("youth_group"),
        v.literal("women_group"),
        v.literal("men_group"),
        v.literal("ushers"),
        v.literal("first_service_choir"),
        v.literal("second_service_choir"),
        v.literal("other")
      )
    ),
    leaderId: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let groups = await ctx.db.query("groups").collect();

    // Apply filters
    if (args.groupType) {
      groups = groups.filter((g) => g.groupType === args.groupType);
    }

    if (args.leaderId) {
      groups = groups.filter((g) => g.leaderId === args.leaderId);
    }

    if (args.isActive !== undefined) {
      groups = groups.filter((g) => g.isActive === args.isActive);
    }

    return groups.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Update group
export const update = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    groupType: v.optional(
      v.union(
        v.literal("bacenta"),
        v.literal("bible_study"),
        v.literal("prayer_group"),
        v.literal("youth_group"),
        v.literal("women_group"),
        v.literal("men_group"),
        v.literal("ushers"),
        v.literal("first_service_choir"),
        v.literal("second_service_choir"),
        v.literal("other")
      )
    ),
    leaderId: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions - creator, leader, admin, or pastor can update
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      group.createdBy !== userId &&
      group.leaderId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.groupType !== undefined) updates.groupType = args.groupType;
    if (args.leaderId !== undefined) updates.leaderId = args.leaderId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.groupId, updates);

    return await ctx.db.get(args.groupId);
  },
});

// Delete group (soft delete)
export const remove = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
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

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Only admin or creator can delete
    if (user.role !== "admin" && group.createdBy !== userId) {
      throw new Error("Unauthorized");
    }

    // Soft delete
    await ctx.db.patch(args.groupId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Add member to group
export const addMember = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    memberId: v.id("members"),
    role: v.optional(v.union(v.literal("member"), v.literal("leader"), v.literal("assistant"))),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      group.createdBy !== userId &&
      group.leaderId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    // Check if member is already in group
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_member", (q) =>
        q.eq("groupId", args.groupId).eq("memberId", args.memberId)
      )
      .first();

    if (existing) {
      throw new Error("Member is already in this group");
    }

    await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      memberId: args.memberId,
      role: args.role || "member",
      joinedAt: Date.now(),
      addedBy: userId,
    });

    return { success: true };
  },
});

// Remove member from group
export const removeMember = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      group.createdBy !== userId &&
      group.leaderId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const groupMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_member", (q) =>
        q.eq("groupId", args.groupId).eq("memberId", args.memberId)
      )
      .first();

    if (!groupMember) {
      throw new Error("Member is not in this group");
    }

    await ctx.db.delete(groupMember._id);

    return { success: true };
  },
});

// Get group members
export const getMembers = query({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const groupMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Fetch member details
    const members = await Promise.all(
      groupMembers.map(async (gm) => {
        const member = await ctx.db.get(gm.memberId);
        return {
          ...gm,
          member: member,
        };
      })
    );

    return members;
  },
});

// Get all group participants (both members and shepherds)
export const getParticipants = query({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get members
    const groupMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get shepherds
    const groupShepherds = await ctx.db
      .query("groupShepherds")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Fetch member details
    const members = await Promise.all(
      groupMembers.map(async (gm) => {
        const member = await ctx.db.get(gm.memberId);
        return {
          type: "member" as const,
          ...gm,
          participant: member,
        };
      })
    );

    // Fetch shepherd details
    const shepherds = await Promise.all(
      groupShepherds.map(async (gs) => {
        const shepherd = await ctx.db.get(gs.shepherdId);
        return {
          type: "shepherd" as const,
          ...gs,
          participant: shepherd,
        };
      })
    );

    return {
      members,
      shepherds,
      total: members.length + shepherds.length,
    };
  },
});

// Bulk add members to group
export const bulkAddMembers = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    memberIds: v.array(v.id("members")),
    role: v.optional(v.union(v.literal("member"), v.literal("leader"), v.literal("assistant"))),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      group.createdBy !== userId &&
      group.leaderId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const added: string[] = [];
    const errors: Array<{ memberId: string; error: string }> = [];

    for (const memberId of args.memberIds) {
      try {
        const member = await ctx.db.get(memberId);
        if (!member) {
          errors.push({ memberId, error: "Member not found" });
          continue;
        }

        // Check if member is already in group
        const existing = await ctx.db
          .query("groupMembers")
          .withIndex("by_group_member", (q) =>
            q.eq("groupId", args.groupId).eq("memberId", memberId)
          )
          .first();

        if (existing) {
          errors.push({ memberId, error: "Member already in group" });
          continue;
        }

        await ctx.db.insert("groupMembers", {
          groupId: args.groupId,
          memberId: memberId,
          role: args.role || "member",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        added.push(memberId);
      } catch (error: any) {
        errors.push({ memberId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      added: added.length,
      total: args.memberIds.length,
      memberIds: added,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Add shepherd to group
export const addShepherd = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    shepherdId: v.id("users"),
    role: v.optional(
      v.union(
        v.literal("member"),
        v.literal("leader"),
        v.literal("assistant"),
        v.literal("coordinator")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd) {
      throw new Error("Shepherd not found");
    }

    // Verify it's a shepherd or pastor
    if (shepherd.role !== "shepherd" && shepherd.role !== "pastor") {
      throw new Error("User must be a shepherd or pastor");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      group.createdBy !== userId &&
      group.leaderId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    // Check if shepherd is already in group
    const existing = await ctx.db
      .query("groupShepherds")
      .withIndex("by_group_shepherd", (q) =>
        q.eq("groupId", args.groupId).eq("shepherdId", args.shepherdId)
      )
      .first();

    if (existing) {
      throw new Error("Shepherd is already in this group");
    }

    await ctx.db.insert("groupShepherds", {
      groupId: args.groupId,
      shepherdId: args.shepherdId,
      role: args.role || "member",
      joinedAt: Date.now(),
      addedBy: userId,
    });

    return { success: true };
  },
});

// Remove shepherd from group
export const removeShepherd = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    shepherdId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      group.createdBy !== userId &&
      group.leaderId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const groupShepherd = await ctx.db
      .query("groupShepherds")
      .withIndex("by_group_shepherd", (q) =>
        q.eq("groupId", args.groupId).eq("shepherdId", args.shepherdId)
      )
      .first();

    if (!groupShepherd) {
      throw new Error("Shepherd is not in this group");
    }

    await ctx.db.delete(groupShepherd._id);

    return { success: true };
  },
});

// Get group shepherds
export const getShepherds = query({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const groupShepherds = await ctx.db
      .query("groupShepherds")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Fetch shepherd details
    const shepherds = await Promise.all(
      groupShepherds.map(async (gs) => {
        const shepherd = await ctx.db.get(gs.shepherdId);
        return {
          ...gs,
          shepherd: shepherd,
        };
      })
    );

    return shepherds;
  },
});

// Bulk add shepherds to group
export const bulkAddShepherds = mutation({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
    shepherdIds: v.array(v.id("users")),
    role: v.optional(
      v.union(
        v.literal("member"),
        v.literal("leader"),
        v.literal("assistant"),
        v.literal("coordinator")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      group.createdBy !== userId &&
      group.leaderId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const added: string[] = [];
    const errors: Array<{ shepherdId: string; error: string }> = [];

    for (const shepherdId of args.shepherdIds) {
      try {
        const shepherd = await ctx.db.get(shepherdId);
        if (!shepherd) {
          errors.push({ shepherdId, error: "Shepherd not found" });
          continue;
        }

        // Verify it's a shepherd or pastor
        if (shepherd.role !== "shepherd" && shepherd.role !== "pastor") {
          errors.push({ shepherdId, error: "User must be a shepherd or pastor" });
          continue;
        }

        // Check if shepherd is already in group
        const existing = await ctx.db
          .query("groupShepherds")
          .withIndex("by_group_shepherd", (q) =>
            q.eq("groupId", args.groupId).eq("shepherdId", shepherdId)
          )
          .first();

        if (existing) {
          errors.push({ shepherdId, error: "Shepherd already in group" });
          continue;
        }

        await ctx.db.insert("groupShepherds", {
          groupId: args.groupId,
          shepherdId: shepherdId,
          role: args.role || "member",
          joinedAt: Date.now(),
          addedBy: userId,
        });

        added.push(shepherdId);
      } catch (error: any) {
        errors.push({ shepherdId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      added: added.length,
      total: args.shepherdIds.length,
      shepherdIds: added,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
