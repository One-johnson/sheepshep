import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import { Id } from "./_generated/dataModel";
import { Doc } from "./_generated/dataModel";
import * as bcrypt from "bcryptjs";
import { notifyAdmins } from "./notificationHelpers";

// List all users (admin only)
export const list = query({
  args: {
    token: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("pastor"), v.literal("shepherd"))),
    isActive: v.optional(v.boolean()),
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

    // Only admin can list all users
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can list users");
    }

    let users = await ctx.db.query("users").collect();

    // Apply filters
    if (args.role) {
      users = users.filter((u) => u.role === args.role);
    }

    if (args.isActive !== undefined) {
      users = users.filter((u) => u.isActive === args.isActive);
    }

    // Remove password hashes from response
    return users.map((u) => {
      const { passwordHash: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  },
});

// List users for display (e.g. prayer request requesters/recipients). Role-based: admins see all; pastors see self, their shepherds, admins, pastors; shepherds see self, their pastor, admins.
export const listForDisplay = query({
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

    let users: Doc<"users">[];

    if (user.role === "admin") {
      users = await ctx.db.query("users").collect();
    } else if (user.role === "pastor") {
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();
      const pastors = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "pastor"))
        .collect();
      const self = await ctx.db.get(userId);
      const seen = new Set<Id<"users">>();
      users = [];
      for (const u of [self, ...shepherds, ...admins, ...pastors]) {
        if (u && !seen.has(u._id)) {
          seen.add(u._id);
          users.push(u as Doc<"users">);
        }
      }
    } else if (user.role === "shepherd") {
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();
      const pastors = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "pastor"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "shepherd"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      const self = await ctx.db.get(userId);
      const overseer = user.overseerId ? await ctx.db.get(user.overseerId) : null;
      const seen = new Set<Id<"users">>();
      users = [];
      for (const u of [self, overseer, ...admins, ...pastors, ...shepherds]) {
        if (u && !seen.has(u._id)) {
          seen.add(u._id);
          users.push(u as Doc<"users">);
        }
      }
    } else {
      users = [];
    }

    return users.map((u) => {
      const { passwordHash: _, ...rest } = u;
      return rest;
    });
  },
});

// Delete user (admin only, cannot delete first admin)
export const deleteUser = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
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

    // Only admin can delete users
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can delete users");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Prevent deleting the first admin
    if (targetUser.isFirstAdmin) {
      throw new Error("Cannot delete the first admin");
    }

    // Prevent deleting yourself
    if (args.userId === userId) {
      throw new Error("Cannot delete your own account");
    }

    // Soft delete by setting isActive to false
    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Notify admins about user deletion
    await notifyAdmins(
      ctx,
      "user_deleted",
      "User Deleted",
      `${user.name} deleted user: ${targetUser.name} (${targetUser.email})`,
      args.userId,
      "user"
    );

    return { success: true };
  },
});

// Get user statistics (admin only)
export const getStats = query({
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

    const allUsers = await ctx.db.query("users").collect();
    const members = await ctx.db.query("members").collect();

    return {
      totalUsers: allUsers.length,
      totalAdmins: allUsers.filter((u) => u.role === "admin" && u.isActive).length,
      totalPastors: allUsers.filter((u) => u.role === "pastor" && u.isActive).length,
      totalShepherds: allUsers.filter((u) => u.role === "shepherd" && u.isActive).length,
      totalMembers: members.filter((m) => m.isActive).length,
      activeUsers: allUsers.filter((u) => u.isActive).length,
      inactiveUsers: allUsers.filter((u) => !u.isActive).length,
    };
  },
});

// Bulk delete users (admin only)
export const bulkDelete = mutation({
  args: {
    token: v.string(),
    userIds: v.array(v.id("users")),
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
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userId of args.userIds) {
      try {
        const targetUser = await ctx.db.get(userId);
        if (!targetUser) {
          errors.push({ userId, error: "User not found" });
          continue;
        }

        // Prevent deleting the first admin
        if (targetUser.isFirstAdmin) {
          errors.push({ userId, error: "Cannot delete the first admin" });
          continue;
        }

        // Prevent deleting yourself
        if (userId === currentUserId) {
          errors.push({ userId, error: "Cannot delete your own account" });
          continue;
        }

        // Soft delete
        await ctx.db.patch(userId, {
          isActive: false,
          updatedAt: Date.now(),
        });

        // Notify admins about user deletion
        await notifyAdmins(
          ctx,
          "user_deleted",
          "User Deleted",
          `${user.name} deleted user: ${targetUser.name} (${targetUser.email})`,
          userId,
          "user"
        );

        deleted.push(userId);
      } catch (error: any) {
        errors.push({ userId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      deleted: deleted.length,
      total: args.userIds.length,
      userIds: deleted,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Bulk add users (admin only)
export const bulkAdd = mutation({
  args: {
    token: v.string(),
    users: v.array(
      v.object({
        email: v.string(),
        password: v.string(),
        name: v.string(),
        role: v.union(v.literal("admin"), v.literal("pastor"), v.literal("shepherd")),
        phone: v.optional(v.string()),
        whatsappNumber: v.optional(v.string()),
        preferredName: v.optional(v.string()),
        gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
        dateOfBirth: v.optional(v.number()),
        ordinationDate: v.optional(v.number()),
        homeAddress: v.optional(v.string()),
        qualification: v.optional(v.string()),
        yearsInMinistry: v.optional(v.number()),
        ministryFocus: v.optional(v.array(v.string())),
        supervisedZones: v.optional(v.array(v.string())),
        notes: v.optional(v.string()),
        commissioningDate: v.optional(v.number()),
        occupation: v.optional(v.string()),
        assignedZone: v.optional(v.string()),
        educationalBackground: v.optional(v.string()),
        status: v.optional(
          v.union(v.literal("active"), v.literal("on_leave"), v.literal("inactive"))
        ),
        overseerId: v.optional(v.id("users")),
        profilePhotoId: v.optional(v.id("_storage")),
        // Marital information
        maritalStatus: v.optional(
          v.union(
            v.literal("single"),
            v.literal("married"),
            v.literal("divorced"),
            v.literal("widowed")
          )
        ),
        weddingAnniversaryDate: v.optional(v.number()),
        spouseName: v.optional(v.string()),
        spouseOccupation: v.optional(v.string()),
        childrenCount: v.optional(v.number()),
      })
    ),
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

    const created: string[] = [];
    const errors: Array<{ email: string; error: string }> = [];

    for (const userData of args.users) {
      try {
        // Check if user already exists
        const existingUser = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", userData.email))
          .first();

        if (existingUser) {
          errors.push({ email: userData.email, error: "User already exists" });
          continue;
        }

        // Hash password
        const passwordHash = bcrypt.hashSync(userData.password, 10);

        // Create user
        const userId = await ctx.db.insert("users", {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          passwordHash,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          phone: userData.phone,
          whatsappNumber: userData.whatsappNumber,
          preferredName: userData.preferredName,
          gender: userData.gender,
          dateOfBirth: userData.dateOfBirth,
          ordinationDate: userData.ordinationDate,
          homeAddress: userData.homeAddress,
          qualification: userData.qualification,
          yearsInMinistry: userData.yearsInMinistry,
          ministryFocus: userData.ministryFocus,
          supervisedZones: userData.supervisedZones,
          notes: userData.notes,
          commissioningDate: userData.commissioningDate,
          occupation: userData.occupation,
          assignedZone: userData.assignedZone,
          educationalBackground: userData.educationalBackground,
          status: userData.status,
          overseerId: userData.overseerId,
          profilePhotoId: userData.profilePhotoId,
          maritalStatus: userData.maritalStatus,
          weddingAnniversaryDate: userData.weddingAnniversaryDate,
          spouseName: userData.spouseName,
          spouseOccupation: userData.spouseOccupation,
          childrenCount: userData.childrenCount,
        });

        created.push(userId);
      } catch (error: any) {
        errors.push({ email: userData.email, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      created: created.length,
      total: args.users.length,
      userIds: created,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
