import { Id } from "./_generated/dataModel";

// Helper function to create notification
export async function createNotification(
  ctx: any,
  userId: Id<"users">,
  type:
    | "attendance_pending"
    | "attendance_approved"
    | "attendance_rejected"
    | "assignment_assigned"
    | "assignment_completed"
    | "assignment_deleted"
    | "report_submitted"
    | "member_assigned"
    | "member_created"
    | "member_updated"
    | "member_deleted"
    | "user_created"
    | "user_updated"
    | "user_deleted"
    | "profile_updated"
    | "settings_updated"
    | "group_created"
    | "group_updated"
    | "group_deleted"
    | "group_member_added"
    | "group_member_removed"
    | "event_created"
    | "event_updated"
    | "event_deleted"
    | "prayer_request"
    | "prayer_response"
    | "system"
    | "reminder",
  title: string,
  message: string,
  relatedId?: string | Id<any>,
  relatedType?:
    | "attendance"
    | "assignment"
    | "report"
    | "member"
    | "user"
    | "group"
    | "event"
    | "reminder"
    | "prayer_request"
    | "settings"
) {
  await ctx.db.insert("notifications", {
    userId: userId as any,
    type: type as any,
    title,
    message,
    relatedId: relatedId ? String(relatedId) : undefined,
    relatedType: relatedType as any,
    isRead: false,
    createdAt: Date.now(),
  });
}

// Helper to notify multiple users
export async function createNotificationsForUsers(
  ctx: any,
  userIds: Id<"users">[],
  type:
    | "attendance_pending"
    | "attendance_approved"
    | "attendance_rejected"
    | "assignment_assigned"
    | "assignment_completed"
    | "assignment_deleted"
    | "report_submitted"
    | "member_assigned"
    | "member_created"
    | "member_updated"
    | "member_deleted"
    | "user_created"
    | "user_updated"
    | "user_deleted"
    | "profile_updated"
    | "settings_updated"
    | "group_created"
    | "group_updated"
    | "group_deleted"
    | "group_member_added"
    | "group_member_removed"
    | "event_created"
    | "event_updated"
    | "event_deleted"
    | "prayer_request"
    | "prayer_response"
    | "system"
    | "reminder",
  title: string,
  message: string,
  relatedId?: string,
  relatedType?:
    | "attendance"
    | "assignment"
    | "report"
    | "member"
    | "user"
    | "group"
    | "event"
    | "reminder"
    | "prayer_request"
    | "settings"
) {
  for (const userId of userIds) {
    await createNotification(ctx, userId, type, title, message, relatedId, relatedType);
  }
}

// Helper to notify admins
export async function notifyAdmins(
  ctx: any,
  type:
    | "attendance_pending"
    | "attendance_approved"
    | "attendance_rejected"
    | "assignment_assigned"
    | "assignment_completed"
    | "assignment_deleted"
    | "report_submitted"
    | "member_assigned"
    | "member_created"
    | "member_updated"
    | "member_deleted"
    | "user_created"
    | "user_updated"
    | "user_deleted"
    | "profile_updated"
    | "settings_updated"
    | "group_created"
    | "group_updated"
    | "group_deleted"
    | "group_member_added"
    | "group_member_removed"
    | "event_created"
    | "event_updated"
    | "event_deleted"
    | "prayer_request"
    | "prayer_response"
    | "system"
    | "reminder",
  title: string,
  message: string,
  relatedId?: string,
  relatedType?:
    | "attendance"
    | "assignment"
    | "report"
    | "member"
    | "user"
    | "group"
    | "event"
    | "reminder"
    | "prayer_request"
    | "settings"
) {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q: any) => q.eq("role", "admin"))
    .collect();

  const activeAdmins = admins.filter((admin: { isActive: any; }) => admin.isActive);
  await createNotificationsForUsers(
    ctx,
    activeAdmins.map((a: { _id: any; }) => a._id),
    type,
    title,
    message,
    relatedId,
    relatedType
  );
}
