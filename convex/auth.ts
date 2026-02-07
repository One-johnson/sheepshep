import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import * as bcrypt from "bcryptjs";

// Generate session token without crypto (using Math.random)
function generateSessionToken(): string {
  const chars = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
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
    email: v.string(),
    password: v.string(),
    name: v.string(), // Full Name
    role: v.union(v.literal("admin"), v.literal("pastor"), v.literal("shepherd")),
    // Basic contact
    phone: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    // Personal information
    preferredName: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
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
    status: v.optional(
      v.union(v.literal("active"), v.literal("on_leave"), v.literal("inactive"))
    ),
    // Relationships
    overseerId: v.optional(v.id("users")), // For shepherds, assign a pastor
  },
  handler: async (ctx, args) => {
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
          status: args.status,
          overseerId: args.overseerId,
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

      // Create notifications (helper function would be imported, but for now we'll do it inline)
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
      status: args.status,
      overseerId: args.overseerId,
    });

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

    if (!user || !user.isActive) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

// Verify session token (helper function for other mutations/queries)
export async function verifyToken(
  ctx: any,
  token: string
): Promise<Id<"users"> | null> {
  const session = await ctx.db
    .query("sessions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (!user || !user.isActive) {
    await ctx.db.delete(session._id);
    return null;
  }

  return session.userId;
}

// Change password
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);

    if (!userId) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password using bcryptjs
    if (!bcrypt.compareSync(args.currentPassword, user.passwordHash)) {
      throw new Error("Current password is incorrect");
    }

    // Update password using bcryptjs
    const saltRounds = 10;
    const newPasswordHash = bcrypt.hashSync(args.newPassword, saltRounds);
    await ctx.db.patch(userId, {
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    });

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
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
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
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(userId, updates);

    const updatedUser = await ctx.db.get(userId);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
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
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
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
    status: v.optional(
      v.union(v.literal("active"), v.literal("on_leave"), v.literal("inactive"))
    ),
    // Admin fields
    isActive: v.optional(v.boolean()),
    overseerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await verifyToken(ctx, args.token);

    if (!currentUserId) {
      throw new Error("Invalid or expired session");
    }

    // Check if user is admin
    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Prevent deactivating or modifying the first admin
    if (targetUser.isFirstAdmin) {
      if (args.isActive === false) {
        throw new Error("Cannot deactivate the first admin");
      }
      // Allow other updates but prevent role change or deletion
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
    if (args.status !== undefined) updates.status = args.status;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.overseerId !== undefined) updates.overseerId = args.overseerId;

    await ctx.db.patch(args.userId, updates);

    const updatedUser = await ctx.db.get(args.userId);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  },
});
