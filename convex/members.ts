import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";
import { createNotification, notifyAdmins } from "./notificationHelpers";

// Generate custom member ID (e.g., MBR-0425 or 2025-123)
async function generateCustomId(ctx: any): Promise<string> {
  const year = new Date().getFullYear();
  
  // Get the last member created this year to determine next number
  const membersThisYear = await ctx.db
    .query("members")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_date_joined", (q: any) => 
      q.gte("dateJoinedChurch", new Date(year, 0, 1).getTime())
    )
    .collect();

  // Find highest number used this year
  let maxNumber = 0;
  for (const member of membersThisYear) {
    if (member.customId) {
      // Handle formats like "MBR-0425", "2025-123", etc.
      const match = member.customId.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  // Generate new ID: format as MBR-XXXX where XXXX is zero-padded number
  const nextNumber = maxNumber + 1;
  return `MBR-${String(nextNumber).padStart(4, "0")}`;
}

// Create a new member
export const create = mutation({
  args: {
    token: v.string(),
    // Basic identification
    firstName: v.string(),
    lastName: v.string(),
    preferredName: v.optional(v.string()),
    // Personal information
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    dateOfBirth: v.number(), // Unix timestamp
    maritalStatus: v.optional(
      v.union(
        v.literal("single"),
        v.literal("married"),
        v.literal("divorced"),
        v.literal("widowed")
      )
    ),
    weddingAnniversaryDate: v.optional(v.number()),
    spouseName: v.optional(v.string()),
    childrenCount: v.optional(v.number()),
    // Contact information
    phone: v.string(),
    whatsappNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    // Address information
    address: v.string(),
    nearestLandmark: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    // Church information
    dateJoinedChurch: v.number(), // Unix timestamp
    baptismDate: v.optional(v.number()),
    // Additional information
    occupation: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    profilePhotoId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    // Member status
    status: v.optional(
      v.union(
        v.literal("new_convert"),
        v.literal("first_timer"),
        v.literal("established"),
        v.literal("visitor"),
        v.literal("inactive")
      )
    ),
    // Relationships
    shepherdId: v.id("users"),
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

    // Check permissions - shepherds can create members, admins can create anyone
    if (user.role !== "admin" && user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds and admins can create members");
    }

    // If shepherd, ensure they're assigning to themselves or check permissions
    if (user.role === "shepherd" && args.shepherdId !== userId) {
      throw new Error("Unauthorized - shepherds can only assign members to themselves");
    }

    // Generate custom ID
    const customId = await generateCustomId(ctx);

    // Create member
    const memberId = await ctx.db.insert("members", {
      firstName: args.firstName,
      lastName: args.lastName,
      preferredName: args.preferredName,
      customId,
      gender: args.gender,
      dateOfBirth: args.dateOfBirth,
      maritalStatus: args.maritalStatus,
      weddingAnniversaryDate: args.weddingAnniversaryDate,
      spouseName: args.spouseName,
      childrenCount: args.childrenCount,
      phone: args.phone,
      whatsappNumber: args.whatsappNumber,
      email: args.email,
      address: args.address,
      nearestLandmark: args.nearestLandmark,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      country: args.country,
      dateJoinedChurch: args.dateJoinedChurch,
      baptismDate: args.baptismDate,
      occupation: args.occupation,
      emergencyContactName: args.emergencyContactName,
      emergencyContactPhone: args.emergencyContactPhone,
      profilePhotoId: args.profilePhotoId,
      notes: args.notes,
      status: args.status || "established",
      shepherdId: args.shepherdId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
      isActive: true,
    });

    const member = await ctx.db.get(memberId);
    const memberName = `${args.firstName} ${args.lastName}`;

    // Notify the shepherd
    await createNotification(
      ctx,
      args.shepherdId,
      "member_created",
      "New Member Added",
      `${memberName} has been added to your care`,
      memberId,
      "member"
    );

    // Notify admins
    await notifyAdmins(
      ctx,
      "member_created",
      "New Member Created",
      `${user.name} created a new member: ${memberName}`,
      memberId,
      "member"
    );

    return member;
  },
});

// Get member by ID
export const getById = query({
  args: {
    token: v.string(),
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions - shepherds can view their members, admins/pastors can view all
    if (
      user.role !== "admin" &&
      user.role !== "pastor" &&
      (user.role !== "shepherd" || member.shepherdId !== userId)
    ) {
      throw new Error("Unauthorized");
    }

    return member;
  },
});

// List members (with filters)
export const list = query({
  args: {
    token: v.string(),
    shepherdId: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
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

    // Determine which members the user can see
    let members = await ctx.db.query("members").collect();

    if (user.role === "shepherd") {
      // Shepherds can only see their own members
      members = await ctx.db
        .query("members")
        .withIndex("by_shepherd", (q) => q.eq("shepherdId", userId))
        .collect();
    } else if (user.role === "pastor") {
      // Pastors can see members of their shepherds
      if (args.shepherdId) {
        // Check if shepherd is under this pastor
        const shepherd = await ctx.db.get(args.shepherdId);
        if (shepherd && shepherd.overseerId === userId) {
          members = await ctx.db
            .query("members")
            .withIndex("by_shepherd", (q) => q.eq("shepherdId", args.shepherdId!))
            .collect();
        } else {
          return []; // Not authorized
        }
      } else {
        // Get all shepherds under this pastor
        const shepherds = await ctx.db
          .query("users")
          .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
          .collect();
        
        const shepherdIds = shepherds.map((s) => s._id);
        // Filter members by shepherd IDs
        members = members.filter((m) => shepherdIds.includes(m.shepherdId));
      }
    } else if (user.role === "admin") {
      // Admins can see all members
      if (args.shepherdId) {
        members = await ctx.db
          .query("members")
          .withIndex("by_shepherd", (q) => q.eq("shepherdId", args.shepherdId!))
          .collect();
      }
      // If no shepherdId filter, members already contains all members
    } else {
      return [];
    }

    // Filter by isActive if specified
    if (args.isActive !== undefined) {
      members = members.filter((m) => m.isActive === args.isActive);
    }

    return members;
  },
});

// Update member
export const update = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
    // All fields optional for partial updates
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    preferredName: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    dateOfBirth: v.optional(v.number()),
    maritalStatus: v.optional(
      v.union(
        v.literal("single"),
        v.literal("married"),
        v.literal("divorced"),
        v.literal("widowed")
      )
    ),
    weddingAnniversaryDate: v.optional(v.number()),
    spouseName: v.optional(v.string()),
    childrenCount: v.optional(v.number()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    nearestLandmark: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    dateJoinedChurch: v.optional(v.number()),
    baptismDate: v.optional(v.number()),
    occupation: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    profilePhotoId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("new_convert"),
        v.literal("first_timer"),
        v.literal("established"),
        v.literal("visitor"),
        v.literal("inactive")
      )
    ),
    shepherdId: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check permissions
    if (
      user.role !== "admin" &&
      (user.role !== "shepherd" || member.shepherdId !== userId)
    ) {
      throw new Error("Unauthorized");
    }

    // If changing shepherd, only admin can do this
    if (args.shepherdId !== undefined && args.shepherdId !== member.shepherdId) {
      if (user.role !== "admin") {
        throw new Error("Unauthorized - only admins can reassign members");
      }
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Update only provided fields
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.preferredName !== undefined) updates.preferredName = args.preferredName;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.maritalStatus !== undefined) updates.maritalStatus = args.maritalStatus;
    if (args.weddingAnniversaryDate !== undefined) updates.weddingAnniversaryDate = args.weddingAnniversaryDate;
    if (args.spouseName !== undefined) updates.spouseName = args.spouseName;
    if (args.childrenCount !== undefined) updates.childrenCount = args.childrenCount;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.whatsappNumber !== undefined) updates.whatsappNumber = args.whatsappNumber;
    if (args.email !== undefined) updates.email = args.email;
    if (args.address !== undefined) updates.address = args.address;
    if (args.nearestLandmark !== undefined) updates.nearestLandmark = args.nearestLandmark;
    if (args.city !== undefined) updates.city = args.city;
    if (args.state !== undefined) updates.state = args.state;
    if (args.zipCode !== undefined) updates.zipCode = args.zipCode;
    if (args.country !== undefined) updates.country = args.country;
    if (args.dateJoinedChurch !== undefined) updates.dateJoinedChurch = args.dateJoinedChurch;
    if (args.baptismDate !== undefined) updates.baptismDate = args.baptismDate;
    if (args.occupation !== undefined) updates.occupation = args.occupation;
    if (args.emergencyContactName !== undefined) updates.emergencyContactName = args.emergencyContactName;
    if (args.emergencyContactPhone !== undefined) updates.emergencyContactPhone = args.emergencyContactPhone;
    if (args.profilePhotoId !== undefined) updates.profilePhotoId = args.profilePhotoId;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.status !== undefined) updates.status = args.status;
    if (args.shepherdId !== undefined) updates.shepherdId = args.shepherdId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.memberId, updates);

    const updatedMember = await ctx.db.get(args.memberId);
    const memberName = updatedMember ? `${updatedMember.firstName} ${updatedMember.lastName}` : "Member";

    // Notify the shepherd if member was updated
    if (updatedMember?.shepherdId) {
      await createNotification(
        ctx,
        updatedMember.shepherdId,
        "member_updated",
        "Member Updated",
        `${memberName}'s information has been updated`,
        args.memberId,
        "member"
      );
    }

    // If shepherd changed, notify both old and new shepherd
    if (args.shepherdId !== undefined && args.shepherdId !== member.shepherdId && member.shepherdId) {
      await createNotification(
        ctx,
        member.shepherdId,
        "member_assigned",
        "Member Reassigned",
        `${memberName} has been reassigned to another shepherd`,
        args.memberId,
        "member"
      );
    }

    return updatedMember;
  },
});

// Delete member (soft delete by setting isActive to false)
export const remove = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Only admin can delete members
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can delete members");
    }

    // Soft delete
    await ctx.db.patch(args.memberId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    const memberName = `${member.firstName} ${member.lastName}`;

    // Notify the shepherd
    if (member.shepherdId) {
      await createNotification(
        ctx,
        member.shepherdId,
        "member_deleted",
        "Member Deleted",
        `${memberName} has been deleted`,
        args.memberId,
        "member"
      );
    }

    // Notify admins
    await notifyAdmins(
      ctx,
      "member_deleted",
      "Member Deleted",
      `${user.name} deleted member: ${memberName}`,
      args.memberId,
      "member"
    );

    return { success: true };
  },
});

// Bulk delete members (admin only)
export const bulkDelete = mutation({
  args: {
    token: v.string(),
    memberIds: v.array(v.id("members")),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    const deleted: string[] = [];
    const errors: Array<{ memberId: string; error: string }> = [];

    for (const memberId of args.memberIds) {
      try {
        const member = await ctx.db.get(memberId);
        if (!member) {
          errors.push({ memberId, error: "Member not found" });
          continue;
        }

        // Soft delete
        await ctx.db.patch(memberId, {
          isActive: false,
          updatedAt: Date.now(),
        });

        const memberName = `${member.firstName} ${member.lastName}`;

        // Notify the shepherd
        if (member.shepherdId) {
          await createNotification(
            ctx,
            member.shepherdId,
            "member_deleted",
            "Member Deleted",
            `${memberName} has been deleted`,
            memberId,
            "member"
          );
        }

        deleted.push(memberId);
      } catch (error: any) {
        errors.push({ memberId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      deleted: deleted.length,
      total: args.memberIds.length,
      memberIds: deleted,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Bulk update member status (admin only)
export const bulkUpdateStatus = mutation({
  args: {
    token: v.string(),
    memberIds: v.array(v.id("members")),
    status: v.union(
      v.literal("new_convert"),
      v.literal("first_timer"),
      v.literal("established"),
      v.literal("visitor"),
      v.literal("inactive")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    const updated: string[] = [];
    const errors: Array<{ memberId: string; error: string }> = [];

    for (const memberId of args.memberIds) {
      try {
        const member = await ctx.db.get(memberId);
        if (!member) {
          errors.push({ memberId, error: "Member not found" });
          continue;
        }

        await ctx.db.patch(memberId, {
          status: args.status,
          updatedAt: Date.now(),
        });

        updated.push(memberId);
      } catch (error: any) {
        errors.push({ memberId, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      updated: updated.length,
      total: args.memberIds.length,
      memberIds: updated,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Get members to contact (smart or random listing)
export const getMembersToContact = query({
  args: {
    token: v.string(),
    mode: v.union(v.literal("smart"), v.literal("random")), // "smart" prioritizes important contacts, "random" shuffles
    limit: v.optional(v.number()), // Maximum number of members to return
    includePhoneOnly: v.optional(v.boolean()), // Include members with only phone (no WhatsApp)
    includeWhatsAppOnly: v.optional(v.boolean()), // Include members with only WhatsApp (no phone)
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

    // Only shepherds and pastors can use this feature
    if (user.role !== "shepherd" && user.role !== "pastor" && user.role !== "admin") {
      throw new Error("Unauthorized - only shepherds, pastors, and admins can get members to contact");
    }

    // Get members based on role permissions
    let members = await ctx.db.query("members").collect();

    if (user.role === "shepherd") {
      // Shepherds can only see their own members
      members = members.filter((m) => m.shepherdId === userId);
    } else if (user.role === "pastor") {
      // Pastors can see members of their shepherds
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      members = members.filter((m) => shepherdIds.includes(m.shepherdId));
    }
    // Admins can see all

    // Filter by active status
    members = members.filter((m) => m.isActive);

    // Filter by contact availability
    const membersWithContact = members.filter((m) => {
      const hasPhone = !!m.phone;
      const hasWhatsApp = !!m.whatsappNumber;
      
      if (hasPhone && hasWhatsApp) return true;
      if (hasPhone && args.includePhoneOnly) return true;
      if (hasWhatsApp && args.includeWhatsAppOnly) return true;
      return false;
    });

    // Apply smart or random mode
    if (args.mode === "smart") {
      // Prioritize: new converts > first timers > established > visitors > inactive
      const priority: Record<string, number> = {
        new_convert: 5,
        first_timer: 4,
        established: 3,
        visitor: 2,
        inactive: 1,
      };
      membersWithContact.sort((a, b) => {
        const aPriority = priority[a.status || "established"] || 0;
        const bPriority = priority[b.status || "established"] || 0;
        return bPriority - aPriority;
      });
    } else {
      // Random shuffle
      for (let i = membersWithContact.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [membersWithContact[i], membersWithContact[j]] = [
          membersWithContact[j],
          membersWithContact[i],
        ];
      }
    }

    // Apply limit
    const limit = args.limit || membersWithContact.length;
    return membersWithContact.slice(0, limit);
  },
});

// Assign new converts or first timers to shepherd for visitation/prayer (admin or pastor only)
export const assignForVisitation = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
    shepherdId: v.id("users"),
    dueDate: v.number(), // Unix timestamp - when visitation should be completed
    notes: v.optional(v.string()),
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

    // Only admin or pastor can assign
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - only admins and pastors can assign members for visitation");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Only new converts or first timers can be assigned
    if (member.status !== "new_convert" && member.status !== "first_timer") {
      throw new Error("Only new converts or first timers can be assigned for visitation");
    }

    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd || shepherd.role !== "shepherd") {
      throw new Error("Invalid shepherd");
    }

    // If pastor, check if they oversee this shepherd
    if (user.role === "pastor" && shepherd.overseerId !== userId) {
      throw new Error("Unauthorized - you don't oversee this shepherd");
    }

    // Create assignment
    const assignmentId = await ctx.db.insert("assignments", {
      memberId: args.memberId,
      shepherdId: args.shepherdId,
      assignedBy: userId,
      assignmentType: "visitation",
      title: `Visitation: ${member.firstName} ${member.lastName} (${member.status === "new_convert" ? "New Convert" : "First Timer"})`,
      description: args.notes || `Please visit ${member.firstName} ${member.lastName} for prayer and follow-up.`,
      dueDate: args.dueDate,
      status: "pending",
      priority: "high",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create reminder for due date (1 day before)
    const reminderDate = args.dueDate - 24 * 60 * 60 * 1000; // 1 day before
    await ctx.db.insert("reminders", {
      userId: args.shepherdId,
      type: "assignment_due",
      title: "Visitation Assignment Due",
      message: `Visitation assignment for ${member.firstName} ${member.lastName} is due tomorrow`,
      reminderDate: reminderDate,
      relatedId: assignmentId,
      relatedType: "assignment",
      isSent: false,
      createdAt: Date.now(),
    });

    // Create notification for shepherd
    try {
      await createNotification(
        ctx,
        args.shepherdId,
        "assignment_assigned",
        "New Visitation Assignment",
        `You have been assigned to visit ${member.firstName} ${member.lastName} (${member.status === "new_convert" ? "New Convert" : "First Timer"})`,
        assignmentId,
        "assignment"
      );
    } catch (error) {
      console.error("Failed to create shepherd notification:", error);
    }

    // Notify the creator (admin/pastor) about successful assignment creation
    try {
      const memberName = `${member.firstName} ${member.lastName}`;
      await createNotification(
        ctx,
        userId,
        "assignment_assigned",
        "Visitation Assignment Created",
        `You successfully created visitation assignment for ${memberName}`,
        assignmentId,
        "assignment"
      );
    } catch (error) {
      console.error("Failed to create creator notification:", error);
    }

    return { assignmentId, success: true };
  },
});

// Get member statistics (admin only)
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

    // Determine which members the user can see
    let members = await ctx.db.query("members").collect();

    if (user.role === "shepherd") {
      // Shepherds can only see their own members
      members = await ctx.db
        .query("members")
        .withIndex("by_shepherd", (q) => q.eq("shepherdId", userId))
        .collect();
    } else if (user.role === "pastor") {
      // Pastors can see members of their shepherds
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      members = members.filter((m) => shepherdIds.includes(m.shepherdId));
    }
    // Admins can see all

    // Filter active members only
    const activeMembers = members.filter((m) => m.isActive);

    // Count by status
    const statusCounts = {
      new_convert: activeMembers.filter((m) => m.status === "new_convert").length,
      first_timer: activeMembers.filter((m) => m.status === "first_timer").length,
      established: activeMembers.filter((m) => m.status === "established").length,
      visitor: activeMembers.filter((m) => m.status === "visitor").length,
      inactive: activeMembers.filter((m) => m.status === "inactive").length,
      total: activeMembers.length,
    };

    // Count by year joined
    const yearCounts: Record<number, number> = {};
    activeMembers.forEach((m) => {
      if (m.dateJoinedChurch) {
        const year = new Date(m.dateJoinedChurch).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    return {
      statusCounts,
      yearCounts,
      totalMembers: activeMembers.length,
    };
  },
});

// Update attendance risk levels for all members (internal - called by cron)
export const updateAttendanceRiskLevels = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get settings to determine risk thresholds
    const settingsDoc = await ctx.db
      .query("settings")
      .first();

    // Use settings if available, otherwise use defaults
    const lowRiskDays = settingsDoc?.lowRiskDays ?? 14;
    const mediumRiskDays = settingsDoc?.mediumRiskDays ?? 30;
    const highRiskDays = settingsDoc?.highRiskDays ?? 60;
    const enableAtRiskTracking = settingsDoc?.enableAtRiskTracking ?? true;

    // If at-risk tracking is disabled, don't update risk levels
    if (!enableAtRiskTracking) {
      return { updated: 0 };
    }

    // Get all active members
    const members = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const now = Date.now();
    let updatedCount = 0;

    // Update risk level for each member
    for (const member of members) {
      let newRiskLevel: "none" | "low" | "medium" | "high" = "none";

      if (member.lastAttendanceDate) {
        // Calculate days since last attendance
        const daysSinceLastAttendance = Math.floor(
          (now - member.lastAttendanceDate) / (1000 * 60 * 60 * 24)
        );

        // Determine risk level based on days since last attendance
        if (daysSinceLastAttendance >= highRiskDays) {
          newRiskLevel = "high";
        } else if (daysSinceLastAttendance >= mediumRiskDays) {
          newRiskLevel = "medium";
        } else if (daysSinceLastAttendance >= lowRiskDays) {
          newRiskLevel = "low";
        } else {
          newRiskLevel = "none";
        }
      } else {
        // If member has never attended, check how long since they joined
        if (member.dateJoinedChurch) {
          const daysSinceJoined = Math.floor(
            (now - member.dateJoinedChurch) / (1000 * 60 * 60 * 24)
          );

          // For new members, only mark as risk if they've been inactive for a while
          if (daysSinceJoined >= highRiskDays) {
            newRiskLevel = "high";
          } else if (daysSinceJoined >= mediumRiskDays) {
            newRiskLevel = "medium";
          } else if (daysSinceJoined >= lowRiskDays) {
            newRiskLevel = "low";
          }
        }
      }

      // Only update if risk level has changed
      if (member.attendanceRiskLevel !== newRiskLevel) {
        await ctx.db.patch(member._id, {
          attendanceRiskLevel: newRiskLevel,
          updatedAt: now,
        });
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});
