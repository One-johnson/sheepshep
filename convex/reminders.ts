import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

// Helper function to create notification from reminder
async function sendReminderNotification(ctx: any, reminder: any) {
  await ctx.db.insert("notifications", {
    userId: reminder.userId,
    type: "reminder",
    title: reminder.title,
    message: reminder.message,
    relatedId: reminder.relatedId,
    relatedType: reminder.relatedType,
    isRead: false,
    createdAt: Date.now(),
  });

  // Mark reminder as sent
  await ctx.db.patch(reminder._id, {
    isSent: true,
    sentAt: Date.now(),
  });
}

// Create reminder
export const create = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    type: v.union(
      v.literal("attendance_deadline"),
      v.literal("birthday"),
      v.literal("anniversary"),
      v.literal("event"),
      v.literal("assignment_due")
    ),
    title: v.string(),
    message: v.string(),
    reminderDate: v.number(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(
      v.union(
        v.literal("member"),
        v.literal("event"),
        v.literal("assignment"),
        v.literal("attendance")
      )
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

    // Only admin can create reminders manually
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can create reminders");
    }

    const reminderId = await ctx.db.insert("reminders", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      reminderDate: args.reminderDate,
      relatedId: args.relatedId,
      relatedType: args.relatedType,
      isSent: false,
      createdAt: Date.now(),
    });

    return { reminderId };
  },
});

// List reminders
export const list = query({
  args: {
    token: v.string(),
    userId: v.optional(v.id("users")),
    type: v.optional(
      v.union(
        v.literal("attendance_deadline"),
        v.literal("birthday"),
        v.literal("anniversary"),
        v.literal("event"),
        v.literal("assignment_due")
      )
    ),
    isSent: v.optional(v.boolean()),
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

    let reminders = await ctx.db.query("reminders").collect();

    // Filter by user if provided, or show only user's reminders if not admin
    if (args.userId) {
      reminders = reminders.filter((r) => r.userId === args.userId);
    } else if (user.role !== "admin") {
      reminders = reminders.filter((r) => r.userId === userId);
    }

    // Apply filters
    if (args.type) {
      reminders = reminders.filter((r) => r.type === args.type);
    }

    if (args.isSent !== undefined) {
      reminders = reminders.filter((r) => r.isSent === args.isSent);
    }

    return reminders.sort((a, b) => a.reminderDate - b.reminderDate);
  },
});

// Delete reminder
export const remove = mutation({
  args: {
    token: v.string(),
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) {
      throw new Error("Reminder not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Users can delete their own reminders, admins can delete any
    if (user.role !== "admin" && reminder.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.reminderId);

    return { success: true };
  },
});

// Process reminders that are due (called by cron job)
export const processDueReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all unsent reminders that are due
    const dueReminders = await ctx.db
      .query("reminders")
      .withIndex("by_reminder_date", (q) => q.lte("reminderDate", now))
      .filter((q) => q.eq(q.field("isSent"), false))
      .collect();

    let sent = 0;
    for (const reminder of dueReminders) {
      try {
        await sendReminderNotification(ctx, reminder);
        sent++;
      } catch (error) {
        console.error(`Error sending reminder ${reminder._id}:`, error);
      }
    }

    return { processed: sent, total: dueReminders.length };
  },
});

// Create attendance deadline reminders for shepherds (called by cron job)
export const createAttendanceReminders = internalMutation({
  handler: async (ctx) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Set reminder time to 3pm today
    const reminderTime = new Date(today);
    reminderTime.setHours(15, 0, 0, 0); // 3pm
    
    // Only create reminders if it's before 3pm
    if (now.getTime() >= reminderTime.getTime()) {
      return { created: 0, message: "It's already past 3pm" };
    }

    // Get all active shepherds
    const shepherds = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "shepherd"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let created = 0;
    for (const shepherd of shepherds) {
      // Check if reminder already exists for today
      const existingReminder = await ctx.db
        .query("reminders")
        .withIndex("by_user", (q) => q.eq("userId", shepherd._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "attendance_deadline"),
            q.eq(q.field("reminderDate"), reminderTime.getTime()),
            q.eq(q.field("isSent"), false)
          )
        )
        .first();

      if (!existingReminder) {
        await ctx.db.insert("reminders", {
          userId: shepherd._id,
          type: "attendance_deadline",
          title: "Attendance Deadline Reminder",
          message: "Please submit attendance for your members by 3pm today",
          reminderDate: reminderTime.getTime(),
          relatedType: "attendance",
          isSent: false,
          createdAt: Date.now(),
        });
        created++;
      }
    }

    return { created, total: shepherds.length };
  },
});

// Create birthday reminders (called by cron job)
export const createBirthdayReminders = internalMutation({
  handler: async (ctx) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowMonth = tomorrow.getMonth();
    const tomorrowDay = tomorrow.getDate();
    
    // Get all members with birthdays tomorrow
    const allMembers = await ctx.db.query("members").collect();
    const membersWithBirthday = allMembers.filter((member) => {
      if (!member.dateOfBirth) return false;
      const birthDate = new Date(member.dateOfBirth);
      return (
        birthDate.getMonth() === tomorrowMonth &&
        birthDate.getDate() === tomorrowDay
      );
    });

    let created = 0;
    for (const member of membersWithBirthday) {
      // Create reminder for the member's shepherd
      const shepherd = await ctx.db.get(member.shepherdId);
      if (shepherd && shepherd.isActive) {
        const reminderTime = new Date(tomorrow);
        reminderTime.setHours(9, 0, 0, 0); // 9am tomorrow

        // Check if reminder already exists
        const existingReminder = await ctx.db
          .query("reminders")
          .withIndex("by_user", (q) => q.eq("userId", shepherd._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("type"), "birthday"),
              q.eq(q.field("relatedId"), member._id),
              q.eq(q.field("reminderDate"), reminderTime.getTime())
            )
          )
          .first();

        if (!existingReminder) {
          await ctx.db.insert("reminders", {
            userId: shepherd._id,
            type: "birthday",
            title: "Birthday Reminder",
            message: `${member.firstName} ${member.lastName}'s birthday is tomorrow`,
            reminderDate: reminderTime.getTime(),
            relatedId: member._id,
            relatedType: "member",
            isSent: false,
            createdAt: Date.now(),
          });
          created++;
        }
      }
    }

    // Also create reminders for shepherd birthdays
    const allShepherds = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "shepherd"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const shepherd of allShepherds) {
      if (!shepherd.dateOfBirth) continue;
      
      const birthDate = new Date(shepherd.dateOfBirth);
      if (
        birthDate.getMonth() === tomorrowMonth &&
        birthDate.getDate() === tomorrowDay
      ) {
        // Notify pastor if shepherd has one, otherwise notify admins
        const reminderTime = new Date(tomorrow);
        reminderTime.setHours(9, 0, 0, 0);

        const overseerId = shepherd.overseerId;
        if (overseerId) {
          const existingReminder = await ctx.db
            .query("reminders")
            .withIndex("by_user", (q) => q.eq("userId", overseerId!))
            .filter((q) =>
              q.and(
                q.eq(q.field("type"), "birthday"),
                q.eq(q.field("relatedId"), shepherd._id),
                q.eq(q.field("reminderDate"), reminderTime.getTime())
              )
            )
            .first();

          if (!existingReminder) {
            await ctx.db.insert("reminders", {
              userId: overseerId,
              type: "birthday",
              title: "Shepherd Birthday Reminder",
              message: `${shepherd.name}'s birthday is tomorrow`,
              reminderDate: reminderTime.getTime(),
              relatedId: shepherd._id,
              relatedType: "member",
              isSent: false,
              createdAt: Date.now(),
            });
            created++;
          }
        } else {
          // Notify all admins
          const admins = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "admin"))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

          for (const admin of admins) {
            const existingReminder = await ctx.db
              .query("reminders")
              .withIndex("by_user", (q) => q.eq("userId", admin._id))
              .filter((q) =>
                q.and(
                  q.eq(q.field("type"), "birthday"),
                  q.eq(q.field("relatedId"), shepherd._id),
                  q.eq(q.field("reminderDate"), reminderTime.getTime())
                )
              )
              .first();

            if (!existingReminder) {
              await ctx.db.insert("reminders", {
                userId: admin._id,
                type: "birthday",
                title: "Shepherd Birthday Reminder",
                message: `${shepherd.name}'s birthday is tomorrow`,
                reminderDate: reminderTime.getTime(),
                relatedId: shepherd._id,
                relatedType: "member",
                isSent: false,
                createdAt: Date.now(),
              });
              created++;
            }
          }
        }
      }
    }

    // Also create anniversary reminders for married members
    const marriedMembers = allMembers.filter(
      (m) => m.maritalStatus === "married" && m.weddingAnniversaryDate
    );

    for (const member of marriedMembers) {
      if (!member.weddingAnniversaryDate) continue;

      const anniversaryDate = new Date(member.weddingAnniversaryDate);
      if (
        anniversaryDate.getMonth() === tomorrowMonth &&
        anniversaryDate.getDate() === tomorrowDay
      ) {
        const shepherd = await ctx.db.get(member.shepherdId);
        if (shepherd && shepherd.isActive) {
          const reminderTime = new Date(tomorrow);
          reminderTime.setHours(9, 0, 0, 0);

          const existingReminder = await ctx.db
            .query("reminders")
            .withIndex("by_user", (q) => q.eq("userId", shepherd._id))
            .filter((q) =>
              q.and(
                q.eq(q.field("type"), "anniversary"),
                q.eq(q.field("relatedId"), member._id),
                q.eq(q.field("reminderDate"), reminderTime.getTime())
              )
            )
            .first();

          if (!existingReminder) {
            await ctx.db.insert("reminders", {
              userId: shepherd._id,
              type: "anniversary",
              title: "Wedding Anniversary Reminder",
              message: `${member.firstName} ${member.lastName}${
                member.spouseName ? ` and ${member.spouseName}` : ""
              }'s wedding anniversary is tomorrow`,
              reminderDate: reminderTime.getTime(),
              relatedId: member._id,
              relatedType: "member",
              isSent: false,
              createdAt: Date.now(),
            });
            created++;
          }
        }
      }
    }

    return { created, members: membersWithBirthday.length };
  },
});
