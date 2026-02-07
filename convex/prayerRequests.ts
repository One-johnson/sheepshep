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

// Create prayer request (shepherd only)
export const create = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
    title: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    recipientIds: v.array(v.id("users")), // Array of user IDs to send prayer request to
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

    // Only shepherds can create prayer requests
    if (user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds can create prayer requests");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Check if shepherd owns this member
    if (member.shepherdId !== userId) {
      throw new Error("Unauthorized - member not assigned to you");
    }

    // Verify all recipients are valid (shepherds, pastors, or admins)
    const recipients = [];
    for (const recipientId of args.recipientIds) {
      const recipient = await ctx.db.get(recipientId);
      if (!recipient || !recipient.isActive) {
        throw new Error(`Invalid recipient: ${recipientId}`);
      }
      if (
        recipient.role !== "shepherd" &&
        recipient.role !== "pastor" &&
        recipient.role !== "admin"
      ) {
        throw new Error(`Recipient must be a shepherd, pastor, or admin: ${recipientId}`);
      }
      recipients.push(recipientId);
    }

    // Create prayer request
    const prayerRequestId = await ctx.db.insert("prayerRequests", {
      memberId: args.memberId,
      requestedBy: userId,
      title: args.title,
      description: args.description,
      priority: args.priority,
      status: "open",
      recipients: recipients,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Notify all recipients
    for (const recipientId of recipients) {
      await createNotification(
        ctx,
        recipientId,
        "prayer_request",
        "New Prayer Request",
        `${user.name} has requested prayer for ${member.firstName} ${member.lastName}: ${args.title}`,
        prayerRequestId,
        "prayer_request"
      );
    }

    return { prayerRequestId };
  },
});

// Get prayer request by ID
export const getById = query({
  args: {
    token: v.string(),
    prayerRequestId: v.id("prayerRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const prayerRequest = await ctx.db.get(args.prayerRequestId);
    if (!prayerRequest) {
      return null;
    }

    // Check if user is a recipient or the requester
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (
      prayerRequest.requestedBy !== userId &&
      !prayerRequest.recipients.includes(userId) &&
      user.role !== "admin"
    ) {
      throw new Error("Unauthorized - you are not a recipient of this prayer request");
    }

    return prayerRequest;
  },
});

// List prayer requests
export const list = query({
  args: {
    token: v.string(),
    memberId: v.optional(v.id("members")),
    status: v.optional(v.union(v.literal("open"), v.literal("answered"), v.literal("closed"))),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"))
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

    let prayerRequests = await ctx.db.query("prayerRequests").collect();

    // Filter by permissions
    if (user.role === "shepherd") {
      // Shepherds can see requests they created or were sent to them
      prayerRequests = prayerRequests.filter(
        (pr) => pr.requestedBy === userId || pr.recipients.includes(userId)
      );
    } else if (user.role === "pastor") {
      // Pastors can see requests sent to them or from their shepherds
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      prayerRequests = prayerRequests.filter(
        (pr) =>
          pr.recipients.includes(userId) ||
          (shepherdIds.includes(pr.requestedBy) && pr.recipients.includes(userId))
      );
    }
    // Admins can see all

    // Apply filters
    if (args.memberId) {
      prayerRequests = prayerRequests.filter((pr) => pr.memberId === args.memberId);
    }

    if (args.status) {
      prayerRequests = prayerRequests.filter((pr) => pr.status === args.status);
    }

    if (args.priority) {
      prayerRequests = prayerRequests.filter((pr) => pr.priority === args.priority);
    }

    return prayerRequests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Add prayer response (recipients can respond)
export const addResponse = mutation({
  args: {
    token: v.string(),
    prayerRequestId: v.id("prayerRequests"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const prayerRequest = await ctx.db.get(args.prayerRequestId);
    if (!prayerRequest) {
      throw new Error("Prayer request not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is a recipient or admin
    if (
      !prayerRequest.recipients.includes(userId) &&
      user.role !== "admin" &&
      prayerRequest.requestedBy !== userId
    ) {
      throw new Error("Unauthorized - you are not a recipient of this prayer request");
    }

    // Add response
    const responses = prayerRequest.responses || [];
    responses.push({
      userId: userId,
      message: args.message,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.prayerRequestId, {
      responses: responses,
      updatedAt: Date.now(),
    });

    // Notify the requester
    if (prayerRequest.requestedBy !== userId) {
      await createNotification(
        ctx,
        prayerRequest.requestedBy,
        "prayer_response",
        "Prayer Response",
        `${user.name} has responded to your prayer request: ${prayerRequest.title}`,
        args.prayerRequestId,
        "prayer_request"
      );
    }

    return { success: true };
  },
});

// Update prayer request status (requester or admin)
export const updateStatus = mutation({
  args: {
    token: v.string(),
    prayerRequestId: v.id("prayerRequests"),
    status: v.union(v.literal("open"), v.literal("answered"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const prayerRequest = await ctx.db.get(args.prayerRequestId);
    if (!prayerRequest) {
      throw new Error("Prayer request not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Only requester or admin can update status
    if (prayerRequest.requestedBy !== userId && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "answered") {
      updates.answeredAt = Date.now();
    }

    await ctx.db.patch(args.prayerRequestId, updates);

    return await ctx.db.get(args.prayerRequestId);
  },
});

// Delete prayer request (requester or admin)
export const remove = mutation({
  args: {
    token: v.string(),
    prayerRequestId: v.id("prayerRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const prayerRequest = await ctx.db.get(args.prayerRequestId);
    if (!prayerRequest) {
      throw new Error("Prayer request not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Only requester or admin can delete
    if (prayerRequest.requestedBy !== userId && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.prayerRequestId);

    return { success: true };
  },
});
