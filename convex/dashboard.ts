import { query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

// Get dashboard statistics
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
    if (!user) {
      throw new Error("User not found");
    }

    // Get all members, shepherds, pastors based on role
    let members = await ctx.db.query("members").collect();
    let shepherds = await ctx.db.query("users").collect();
    let pastors = await ctx.db.query("users").collect();
    let attendance = await ctx.db.query("attendance").collect();
    let reports = await ctx.db.query("reports").collect();

    // Filter by role permissions
    if (user.role === "shepherd") {
      members = members.filter((m) => m.shepherdId === userId);
      attendance = attendance.filter((a) => a.submittedBy === userId);
      reports = reports.filter((r) => r.shepherdId === userId);
      shepherds = [];
      pastors = [];
    } else if (user.role === "pastor") {
      const pastorShepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = pastorShepherds.map((s) => s._id);
      members = members.filter((m) => shepherdIds.includes(m.shepherdId));
      attendance = attendance.filter((a) => shepherdIds.includes(a.submittedBy));
      reports = reports.filter((r) => shepherdIds.includes(r.shepherdId));
      shepherds = pastorShepherds;
      pastors = [];
    }

    // Filter active users
    shepherds = shepherds.filter((u) => u.role === "shepherd" && u.isActive);
    pastors = pastors.filter((u) => u.role === "pastor" && u.isActive);

    // Get unread notifications count
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();

    // Calculate attendance stats for last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentAttendance = attendance.filter((a) => a.date >= sevenDaysAgo);
    const approvedAttendance = recentAttendance.filter((a) => a.approvalStatus === "approved");

    // Calculate member status distribution
    const statusCounts = {
      newConvert: members.filter((m) => m.status === "new_convert").length,
      firstTimer: members.filter((m) => m.status === "first_timer").length,
      established: members.filter((m) => m.status === "established").length,
      other: members.filter((m) => !m.status || !["new_convert", "first_timer", "established"].includes(m.status)).length,
    };

    // Calculate attendance by day (last 7 days)
    const attendanceByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      attendanceByDay[dateKey] = 0;
    }

    approvedAttendance.forEach((a) => {
      const dateKey = new Date(a.date).toISOString().split("T")[0];
      if (attendanceByDay[dateKey] !== undefined) {
        attendanceByDay[dateKey]++;
      }
    });

    // Calculate reports by type
    const reportsByType = {
      visitation: reports.filter((r) => r.reportType === "visitation").length,
      prayer: reports.filter((r) => r.reportType === "prayer").length,
      follow_up: reports.filter((r) => r.reportType === "follow_up").length,
      other: reports.filter((r) => r.reportType === "other").length,
    };

    return {
      totalMembers: members.filter((m) => m.isActive).length,
      totalShepherds: shepherds.length,
      totalPastors: pastors.length,
      unreadNotifications: notifications.length,
      recentAttendance: approvedAttendance.length,
      statusCounts,
      attendanceByDay: Object.entries(attendanceByDay).map(([date, count]) => ({
        date,
        count,
      })),
      reportsByType,
    };
  },
});
