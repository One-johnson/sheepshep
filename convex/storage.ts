import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

// Generate upload URL for profile photos or attachments
export const generateUploadUrl = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Generate upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

// Get download URL for a stored file
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get download URL
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete a file from storage
export const deleteFile = mutation({
  args: {
    storageId: v.id("_storage"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Delete file
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

// Upload profile photo helper
export const uploadProfilePhoto = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    userId: v.optional(v.id("users")), // Optional - if not provided, updates current user
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    const targetUserId = args.userId || currentUserId;

    // Check permissions - users can update their own profile, admins can update anyone
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser) {
      throw new Error("User not found");
    }

    if (targetUserId !== currentUserId && currentUser.role !== "admin") {
      throw new Error("Unauthorized - only admins can update other users' profiles");
    }

    // Get existing profile photo to delete it
    const targetUser = await ctx.db.get(targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }

    if (targetUser.profilePhotoId) {
      try {
        await ctx.storage.delete(targetUser.profilePhotoId);
      } catch (error) {
        // File might not exist, continue anyway
        console.error("Error deleting old profile photo:", error);
      }
    }

    // Update user with new profile photo
    await ctx.db.patch(targetUserId, {
      profilePhotoId: args.storageId,
      updatedAt: Date.now(),
    });

    return { success: true, storageId: args.storageId };
  },
});

// Upload member profile photo
export const uploadMemberProfilePhoto = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    memberId: v.id("members"),
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

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check permissions - shepherds can update their members, admins can update anyone
    if (
      user.role !== "admin" &&
      (user.role !== "shepherd" || member.shepherdId !== userId)
    ) {
      throw new Error("Unauthorized");
    }

    // Delete old profile photo if exists
    if (member.profilePhotoId) {
      try {
        await ctx.storage.delete(member.profilePhotoId);
      } catch (error) {
        console.error("Error deleting old profile photo:", error);
      }
    }

    // Update member with new profile photo
    await ctx.db.patch(args.memberId, {
      profilePhotoId: args.storageId,
      updatedAt: Date.now(),
    });

    return { success: true, storageId: args.storageId };
  },
});
