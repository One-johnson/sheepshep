import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import * as bcrypt from "bcryptjs";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createNotification, notifyAdmins } from "./notificationHelpers";

// Generate session token without crypto (using Math.random)
function generateSessionToken(): string {
  const chars = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// Verify session token (helper function)
export async function verifyToken(
  ctx: any,
  token: string
): Promise<Id<"users"> | null> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    await ctx.db.delete(session._id);
    return null;
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    await ctx.db.delete(session._id);
    return null;
  }

  // Type assertion: userId is Id<"users"> so user must be a user document
  const userDoc = user as any;
  if (!userDoc.isActive) {
    await ctx.db.delete(session._id);
    return null;
  }

  return session.userId;
}

// Clean up expired sessions (cron job)
export const cleanupExpiredSessions = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return { cleaned: expiredSessions.length };
  },
});

// Register a new user
// For admin/pastor: creates user directly (admin only)
// For shepherd: creates registration request for approval
export const register = mutation({
  args: {
    token: v.optional(v.string()),
    email: v.string(),
    password: v.string(),
    name: v.string(), // Full Name
    role: v.union(v.literal("admin"), v.literal("pastor"), v.literal("shepherd")),
    // Basic contact
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    // Personal information
    preferredName: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    dateOfBirth: v.optional(v.number()), // Unix timestamp
    // Pastor-specific fields
    ordinationDate: v.optional(v.number()), // Unix timestamp
    homeAddress: v.optional(v.string()),
    qualification: v.optional(v.string()),
    yearsInMinistry: v.optional(v.number()),
    ministryFocus: v.optional(v.array(v.string())),
    supervisedZones: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    // Shepherd-specific fields
    commissioningDate: v.optional(v.number()), // Unix timestamp
    occupation: v.optional(v.string()),
    assignedZone: v.optional(v.string()),
    educationalBackground: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("on_leave"), v.literal("inactive"))
    ),
    // Relationships
    overseerId: v.optional(v.id("users")), // For shepherds, assign a pastor
    profilePhotoId: v.optional(v.id("_storage")),
    // Marital information
    maritalStatus: v.optional(
      v.union(
        v.literal("single"),
        v.literal("married"),
        v.literal("divorced"),
        v.literal("widowed")
      )
    ),
    weddingAnniversaryDate: v.optional(v.number()), // Year of marriage (Unix timestamp)
    spouseName: v.optional(v.string()),
    spouseOccupation: v.optional(v.string()),
    childrenCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify token and check admin access for admin/pastor creation
    if (args.role === "admin" || args.role === "pastor") {
      if (!args.token) {
        throw new Error("Unauthorized - token required to create admins or pastors");
      }
      const currentUserId = await verifyToken(ctx, args.token);
      if (!currentUserId) {
        throw new Error("Unauthorized");
      }

      const currentUser = await ctx.db.get(currentUserId);
      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Unauthorized - admin access required to create admins or pastors");
      }
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check if registration request already exists
    const existingRequest = await ctx.db
      .query("registrationRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingRequest && existingRequest.status === "pending") {
      throw new Error("Registration request already pending for this email");
    }

    // Hash password using bcryptjs
    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(args.password, saltRounds);

    // If shepherd, create registration request instead of direct user creation
    if (args.role === "shepherd") {
      // Check if this is the very first user in the system
      const existingUsers = await ctx.db.query("users").collect();
      const isFirstUser = existingUsers.length === 0;

      // If this is the first user, auto-approve and create them as an admin directly
      if (isFirstUser) {
        const userId = await ctx.db.insert("users", {
          email: args.email,
          name: args.name,
          role: "admin", // First user becomes admin
          passwordHash,
          isActive: true,
          isFirstAdmin: true, // Mark as first admin
          createdAt: Date.now(),
          updatedAt: Date.now(),
          phone: args.phone,
          whatsappNumber: args.whatsappNumber,
          preferredName: args.preferredName,
          gender: args.gender,
          dateOfBirth: args.dateOfBirth,
          ordinationDate: args.ordinationDate,
          homeAddress: args.homeAddress,
          qualification: args.qualification,
          yearsInMinistry: args.yearsInMinistry,
          ministryFocus: args.ministryFocus,
          supervisedZones: args.supervisedZones,
          notes: args.notes,
          commissioningDate: args.commissioningDate,
          occupation: args.occupation,
          assignedZone: args.assignedZone,
          educationalBackground: args.educationalBackground,
          status: args.status,
        overseerId: args.overseerId,
        profilePhotoId: args.profilePhotoId,
        maritalStatus: args.maritalStatus,
        weddingAnniversaryDate: args.weddingAnniversaryDate,
        spouseName: args.spouseName,
        spouseOccupation: args.spouseOccupation,
        childrenCount: args.childrenCount,
      });

        return { userId, success: true, isFirstAdmin: true };
      }

      // Get an admin user for requestedBy (or use overseerId if provided)
      let requestedBy: Id<"users"> | undefined;
      if (args.overseerId) {
        requestedBy = args.overseerId;
      } else {
        const admin = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .first();
        if (admin) {
          requestedBy = admin._id;
        } else {
          // Fallback: get any user
          const anyUser = await ctx.db.query("users").first();
          requestedBy = anyUser?._id;
        }
      }

      // This should not happen now since we handle first user above, but keep as safety check
      if (!requestedBy) {
        throw new Error(
          "No administrators found. Please contact the system administrator to set up the first admin account."
        );
      }

      const requestId = await ctx.db.insert("registrationRequests", {
        email: args.email,
        name: args.name,
        passwordHash,
        phone: args.phone,
        whatsappNumber: args.whatsappNumber,
        preferredName: args.preferredName,
        gender: args.gender,
        dateOfBirth: args.dateOfBirth,
        commissioningDate: args.commissioningDate,
        occupation: args.occupation,
        assignedZone: args.assignedZone,
        homeAddress: args.homeAddress,
        notes: args.notes,
        status: "pending",
        requestedBy: requestedBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Notify admins and pastors
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();

      const pastors = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "pastor"))
        .collect();

      // Create notifications
      for (const admin of admins) {
        if (admin.isActive) {
          await ctx.db.insert("notifications", {
            userId: admin._id,
            type: "system",
            title: "New Shepherd Registration Request",
            message: `${args.name} (${args.email}) has requested to register as a shepherd`,
            relatedId: requestId,
            relatedType: "member",
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }

      for (const pastor of pastors) {
        if (pastor.isActive) {
          await ctx.db.insert("notifications", {
            userId: pastor._id,
            type: "system",
            title: "New Shepherd Registration Request",
            message: `${args.name} (${args.email}) has requested to register as a shepherd`,
            relatedId: requestId,
            relatedType: "member",
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }

      return { requestId, status: "pending", message: "Registration request submitted for approval" };
    }

    // For admin/pastor: direct creation (admin only)
    // Check if this is the first admin
    const existingAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    const isFirstAdmin = existingAdmins.length === 0 && args.role === "admin";

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role,
      passwordHash,
      isActive: true,
      isFirstAdmin: isFirstAdmin || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phone: args.phone,
      whatsappNumber: args.whatsappNumber,
      preferredName: args.preferredName,
      gender: args.gender,
      dateOfBirth: args.dateOfBirth,
      ordinationDate: args.ordinationDate,
      homeAddress: args.homeAddress,
      qualification: args.qualification,
      yearsInMinistry: args.yearsInMinistry,
      ministryFocus: args.ministryFocus,
      supervisedZones: args.supervisedZones,
      notes: args.notes,
      commissioningDate: args.commissioningDate,
      occupation: args.occupation,
      assignedZone: args.assignedZone,
      educationalBackground: args.educationalBackground,
      status: args.status,
      overseerId: args.overseerId,
      profilePhotoId: args.profilePhotoId,
      maritalStatus: args.maritalStatus,
      weddingAnniversaryDate: args.weddingAnniversaryDate,
      spouseName: args.spouseName,
      spouseOccupation: args.spouseOccupation,
      childrenCount: args.childrenCount,
    });

    // Notify admins about new user creation
    await notifyAdmins(
      ctx,
      "user_created",
      "New User Created",
      `${args.name} (${args.email}) has been created as ${args.role}`,
      userId,
      "user"
    );

    return { userId, success: true };
  },
});

// Login
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("Account is inactive");
    }

    // Verify password using bcryptjs
    if (!bcrypt.compareSync(args.password, user.passwordHash)) {
      throw new Error("Invalid email or password");
    }

    // Generate session token
    const token = generateSessionToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    // Store session in database
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: Date.now(),
    });

    // Return user data (without password hash)
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
      expiresAt,
    };
  },
});

// Logout
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Get current user from session token
export const getCurrentUser = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired (queries can't delete, so just return null)
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);

    if (!user) {
      return null;
    }

    // Type assertion: userId is Id<"users"> so user must be a user document
    const userDoc = user as any;
    if (!userDoc.isActive) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = userDoc;
    return userWithoutPassword;
  },
});

// Change password
export const changePassword = mutation({
  args: {
    token: v.string(),
    oldPassword: v.string(),
    newPassword: v.string(),
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

    // Type assertion: userId is Id<"users"> so user must be a user document
    const userDoc = user as any;

    // Verify old password
    const isOldPasswordValid = bcrypt.compareSync(args.oldPassword, userDoc.passwordHash);
    if (!isOldPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash =  bcrypt.hashSync(args.newPassword, 10);

    // Update password
    await ctx.db.patch(userId, {
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    });

    // Create audit log directly (don't use scheduler)
    try {
      await ctx.db.insert("auditLogs", {
        userId,
        action: "password_changed",
        entityType: "user",
        entityId: userId,
        details: "User changed their password",
        createdAt: Date.now(),
      });
    } catch (error) {
      // Audit log creation failed, but password change succeeded
      console.error("Failed to create audit log:", error);
    }

    return { success: true };
  },
});

// Reset password (admin only, for shepherds and pastors)
export const resetPassword = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);
    if (!currentUserId) {
      throw new Error("Unauthorized");
    }

    // Check if current user is admin
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser) {
      throw new Error("User not found");
    }

    const currentUserDoc = currentUser as any;
    if (currentUserDoc.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const targetUserDoc = targetUser as any;

    // Only allow resetting password for shepherds and pastors
    if (targetUserDoc.role !== "shepherd" && targetUserDoc.role !== "pastor") {
      throw new Error("Can only reset password for shepherds and pastors");
    }

    // Prevent resetting password for first admin even if they're a pastor
    if (targetUserDoc.isFirstAdmin) {
      throw new Error("Cannot reset password for the first admin");
    }

    // Validate password length
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Hash new password
    const newPasswordHash = bcrypt.hashSync(args.newPassword, 10);

    // Update password
    await ctx.db.patch(args.userId, {
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    });

    // Create audit log
    try {
      await ctx.db.insert("auditLogs", {
        userId: currentUserId,
        action: "password_reset",
        entityType: "user",
        entityId: args.userId,
        details: `Admin reset password for ${targetUserDoc.name} (${targetUserDoc.email})`,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }

    // Notify admins about password reset
    try {
      await notifyAdmins(
        ctx,
        "user_updated",
        "Password Reset",
        `${currentUserDoc.name} reset password for ${targetUserDoc.name} (${targetUserDoc.email})`,
        args.userId,
        "user"
      );
    } catch (error) {
      console.error("Failed to notify admins:", error);
    }

    return { success: true };
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    token: v.string(),
    // Basic fields
    name: v.optional(v.string()), // Full Name
    preferredName: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    profilePhotoId: v.optional(v.id("_storage")),
    // Personal information
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    dateOfBirth: v.optional(v.number()),
    // Pastor-specific fields
    ordinationDate: v.optional(v.number()),
    homeAddress: v.optional(v.string()),
    qualification: v.optional(v.string()),
    yearsInMinistry: v.optional(v.number()),
    ministryFocus: v.optional(v.array(v.string())),
    supervisedZones: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    // Shepherd-specific fields
    commissioningDate: v.optional(v.number()),
    occupation: v.optional(v.string()),
    assignedZone: v.optional(v.string()),
    educationalBackground: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("on_leave"), v.literal("inactive"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);

    if (!userId) {
      throw new Error("Invalid or expired session");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Update only provided fields
    if (args.name !== undefined) updates.name = args.name;
    if (args.preferredName !== undefined) updates.preferredName = args.preferredName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.whatsappNumber !== undefined) updates.whatsappNumber = args.whatsappNumber;
    if (args.profilePhotoId !== undefined) updates.profilePhotoId = args.profilePhotoId;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.ordinationDate !== undefined) updates.ordinationDate = args.ordinationDate;
    if (args.homeAddress !== undefined) updates.homeAddress = args.homeAddress;
    if (args.qualification !== undefined) updates.qualification = args.qualification;
    if (args.yearsInMinistry !== undefined) updates.yearsInMinistry = args.yearsInMinistry;
    if (args.ministryFocus !== undefined) updates.ministryFocus = args.ministryFocus;
    if (args.supervisedZones !== undefined) updates.supervisedZones = args.supervisedZones;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.commissioningDate !== undefined) updates.commissioningDate = args.commissioningDate;
    if (args.occupation !== undefined) updates.occupation = args.occupation;
    if (args.assignedZone !== undefined) updates.assignedZone = args.assignedZone;
    if (args.educationalBackground !== undefined) updates.educationalBackground = args.educationalBackground;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(userId, updates);

    const updatedUser = await ctx.db.get(userId);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    // Notify user about profile update
    await createNotification(
      ctx,
      userId,
      "profile_updated",
      "Profile Updated",
      "Your profile information has been updated",
      userId,
      "user"
    );

    const userDoc = updatedUser as any;
    const { passwordHash: _, ...userWithoutPassword } = userDoc;
    return userWithoutPassword;
  },
});

// Update any user profile (admin only)
export const updateUserProfile = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    // Basic fields
    name: v.optional(v.string()), // Full Name
    preferredName: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    profilePhotoId: v.optional(v.id("_storage")),
    // Personal information
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    dateOfBirth: v.optional(v.number()),
    // Pastor-specific fields
    ordinationDate: v.optional(v.number()),
    homeAddress: v.optional(v.string()),
    qualification: v.optional(v.string()),
    yearsInMinistry: v.optional(v.number()),
    ministryFocus: v.optional(v.array(v.string())),
    supervisedZones: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    // Shepherd-specific fields
    commissioningDate: v.optional(v.number()),
    occupation: v.optional(v.string()),
    assignedZone: v.optional(v.string()),
    educationalBackground: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("on_leave"), v.literal("inactive"))
    ),
    // Admin fields
    isActive: v.optional(v.boolean()),
    overseerId: v.optional(v.id("users")),
    role: v.optional(v.union(v.literal("admin"), v.literal("pastor"), v.literal("shepherd"))),
    // Marital information
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
    spouseOccupation: v.optional(v.string()),
    childrenCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);

    if (!currentUserId) {
      throw new Error("Invalid or expired session");
    }

    // Check if user is admin
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser) {
      throw new Error("User not found");
    }

    const currentUserDoc = currentUser as any;
    if (currentUserDoc.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const targetUserDoc = targetUser as any;

    // Prevent deactivating or modifying the first admin
    if (targetUserDoc.isFirstAdmin) {
      if (args.isActive === false) {
        throw new Error("Cannot deactivate the first admin");
      }
      if (args.role !== undefined && args.role !== targetUserDoc.role) {
        throw new Error("Cannot change the role of the first admin");
      }
      // Allow other updates but prevent role change or deletion
    }
    
    // Prevent changing your own role
    if (args.role !== undefined && args.userId === currentUserId) {
      throw new Error("Cannot change your own role");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // Update only provided fields
    if (args.name !== undefined) updates.name = args.name;
    if (args.preferredName !== undefined) updates.preferredName = args.preferredName;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.whatsappNumber !== undefined) updates.whatsappNumber = args.whatsappNumber;
    if (args.profilePhotoId !== undefined) updates.profilePhotoId = args.profilePhotoId;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.ordinationDate !== undefined) updates.ordinationDate = args.ordinationDate;
    if (args.homeAddress !== undefined) updates.homeAddress = args.homeAddress;
    if (args.qualification !== undefined) updates.qualification = args.qualification;
    if (args.yearsInMinistry !== undefined) updates.yearsInMinistry = args.yearsInMinistry;
    if (args.ministryFocus !== undefined) updates.ministryFocus = args.ministryFocus;
    if (args.supervisedZones !== undefined) updates.supervisedZones = args.supervisedZones;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.commissioningDate !== undefined) updates.commissioningDate = args.commissioningDate;
    if (args.occupation !== undefined) updates.occupation = args.occupation;
    if (args.assignedZone !== undefined) updates.assignedZone = args.assignedZone;
    if (args.educationalBackground !== undefined) updates.educationalBackground = args.educationalBackground;
    if (args.status !== undefined) updates.status = args.status;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.overseerId !== undefined) updates.overseerId = args.overseerId;
    if (args.role !== undefined) updates.role = args.role;
    if (args.maritalStatus !== undefined) updates.maritalStatus = args.maritalStatus;
    if (args.weddingAnniversaryDate !== undefined) updates.weddingAnniversaryDate = args.weddingAnniversaryDate;
    if (args.spouseName !== undefined) updates.spouseName = args.spouseName;
    if (args.spouseOccupation !== undefined) updates.spouseOccupation = args.spouseOccupation;
    if (args.childrenCount !== undefined) updates.childrenCount = args.childrenCount;

    await ctx.db.patch(args.userId, updates);

    const updatedUser = await ctx.db.get(args.userId);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    // Notify the user about profile update
    await createNotification(
      ctx,
      args.userId,
      "user_updated",
      "Profile Updated",
      `Your profile has been updated by ${currentUser.name}`,
      args.userId,
      "user"
    );

    // Notify admins
    await notifyAdmins(
      ctx,
      "user_updated",
      "User Profile Updated",
      `${currentUser.name} updated ${updatedUser.name}'s profile`,
      args.userId,
      "user"
    );

    const updatedUserDoc = updatedUser as any;
    const { passwordHash: _, ...userWithoutPassword } = updatedUserDoc;
    return userWithoutPassword;
  },
});
