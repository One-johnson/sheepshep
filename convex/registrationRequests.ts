import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import * as bcrypt from "bcryptjs";

// List registration requests (admin or pastor)
export const list = query({
  args: {
    token: v.string(),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
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

    // Only admin or pastor can view registration requests
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized");
    }

    let requests = await ctx.db.query("registrationRequests").collect();

    // Filter by status if provided
    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Approve registration request (admin or pastor)
export const approve = mutation({
  args: {
    token: v.string(),
    requestId: v.id("registrationRequests"),
    overseerId: v.optional(v.id("users")), // Assign to a pastor if provided
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

    // Only admin or pastor can approve
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Registration request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // If pastor is approving, they can only assign to themselves
    if (user.role === "pastor") {
      if (args.overseerId && args.overseerId !== userId) {
        throw new Error("Unauthorized - pastors can only assign shepherds to themselves");
      }
      args.overseerId = userId;
    }

    // Create the user account
    // Ensure gender is valid (filter out "other" if present)
    const validGender: "male" | "female" | undefined = 
      request.gender === "male" || request.gender === "female" 
        ? request.gender 
        : undefined;

    const newUserId = await ctx.db.insert("users", {
      email: request.email,
      name: request.name,
      role: "shepherd",
      passwordHash: request.passwordHash,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phone: request.phone,
      whatsappNumber: request.whatsappNumber,
      preferredName: request.preferredName,
      gender: validGender,
      dateOfBirth: request.dateOfBirth,
      commissioningDate: request.commissioningDate,
      occupation: request.occupation,
      assignedZone: request.assignedZone,
      homeAddress: request.homeAddress,
      notes: request.notes,
      status: "active",
      overseerId: args.overseerId,
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedBy: userId,
      reviewedAt: Date.now(),
      userId: newUserId,
      updatedAt: Date.now(),
    });

    // Notify the requester (if they have an account)
    if (request.requestedBy) {
      await ctx.db.insert("notifications", {
        userId: request.requestedBy,
        type: "system",
        title: "Registration Approved",
        message: `Your shepherd registration for ${request.name} has been approved`,
        relatedId: args.requestId,
        relatedType: "member",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { userId: newUserId, success: true };
  },
});

// Reject registration request (admin or pastor)
export const reject = mutation({
  args: {
    token: v.string(),
    requestId: v.id("registrationRequests"),
    rejectionReason: v.string(),
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

    // Only admin or pastor can reject
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Registration request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      reviewedBy: userId,
      reviewedAt: Date.now(),
      rejectionReason: args.rejectionReason,
      updatedAt: Date.now(),
    });

    // Notify the requester
    if (request.requestedBy) {
      await ctx.db.insert("notifications", {
        userId: request.requestedBy,
        type: "system",
        title: "Registration Rejected",
        message: `Your shepherd registration has been rejected: ${args.rejectionReason}`,
        relatedId: args.requestId,
        relatedType: "member",
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
