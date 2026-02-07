import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

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
      attendanceRiskLevel: "none",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
      isActive: true,
    });

    return { memberId, customId };
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

    return await ctx.db.get(args.memberId);
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

    return { success: true };
  },
});

// Bulk create members
export const bulkCreate = mutation({
  args: {
    token: v.string(),
    members: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        preferredName: v.optional(v.string()),
        gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
        dateOfBirth: v.number(),
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
        phone: v.string(),
        whatsappNumber: v.optional(v.string()),
        email: v.optional(v.string()),
        address: v.string(),
        nearestLandmark: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        country: v.optional(v.string()),
        dateJoinedChurch: v.number(),
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
        shepherdId: v.id("users"),
      })
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

    // Check permissions - shepherds can create members, admins can create anyone
    if (user.role !== "admin" && user.role !== "shepherd") {
      throw new Error("Unauthorized - only shepherds and admins can create members");
    }

    const createdMembers: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < args.members.length; i++) {
      const memberData = args.members[i];

      try {
        // If shepherd, ensure they're assigning to themselves or check permissions
        if (user.role === "shepherd" && memberData.shepherdId !== userId) {
          errors.push({ index: i, error: "Unauthorized - shepherds can only assign members to themselves" });
          continue;
        }

        // Generate custom ID
        const customId = await generateCustomId(ctx);

        // Create member
        const memberId = await ctx.db.insert("members", {
          firstName: memberData.firstName,
          lastName: memberData.lastName,
          preferredName: memberData.preferredName,
          customId,
          gender: memberData.gender,
          dateOfBirth: memberData.dateOfBirth,
          maritalStatus: memberData.maritalStatus,
          weddingAnniversaryDate: memberData.weddingAnniversaryDate,
          spouseName: memberData.spouseName,
          childrenCount: memberData.childrenCount,
          phone: memberData.phone,
          whatsappNumber: memberData.whatsappNumber,
          email: memberData.email,
          address: memberData.address,
          nearestLandmark: memberData.nearestLandmark,
          city: memberData.city,
          state: memberData.state,
          zipCode: memberData.zipCode,
          country: memberData.country,
          dateJoinedChurch: memberData.dateJoinedChurch,
          baptismDate: memberData.baptismDate,
          occupation: memberData.occupation,
          emergencyContactName: memberData.emergencyContactName,
          emergencyContactPhone: memberData.emergencyContactPhone,
          profilePhotoId: memberData.profilePhotoId,
          notes: memberData.notes,
          status: memberData.status || "established",
          shepherdId: memberData.shepherdId,
          attendanceRiskLevel: "none",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
          isActive: true,
        });

        createdMembers.push(memberId);
      } catch (error: any) {
        errors.push({ index: i, error: error.message || "Unknown error" });
      }
    }

    return {
      success: true,
      created: createdMembers.length,
      total: args.members.length,
      memberIds: createdMembers,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

// Bulk delete members (soft delete)
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
    if (!user) {
      throw new Error("User not found");
    }

    // Only admin can bulk delete
    if (user.role !== "admin") {
      throw new Error("Unauthorized - only admins can bulk delete members");
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
    await ctx.db.insert("notifications", {
      userId: args.shepherdId,
      type: "assignment_assigned",
      title: "New Visitation Assignment",
      message: `You have been assigned to visit ${member.firstName} ${member.lastName} (${member.status === "new_convert" ? "New Convert" : "First Timer"})`,
      relatedId: assignmentId,
      relatedType: "assignment",
      isRead: false,
      createdAt: Date.now(),
    });

    return { assignmentId, success: true };
  },
});

// Get at-risk members (low attendance)
export const getAtRiskMembers = query({
  args: {
    token: v.string(),
    riskLevel: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    shepherdId: v.optional(v.id("users")),
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

    let members = await ctx.db.query("members").collect();

    // Filter by role permissions
    if (user.role === "shepherd") {
      members = members.filter((m) => m.shepherdId === userId);
    } else if (user.role === "pastor") {
      const shepherds = await ctx.db
        .query("users")
        .withIndex("by_overseer", (q) => q.eq("overseerId", userId))
        .collect();
      const shepherdIds = shepherds.map((s) => s._id);
      members = members.filter((m) => shepherdIds.includes(m.shepherdId));
    }
    // Admins can see all

    // Filter by risk level
    if (args.riskLevel) {
      members = members.filter((m) => m.attendanceRiskLevel === args.riskLevel);
    } else {
      // Show all at-risk members (excluding "none")
      members = members.filter(
        (m) => m.attendanceRiskLevel && m.attendanceRiskLevel !== "none"
      );
    }

    // Filter by shepherd if provided
    if (args.shepherdId) {
      members = members.filter((m) => m.shepherdId === args.shepherdId);
    }

    // Sort by risk level (high first) and last attendance date
    members.sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1, none: 0 };
      const aRisk = riskOrder[a.attendanceRiskLevel || "none"];
      const bRisk = riskOrder[b.attendanceRiskLevel || "none"];
      if (aRisk !== bRisk) return bRisk - aRisk;
      const aLast = a.lastAttendanceDate || 0;
      const bLast = b.lastAttendanceDate || 0;
      return aLast - bLast; // Oldest first
    });

    return members;
  },
});

// Calculate and update attendance risk levels (called by cron job)
export const updateAttendanceRiskLevels = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000; // 2 weeks
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000; // 1 month
    const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000; // 2 months

    const allMembers = await ctx.db.query("members").collect();
    let updated = 0;

    for (const member of allMembers) {
      if (!member.isActive) continue;

      let riskLevel: "none" | "low" | "medium" | "high" = "none";
      const lastAttendance = member.lastAttendanceDate || 0;

      if (lastAttendance === 0) {
        // Never attended - check how long since joining
        const daysSinceJoining = (now - member.dateJoinedChurch) / (24 * 60 * 60 * 1000);
        if (daysSinceJoining >= 60) {
          riskLevel = "high";
        } else if (daysSinceJoining >= 30) {
          riskLevel = "medium";
        } else if (daysSinceJoining >= 14) {
          riskLevel = "low";
        }
      } else {
        // Has attended before - check time since last attendance
        const daysSinceLastAttendance = (now - lastAttendance) / (24 * 60 * 60 * 1000);
        if (daysSinceLastAttendance >= 60) {
          riskLevel = "high";
        } else if (daysSinceLastAttendance >= 30) {
          riskLevel = "medium";
        } else if (daysSinceLastAttendance >= 14) {
          riskLevel = "low";
        }
      }

      // Only update if risk level changed
      if (member.attendanceRiskLevel !== riskLevel) {
        await ctx.db.patch(member._id, {
          attendanceRiskLevel: riskLevel,
          updatedAt: Date.now(),
        });
        updated++;

        // Create notification for shepherd if risk level is medium or high
        if (riskLevel === "medium" || riskLevel === "high") {
          const shepherd = await ctx.db.get(member.shepherdId);
          if (shepherd && shepherd.isActive) {
            await ctx.db.insert("notifications", {
              userId: member.shepherdId,
              type: "reminder",
              title: "Member At-Risk Alert",
              message: `${member.firstName} ${member.lastName} has been flagged as ${riskLevel} risk due to low attendance`,
              relatedId: member._id,
              relatedType: "member",
              isRead: false,
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    return { updated, total: allMembers.length };
  },
});
