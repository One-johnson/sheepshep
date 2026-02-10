import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import { createNotification, notifyAdmins } from "./notificationHelpers";

// Create group - admin only. Requires meetingDay and leaderId (shepherd).
// When shepherd is assigned, their members are automatically added as group members.
export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    meetingDay: v.number(), // Required: 0=Sunday, 1=Monday, ... 6=Saturday
    leaderId: v.id("users"), // Required: shepherd to assign as group leader
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

    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can create groups");
    }

    const leader = await ctx.db.get(args.leaderId);
    if (!leader || leader.role !== "shepherd") {
      throw new Error("Invalid leader - must be a shepherd");
    }

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      meetingDay: args.meetingDay,
      createdBy: userId,
      leaderId: args.leaderId,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Auto-add all members belonging to the shepherd as group members
    const shepherdMembers = await ctx.db
      .query("members")
      .withIndex("by_shepherd", (q) => q.eq("shepherdId", args.leaderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const member of shepherdMembers) {
      const existing = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_member", (q) => q.eq("groupId", groupId).eq("memberId", member._id))
        .first();
      if (!existing) {
        await ctx.db.insert("groupMembers", {
          groupId,
          memberId: member._id,
          role: "member",
          joinedAt: Date.now(),
          addedBy: userId,
        });
      }
    }

    await createNotification(
      ctx,
      args.leaderId,
      "group_created",
      "New Group Assigned",
      `You have been assigned as leader of "${args.name}". Your ${shepherdMembers.length} members have been added.`,
      groupId,
      "group"
    );

    await notifyAdmins(
      ctx,
      "group_created",
      "New Group Created",
      `${user.name} created group "${args.name}" and assigned to ${leader.name}`,
      groupId,
      "group"
    );

    return { groupId };
  },
});

// Get group by ID - admin or group leader can access
export const getById = query({
  args: {
    token: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    if (user.role === "admin" || group.leaderId === userId) {
      return group;
    }
    // Pastors could see groups of shepherds they oversee
    if (user.role === "pastor" && group.leaderId) {
      const leader = await ctx.db.get(group.leaderId);
      if (leader?.overseerId === userId) return group;
    }
    return null;
  },
});

// List groups for shepherd (groups they lead) - for dashboard and my groups
export const listByLeader = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    let groups = await ctx.db.query("groups").collect();
    groups = groups.filter((g) => g.isActive && g.leaderId === userId);

    const withMemberCount = await Promise.all(
      groups.map(async (g) => {
        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", g._id))
          .collect();
        return { ...g, memberCount: members.length };
      })
    );

    return withMemberCount.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// List groups for attendance - only shepherds (their groups with meeting day and members)
export const listForAttendance = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.role !== "shepherd") {
      return []; // Only shepherds mark group attendance
    }

    let groups = await ctx.db.query("groups").collect();
    groups = groups.filter(
      (g) => g.isActive && g.leaderId === userId && g.meetingDay !== undefined && g.meetingDay !== null
    );

    const groupsWithMembers = [];
    for (const group of groups) {
      const members = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      if (members.length > 0) {
        groupsWithMembers.push({ ...group, memberCount: members.length });
      }
    }

    return groupsWithMembers.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// List groups - admin sees all; shepherd sees only groups they lead
export const list = query({
  args: {
    token: v.string(),
    leaderId: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let groups = await ctx.db.query("groups").collect();

    if (user.role === "shepherd") {
      groups = groups.filter((g) => g.leaderId === userId);
    }
    // Admin and pastor see all

    if (args.leaderId) groups = groups.filter((g) => g.leaderId === args.leaderId);
    if (args.isActive !== undefined) groups = groups.filter((g) => g.isActive === args.isActive);

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
    meetingDay: v.optional(v.number()),
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

    // Admin can update anything; shepherd (leader) can update name, description only
    const isAdmin = user.role === "admin";
    const isLeader = group.leaderId === userId;

    if (!isAdmin && !isLeader) {
      throw new Error("Unauthorized");
    }

    if (isLeader && !isAdmin) {
      // Shepherd can only update name and description
      if (args.meetingDay !== undefined || args.leaderId !== undefined || args.isActive !== undefined) {
        throw new Error("Only admins can change meeting day, type, leader, or status");
      }
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.meetingDay !== undefined) updates.meetingDay = args.meetingDay;
    if (args.leaderId !== undefined) updates.leaderId = args.leaderId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.groupId, updates);

    const updatedGroup = await ctx.db.get(args.groupId);

    // When leaderId changes: remove old members, add new leader's members
    if (args.leaderId !== undefined && args.leaderId !== group.leaderId) {
      const newLeader = await ctx.db.get(args.leaderId);
      if (newLeader && newLeader.role === "shepherd") {
        const existingGroupMembers = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
          .collect();
        for (const gm of existingGroupMembers) {
          await ctx.db.delete(gm._id);
        }
        const shepherdMembers = await ctx.db
          .query("members")
          .withIndex("by_shepherd", (q) => q.eq("shepherdId", args.leaderId!))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();
        for (const member of shepherdMembers) {
          await ctx.db.insert("groupMembers", {
            groupId: args.groupId,
            memberId: member._id,
            role: "member",
            joinedAt: Date.now(),
            addedBy: userId,
          });
        }
      }
    }

    // Notify the leader if changed
    if (args.leaderId !== undefined && args.leaderId !== group.leaderId) {
      // Notify old leader
      if (group.leaderId) {
        await createNotification(
          ctx,
          group.leaderId,
          "group_updated",
          "Group Leadership Changed",
          `You are no longer the leader of "${group.name}"`,
          args.groupId,
          "group"
        );
      }
      // Notify new leader
      await createNotification(
        ctx,
        args.leaderId,
        "group_updated",
        "Group Leadership Assigned",
        `You have been assigned as leader of "${group.name}"`,
        args.groupId,
        "group"
      );
    } else if (group.leaderId) {
      // Notify leader of update
      await createNotification(
        ctx,
        group.leaderId,
        "group_updated",
        "Group Updated",
        `Group "${group.name}" has been updated`,
        args.groupId,
        "group"
      );
    }

    return updatedGroup;
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

    // Notify the leader
    if (group.leaderId) {
      await createNotification(
        ctx,
        group.leaderId,
        "group_deleted",
        "Group Deleted",
        `Group "${group.name}" has been deleted`,
        args.groupId,
        "group"
      );
    }

    // Notify admins
    await notifyAdmins(
      ctx,
      "group_deleted",
      "Group Deleted",
      `${user.name} deleted group: ${group.name}`,
      args.groupId,
      "group"
    );

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

    const memberName = `${member.firstName} ${member.lastName}`;

    // Notify the group leader
    if (group.leaderId) {
      await createNotification(
        ctx,
        group.leaderId,
        "group_member_added",
        "Member Added to Group",
        `${memberName} has been added to "${group.name}"`,
        args.groupId,
        "group"
      );
    }

    // Notify member's shepherd if different from group leader
    if (member.shepherdId && member.shepherdId !== group.leaderId) {
      await createNotification(
        ctx,
        member.shepherdId,
        "group_member_added",
        "Member Added to Group",
        `${memberName} has been added to group "${group.name}"`,
        args.groupId,
        "group"
      );
    }

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

    const member = await ctx.db.get(args.memberId);
    const memberName = member ? `${member.firstName} ${member.lastName}` : "Member";

    // Notify the group leader
    if (group.leaderId) {
      await createNotification(
        ctx,
        group.leaderId,
        "group_member_removed",
        "Member Removed from Group",
        `${memberName} has been removed from "${group.name}"`,
        args.groupId,
        "group"
      );
    }

    // Notify member's shepherd if different from group leader
    if (member?.shepherdId && member.shepherdId !== group.leaderId) {
      await createNotification(
        ctx,
        member.shepherdId,
        "group_member_removed",
        "Member Removed from Group",
        `${memberName} has been removed from group "${group.name}"`,
        args.groupId,
        "group"
      );
    }

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
