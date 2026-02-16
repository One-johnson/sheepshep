import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

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

    const deletedCounts: Record<string, number> = {};

    // Delete in order to respect foreign key constraints
    
    // 1. Delete prayer requests
    const prayerRequests = await ctx.db.query("prayerRequests").collect();
    for (const pr of prayerRequests) await ctx.db.delete(pr._id);
    deletedCounts.prayerRequests = prayerRequests.length;

    // 2. Delete reminders
    const reminders = await ctx.db.query("reminders").collect();
    for (const r of reminders) await ctx.db.delete(r._id);
    deletedCounts.reminders = reminders.length;

    // 3. Delete events
    const events = await ctx.db.query("events").collect();
    for (const e of events) await ctx.db.delete(e._id);
    deletedCounts.events = events.length;

    // 4. Delete group shepherds
    const groupShepherds = await ctx.db.query("groupShepherds").collect();
    for (const gs of groupShepherds) await ctx.db.delete(gs._id);
    deletedCounts.groupShepherds = groupShepherds.length;

    // 5. Delete group members
    const groupMembers = await ctx.db.query("groupMembers").collect();
    for (const gm of groupMembers) await ctx.db.delete(gm._id);
    deletedCounts.groupMembers = groupMembers.length;

    // 6. Delete groups
    const groups = await ctx.db.query("groups").collect();
    for (const g of groups) await ctx.db.delete(g._id);
    deletedCounts.groups = groups.length;

    // 7. Delete notifications
    const notifications = await ctx.db.query("notifications").collect();
    for (const n of notifications) await ctx.db.delete(n._id);
    deletedCounts.notifications = notifications.length;

    // 8. Delete registration requests
    const registrationRequests = await ctx.db.query("registrationRequests").collect();
    for (const rr of registrationRequests) await ctx.db.delete(rr._id);
    deletedCounts.registrationRequests = registrationRequests.length;

    // 9. Delete reports
    const reports = await ctx.db.query("reports").collect();
    for (const r of reports) await ctx.db.delete(r._id);
    deletedCounts.reports = reports.length;

    // 10. Delete assignments
    const assignments = await ctx.db.query("assignments").collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    deletedCounts.assignments = assignments.length;

    // 11. Delete attendance records
    const attendance = await ctx.db.query("attendance").collect();
    for (const a of attendance) await ctx.db.delete(a._id);
    deletedCounts.attendance = attendance.length;

    // 12. Delete members
    const members = await ctx.db.query("members").collect();
    for (const m of members) await ctx.db.delete(m._id);
    deletedCounts.members = members.length;

    // 13. Delete shepherd-bacenta links
    const shepherdBacentas = await ctx.db.query("shepherdBacentas").collect();
    for (const sb of shepherdBacentas) await ctx.db.delete(sb._id);
    deletedCounts.shepherdBacentas = shepherdBacentas.length;

    // 14. Delete bacentas
    const bacentas = await ctx.db.query("bacentas").collect();
    for (const b of bacentas) await ctx.db.delete(b._id);
    deletedCounts.bacentas = bacentas.length;

    // 15. Delete regions
    const regions = await ctx.db.query("regions").collect();
    for (const r of regions) await ctx.db.delete(r._id);
    deletedCounts.regions = regions.length;

    // 16. Delete sessions
    const sessions = await ctx.db.query("sessions").collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    deletedCounts.sessions = sessions.length;

    // 17. Delete audit logs
    const auditLogs = await ctx.db.query("auditLogs").collect();
    for (const al of auditLogs) await ctx.db.delete(al._id);
    deletedCounts.auditLogs = auditLogs.length;

    // 18. Delete settings (optional - comment out if you want to keep settings)
    const settings = await ctx.db.query("settings").collect();
    for (const s of settings) await ctx.db.delete(s._id);
    deletedCounts.settings = settings.length;

    // 19. Delete all users EXCEPT the first admin
    const allUsers = await ctx.db.query("users").collect();
    const firstAdmin = allUsers.find((u) => u.isFirstAdmin === true);
    let usersDeleted = 0;
    for (const u of allUsers) {
      if (!u.isFirstAdmin) {
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
      keptFirstAdmin: firstAdmin ? firstAdmin.email : null,
    };
  },
});
