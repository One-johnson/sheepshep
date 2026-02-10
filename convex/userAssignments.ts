import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { verifyToken } from "./auth";

// Get assignment statistics (admin and pastor)
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

    // Allow admins and pastors
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - admin or pastor access required");
    }

    const allUsers = await ctx.db.query("users").collect();
    
    let pastors = allUsers.filter((u) => u.role === "pastor" && u.isActive);
    let shepherds = allUsers.filter((u) => u.role === "shepherd" && u.isActive);
    
    // Filter by role permissions
    if (user.role === "pastor") {
      // Pastors only see their own shepherds
      shepherds = shepherds.filter((s) => s.overseerId === userId);
      pastors = pastors.filter((p) => p._id === userId);
    }
    
    const unassignedShepherds = shepherds.filter((s) => !s.overseerId);
    
    // Count shepherds per pastor
    const shepherdCounts = pastors.map((pastor) => {
      const count = shepherds.filter((s) => s.overseerId === pastor._id).length;
      return { pastorId: pastor._id, pastorName: pastor.name, count };
    });

    // Zone statistics
    const allZones = new Set<string>();
    shepherds.forEach((s) => {
      if (s.assignedZone) allZones.add(s.assignedZone);
    });
    pastors.forEach((p) => {
      if (p.supervisedZones) {
        p.supervisedZones.forEach((z) => allZones.add(z));
      }
    });

    const zoneStats = Array.from(allZones).map((zone) => {
      const zoneShepherds = shepherds.filter((s) => s.assignedZone === zone);
      const zonePastors = pastors.filter((p) => 
        p.supervisedZones && p.supervisedZones.includes(zone)
      );
      return {
        zone,
        shepherdCount: zoneShepherds.length,
        pastorCount: zonePastors.length,
      };
    });

    return {
      totalPastors: pastors.length,
      totalShepherds: shepherds.length,
      unassignedShepherds: unassignedShepherds.length,
      shepherdCounts,
      totalZones: allZones.size,
      zoneStats,
    };
  },
});

// Get organization hierarchy (admin only)
export const getHierarchy = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    const pastors = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "pastor"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const shepherds = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "shepherd"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const hierarchy = pastors.map((pastor) => {
      const pastorShepherds = shepherds.filter(
        (s) => s.overseerId === pastor._id
      );
      return {
        pastor: {
          _id: pastor._id,
          name: pastor.name,
          email: pastor.email,
          supervisedZones: pastor.supervisedZones || [],
        },
        shepherds: pastorShepherds.map((s) => ({
          _id: s._id,
          name: s.name,
          email: s.email,
          assignedZone: s.assignedZone,
        })),
      };
    });

    const unassignedShepherds = shepherds
      .filter((s) => !s.overseerId)
      .map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        assignedZone: s.assignedZone,
      }));

    return {
      hierarchy,
      unassignedShepherds,
    };
  },
});

// Get all pastors (for assignment dropdowns) - admins and pastors can access
export const getPastors = query({
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

    // Allow admins and pastors to access
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - admin or pastor access required");
    }

    const pastors = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "pastor"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return pastors.map((p) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      supervisedZones: p.supervisedZones || [],
    }));
  },
});

// Get all shepherds (for assignment) - admins and pastors can access
export const getShepherds = query({
  args: {
    token: v.string(),
    pastorId: v.optional(v.id("users")),
    zone: v.optional(v.string()),
    unassignedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "pastor")) {
      throw new Error("Unauthorized - admin or pastor access required");
    }

    let shepherds = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "shepherd"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Pastors only see their own shepherds
    if (user.role === "pastor") {
      shepherds = shepherds.filter((s) => s.overseerId === userId);
    }

    // Apply filters
    if (args.pastorId) {
      shepherds = shepherds.filter((s) => s.overseerId === args.pastorId);
    }
    if (args.zone) {
      shepherds = shepherds.filter((s) => s.assignedZone === args.zone);
    }
    if (args.unassignedOnly) {
      shepherds = shepherds.filter((s) => !s.overseerId);
    }

    // Fetch overseer names
    const overseerIds = new Set(
      shepherds.map((s) => s.overseerId).filter((id): id is Id<"users"> => !!id)
    );
    const overseers = await Promise.all(
      Array.from(overseerIds).map((id) => ctx.db.get(id))
    );
    const overseerMap = new Map(
      overseers
        .filter((o): o is any => !!o)
        .map((o) => [o._id, o.name])
    );

    return shepherds.map((s) => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      assignedZone: s.assignedZone,
      overseerId: s.overseerId,
      overseerName: s.overseerId ? (overseerMap.get(s.overseerId) || null) : null,
    }));
  },
});

// Assign shepherd to pastor
export const assignShepherdToPastor = mutation({
  args: {
    token: v.string(),
    shepherdId: v.id("users"),
    pastorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    // Verify shepherd exists and is a shepherd
    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd || shepherd.role !== "shepherd") {
      throw new Error("Invalid shepherd");
    }

    // Verify pastor exists and is a pastor
    const pastor = await ctx.db.get(args.pastorId);
    if (!pastor || pastor.role !== "pastor") {
      throw new Error("Invalid pastor");
    }

    // Prevent circular assignment (shepherd cannot be assigned to themselves)
    if (args.shepherdId === args.pastorId) {
      throw new Error("Cannot assign user to themselves");
    }

    // Update shepherd's overseerId
    await ctx.db.patch(args.shepherdId, {
      overseerId: args.pastorId,
      updatedAt: Date.now(),
    });

    // Log assignment change in audit log
    await ctx.db.insert("auditLogs", {
      userId: userId,
      action: "assign_shepherd",
      entityType: "users",
      entityId: args.shepherdId,
      details: JSON.stringify({
        shepherdName: shepherd.name,
        pastorId: args.pastorId,
        pastorName: pastor.name,
        previousOverseerId: shepherd.overseerId || null,
      }),
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Unassign shepherd from pastor
export const unassignShepherd = mutation({
  args: {
    token: v.string(),
    shepherdId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd || shepherd.role !== "shepherd") {
      throw new Error("Invalid shepherd");
    }

    const previousOverseerId = shepherd.overseerId;

    await ctx.db.patch(args.shepherdId, {
      overseerId: undefined,
      updatedAt: Date.now(),
    });

      // Log unassignment
    if (previousOverseerId) {
      const previousPastor = await ctx.db.get(previousOverseerId);
      await ctx.db.insert("auditLogs", {
        userId: userId,
        action: "unassign_shepherd",
        entityType: "users",
        entityId: args.shepherdId,
        details: JSON.stringify({
          shepherdName: shepherd.name,
          previousPastorId: previousOverseerId,
          previousPastorName: previousPastor?.name || "Unknown",
        }),
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Bulk assign shepherds to pastor
export const bulkAssignShepherds = mutation({
  args: {
    token: v.string(),
    shepherdIds: v.array(v.id("users")),
    pastorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    // Verify pastor exists and is a pastor
    const pastor = await ctx.db.get(args.pastorId);
    if (!pastor || pastor.role !== "pastor") {
      throw new Error("Invalid pastor");
    }

    const results = {
      success: [] as string[],
      errors: [] as Array<{ shepherdId: string; error: string }>,
    };

    for (const shepherdId of args.shepherdIds) {
      try {
        const shepherd = await ctx.db.get(shepherdId);
        if (!shepherd || shepherd.role !== "shepherd") {
          results.errors.push({
            shepherdId,
            error: "Invalid shepherd",
          });
          continue;
        }

        if (shepherdId === args.pastorId) {
          results.errors.push({
            shepherdId,
            error: "Cannot assign user to themselves",
          });
          continue;
        }

        await ctx.db.patch(shepherdId, {
          overseerId: args.pastorId,
          updatedAt: Date.now(),
        });

        // Log assignment
        await ctx.db.insert("auditLogs", {
          userId: userId,
          action: "assign_shepherd",
          entityType: "users",
          entityId: shepherdId,
          details: JSON.stringify({
            shepherdName: shepherd.name,
            pastorId: args.pastorId,
            pastorName: pastor.name,
            previousOverseerId: shepherd.overseerId || null,
          }),
          createdAt: Date.now(),
        });

        results.success.push(shepherdId);
      } catch (error: any) {
        results.errors.push({
          shepherdId,
          error: error.message || "Unknown error",
        });
      }
    }

    return results;
  },
});

// Assign zone to shepherd
export const assignZoneToShepherd = mutation({
  args: {
    token: v.string(),
    shepherdId: v.id("users"),
    zone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    const shepherd = await ctx.db.get(args.shepherdId);
    if (!shepherd || shepherd.role !== "shepherd") {
      throw new Error("Invalid shepherd");
    }

    const previousZone = shepherd.assignedZone;

    await ctx.db.patch(args.shepherdId, {
      assignedZone: args.zone,
      updatedAt: Date.now(),
    });

    // Log zone assignment
    await ctx.db.insert("auditLogs", {
      userId: userId,
      action: "assign_zone",
      entityType: "users",
      entityId: args.shepherdId,
      details: JSON.stringify({
        shepherdName: shepherd.name,
        zone: args.zone,
        previousZone: previousZone || null,
      }),
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Assign supervised zones to pastor
export const assignSupervisedZonesToPastor = mutation({
  args: {
    token: v.string(),
    pastorId: v.id("users"),
    zones: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin only");
    }

    const pastor = await ctx.db.get(args.pastorId);
    if (!pastor || pastor.role !== "pastor") {
      throw new Error("Invalid pastor");
    }

    const previousZones = pastor.supervisedZones || [];

    await ctx.db.patch(args.pastorId, {
      supervisedZones: args.zones,
      updatedAt: Date.now(),
    });

    // Log zone assignment
    await ctx.db.insert("auditLogs", {
      userId: userId,
      action: "assign_supervised_zones",
      entityType: "users",
      entityId: args.pastorId,
      details: JSON.stringify({
        pastorName: pastor.name,
        zones: args.zones,
        previousZones: previousZones,
      }),
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Get all unique zones (admin and pastor)
export const getAllZones = query({
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

    // Allow admins and pastors
    if (user.role !== "admin" && user.role !== "pastor") {
      throw new Error("Unauthorized - admin or pastor access required");
    }

    let allUsers = await ctx.db.query("users").collect();
    
    // Filter by role permissions
    if (user.role === "pastor") {
      // Pastors only see zones from their shepherds and their own supervised zones
      const pastorShepherds = allUsers.filter((u) => u.role === "shepherd" && u.overseerId === userId);
      const pastor = allUsers.find((u) => u._id === userId);
      allUsers = [...pastorShepherds, ...(pastor ? [pastor] : [])];
    }
    
    const zones = new Set<string>();

    allUsers.forEach((u) => {
      if (u.assignedZone) zones.add(u.assignedZone);
      if (u.supervisedZones) {
        u.supervisedZones.forEach((z) => zones.add(z));
      }
    });

    return Array.from(zones).sort();
  },
});
