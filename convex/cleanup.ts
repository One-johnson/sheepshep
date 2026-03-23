import { mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

type CleanupOptions = { deleteFirstAdmin?: boolean };

async function performDatabaseCleanup(ctx: MutationCtx, options: CleanupOptions = {}) {
  const deleteFirstAdmin = options.deleteFirstAdmin === true;
  const deletedCounts: Record<string, number> = {};

  const prayerRequests = await ctx.db.query("prayerRequests").collect();
  for (const pr of prayerRequests) await ctx.db.delete(pr._id);
  deletedCounts.prayerRequests = prayerRequests.length;

  const reminders = await ctx.db.query("reminders").collect();
  for (const r of reminders) await ctx.db.delete(r._id);
  deletedCounts.reminders = reminders.length;

  const events = await ctx.db.query("events").collect();
  for (const e of events) await ctx.db.delete(e._id);
  deletedCounts.events = events.length;

  const groupShepherds = await ctx.db.query("groupShepherds").collect();
  for (const gs of groupShepherds) await ctx.db.delete(gs._id);
  deletedCounts.groupShepherds = groupShepherds.length;

  const groupMembers = await ctx.db.query("groupMembers").collect();
  for (const gm of groupMembers) await ctx.db.delete(gm._id);
  deletedCounts.groupMembers = groupMembers.length;

  const groups = await ctx.db.query("groups").collect();
  for (const g of groups) await ctx.db.delete(g._id);
  deletedCounts.groups = groups.length;

  const notifications = await ctx.db.query("notifications").collect();
  for (const n of notifications) await ctx.db.delete(n._id);
  deletedCounts.notifications = notifications.length;

  const registrationRequests = await ctx.db.query("registrationRequests").collect();
  for (const rr of registrationRequests) await ctx.db.delete(rr._id);
  deletedCounts.registrationRequests = registrationRequests.length;

  const reports = await ctx.db.query("reports").collect();
  for (const r of reports) await ctx.db.delete(r._id);
  deletedCounts.reports = reports.length;

  const assignments = await ctx.db.query("assignments").collect();
  for (const a of assignments) await ctx.db.delete(a._id);
  deletedCounts.assignments = assignments.length;

  const attendance = await ctx.db.query("attendance").collect();
  for (const a of attendance) await ctx.db.delete(a._id);
  deletedCounts.attendance = attendance.length;

  const members = await ctx.db.query("members").collect();
  for (const m of members) await ctx.db.delete(m._id);
  deletedCounts.members = members.length;

  const shepherdBacentas = await ctx.db.query("shepherdBacentas").collect();
  for (const sb of shepherdBacentas) await ctx.db.delete(sb._id);
  deletedCounts.shepherdBacentas = shepherdBacentas.length;

  const bacentas = await ctx.db.query("bacentas").collect();
  for (const b of bacentas) await ctx.db.delete(b._id);
  deletedCounts.bacentas = bacentas.length;

  const regions = await ctx.db.query("regions").collect();
  for (const r of regions) await ctx.db.delete(r._id);
  deletedCounts.regions = regions.length;

  const sessions = await ctx.db.query("sessions").collect();
  for (const s of sessions) await ctx.db.delete(s._id);
  deletedCounts.sessions = sessions.length;

  const auditLogs = await ctx.db.query("auditLogs").collect();
  for (const al of auditLogs) await ctx.db.delete(al._id);
  deletedCounts.auditLogs = auditLogs.length;

  const settings = await ctx.db.query("settings").collect();
  for (const s of settings) await ctx.db.delete(s._id);
  deletedCounts.settings = settings.length;

  const allUsers = await ctx.db.query("users").collect();
  const firstAdminBefore = allUsers.find((u) => u.isFirstAdmin === true);
  let usersDeleted = 0;
  for (const u of allUsers) {
    if (deleteFirstAdmin || !u.isFirstAdmin) {
      await ctx.db.delete(u._id);
      usersDeleted++;
    }
  }
  deletedCounts.users = usersDeleted;

  const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

  return {
    success: true,
    message: `Database cleaned successfully. Deleted ${totalDeleted} records.`,
    deletedCounts,
    keptFirstAdmin: deleteFirstAdmin ? null : (firstAdminBefore ? firstAdminBefore.email : null),
  };
}

/**
 * Clean all data from the database (admin only)
 * WARNING: This will delete ALL data except the first admin user
 * Use only in development!
 */
export const cleanDatabase = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    return performDatabaseCleanup(ctx);
  },
});

/**
 * Same as cleanDatabase but callable only from the Convex CLI or dashboard (internal).
 *
 * - Default: keeps the first admin user (same as cleanDatabase).
 * - `{ "deleteFirstAdmin": true }`: removes all users so the next registration becomes the new first admin.
 *
 * Examples:
 *   npx convex run cleanup:cleanDatabaseDev "{}" --push
 *   npx convex run cleanup:cleanDatabaseDev '{"deleteFirstAdmin":true}' --push
 */
export const cleanDatabaseDev = internalMutation({
  args: {
    deleteFirstAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) =>
    performDatabaseCleanup(ctx, { deleteFirstAdmin: args.deleteFirstAdmin === true }),
});
