import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import { createNotification, notifyAdmins } from "./notificationHelpers";

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
    status: v.optional(
      v.union(
        v.literal("upcoming"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("postponed")
      )
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

    // Only admin can create events
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can create events");
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
      status: args.status ?? "upcoming",
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

    // Notify admins about event creation
    await notifyAdmins(
      ctx,
      "event_created",
      "New Event Created",
      `${user.name} created a new event: ${args.title}`,
      eventId,
      "event"
    );

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

// Get event stats (for dashboard stats cards)
export const getStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthTs = startOfMonth.getTime();
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    const endOfMonthTs = endOfMonth.getTime() - 1;

    const thisMonth = events.filter(
      (e) => e.startDate >= startOfMonthTs && e.startDate <= endOfMonthTs
    );
    const upcomingCount = events.filter(
      (e) => (e.status === "upcoming" || e.status === undefined) && e.startDate >= now
    ).length;

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const e of events) {
      byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
      const s = e.status ?? "upcoming";
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    return {
      total: events.length,
      thisMonth: thisMonth.length,
      upcoming: upcomingCount,
      byType,
      byStatus,
    };
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
    status: v.optional(
      v.union(
        v.literal("upcoming"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("postponed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let events = await ctx.db.query("events").collect();

    // Apply filters
    if (args.status) {
      events = events.filter((e) => (e.status ?? "upcoming") === args.status);
    }
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
    status: v.optional(
      v.union(
        v.literal("upcoming"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("postponed")
      )
    ),
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

    // Only admin can update events
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can update events");
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
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.eventId, updates);

    const updatedEvent = await ctx.db.get(args.eventId);

    // Notify organizer about event update
    if (event.organizerId) {
      await createNotification(
        ctx,
        event.organizerId,
        "event_updated",
        "Event Updated",
        `Event "${event.title}" has been updated`,
        args.eventId,
        "event"
      );
    }

    return updatedEvent;
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

    // Only admin can delete events
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can delete events");
    }

    // Soft delete
    await ctx.db.patch(args.eventId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Notify organizer about event deletion
    if (event.organizerId) {
      await createNotification(
        ctx,
        event.organizerId,
        "event_deleted",
        "Event Deleted",
        `Event "${event.title}" has been deleted`,
        args.eventId,
        "event"
      );
    }

    // Notify admins
    await notifyAdmins(
      ctx,
      "event_deleted",
      "Event Deleted",
      `${user.name} deleted event: ${event.title}`,
      args.eventId,
      "event"
    );

    return { success: true };
  },
});
