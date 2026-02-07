import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

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

    return { success: true };
  },
});
