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

// Create event
export const create = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    eventType: v.union(
      v.literal("prayer_meeting"),
      v.literal("evangelism"),
      v.literal("bible_study"),
      v.literal("worship"),
      v.literal("conference"),
      v.literal("outreach"),
      v.literal("other")
    ),
    startDate: v.number(), // Unix timestamp
    endDate: v.optional(v.number()), // Unix timestamp
    location: v.optional(v.string()),
    groupId: v.optional(v.id("groups")),
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

    // Admin, pastor, or shepherd can create events
    if (user.role !== "admin" && user.role !== "pastor" && user.role !== "shepherd") {
      throw new Error("Unauthorized - only admins, pastors, and shepherds can create events");
    }

    // Verify group if provided
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        throw new Error("Group not found");
      }
    }

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      eventType: args.eventType,
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      organizerId: userId,
      groupId: args.groupId,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create reminder for event (1 day before)
    const reminderDate = args.startDate - 24 * 60 * 60 * 1000; // 1 day before
    await ctx.db.insert("reminders", {
      userId: userId,
      type: "event",
      title: `Upcoming Event: ${args.title}`,
      message: `${args.title} is happening tomorrow${args.location ? ` at ${args.location}` : ""}`,
      reminderDate: reminderDate,
      relatedId: eventId,
      relatedType: "event",
      isSent: false,
      createdAt: Date.now(),
    });

    return { eventId };
  },
});

// Get event by ID
export const getById = query({
  args: {
    token: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.get(args.eventId);
  },
});

// List events
export const list = query({
  args: {
    token: v.string(),
    eventType: v.optional(
      v.union(
        v.literal("prayer_meeting"),
        v.literal("evangelism"),
        v.literal("bible_study"),
        v.literal("worship"),
        v.literal("conference"),
        v.literal("outreach"),
        v.literal("other")
      )
    ),
    groupId: v.optional(v.id("groups")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let events = await ctx.db.query("events").collect();

    // Apply filters
    if (args.eventType) {
      events = events.filter((e) => e.eventType === args.eventType);
    }

    if (args.groupId) {
      events = events.filter((e) => e.groupId === args.groupId);
    }

    if (args.startDate) {
      events = events.filter((e) => e.startDate >= args.startDate!);
    }

    if (args.endDate) {
      events = events.filter((e) => e.endDate && e.endDate <= args.endDate!);
    }

    if (args.isActive !== undefined) {
      events = events.filter((e) => e.isActive === args.isActive);
    }

    return events.sort((a, b) => a.startDate - b.startDate);
  },
});

// Update event
export const update = mutation({
  args: {
    token: v.string(),
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    eventType: v.optional(
      v.union(
        v.literal("prayer_meeting"),
        v.literal("evangelism"),
        v.literal("bible_study"),
        v.literal("worship"),
        v.literal("conference"),
        v.literal("outreach"),
        v.literal("other")
      )
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    location: v.optional(v.string()),
    groupId: v.optional(v.id("groups")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions - organizer, admin, or pastor can update
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      event.organizerId !== userId
    ) {
      throw new Error("Unauthorized");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.eventType !== undefined) updates.eventType = args.eventType;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.location !== undefined) updates.location = args.location;
    if (args.groupId !== undefined) updates.groupId = args.groupId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.eventId, updates);

    return await ctx.db.get(args.eventId);
  },
});

// Delete event (soft delete)
export const remove = mutation({
  args: {
    token: v.string(),
    eventId: v.id("events"),
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

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Only admin or organizer can delete
    if (user.role !== "admin" && event.organizerId !== userId) {
      throw new Error("Unauthorized");
    }

    // Soft delete
    await ctx.db.patch(args.eventId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
