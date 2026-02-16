import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { verifyToken } from "./auth";

function requireAdmin(ctx: any, token: string) {
  return verifyToken(ctx, token).then(async (userId) => {
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") throw new Error("Unauthorized - admin only");
    return userId;
  });
}

// --- Regions (admin only) ---

export const listRegions = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const _ = await requireAdmin(ctx, args.token);
    return ctx.db.query("regions").order("desc").collect();
  },
});

/** For shepherd form: list regions (admin or pastor). */
export const listRegionsForSelect = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "pastor"))
      throw new Error("Unauthorized");
    return ctx.db.query("regions").order("desc").collect();
  },
});

export const createRegion = mutation({
  args: { token: v.string(), name: v.string(), badgeColor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();
    return ctx.db.insert("regions", {
      name: args.name,
      badgeColor: args.badgeColor,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRegion = mutation({
  args: {
    token: v.string(),
    regionId: v.id("regions"),
    name: v.optional(v.string()),
    pastorId: v.optional(v.union(v.id("users"), v.null())),
    badgeColor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const region = await ctx.db.get(args.regionId);
    if (!region) throw new Error("Region not found");
    const updates: { name?: string; pastorId?: Id<"users">; badgeColor?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.pastorId !== undefined) updates.pastorId = args.pastorId === null ? undefined : args.pastorId;
    if (args.badgeColor !== undefined) updates.badgeColor = args.badgeColor === null ? undefined : args.badgeColor;
    await ctx.db.patch(args.regionId, updates);
    return args.regionId;
  },
});

export const deleteRegion = mutation({
  args: { token: v.string(), regionId: v.id("regions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const bacentas = await ctx.db
      .query("bacentas")
      .withIndex("by_region", (q) => q.eq("regionId", args.regionId))
      .collect();
    for (const b of bacentas) {
      const links = await ctx.db
        .query("shepherdBacentas")
        .withIndex("by_bacenta", (q) => q.eq("bacentaId", b._id))
        .collect();
      for (const link of links) await ctx.db.delete(link._id);
      await ctx.db.delete(b._id);
    }
    await ctx.db.delete(args.regionId);
    return { success: true };
  },
});

// --- Bacentas (admin only) ---

export const listBacentasByRegion = query({
  args: { token: v.string(), regionId: v.id("regions") },
  handler: async (ctx, args) => {
    const _ = await requireAdmin(ctx, args.token);
    return ctx.db
      .query("bacentas")
      .withIndex("by_region", (q) => q.eq("regionId", args.regionId))
      .collect();
  },
});

export const listAllBacentas = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const _ = await requireAdmin(ctx, args.token);
    return ctx.db.query("bacentas").order("desc").collect();
  },
});

/** For shepherd form: list bacentas (admin/pastor for dropdown). */
export const listBacentasForSelect = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    return ctx.db.query("bacentas").order("desc").collect();
  },
});

/** For shepherd form: list bacentas in a region (admin or pastor). */
export const listBacentasByRegionForSelect = query({
  args: { token: v.string(), regionId: v.id("regions") },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "pastor"))
      throw new Error("Unauthorized");
    return ctx.db
      .query("bacentas")
      .withIndex("by_region", (q) => q.eq("regionId", args.regionId))
      .collect();
  },
});

export const createBacenta = mutation({
  args: {
    token: v.string(),
    regionId: v.id("regions"),
    name: v.string(),
    area: v.optional(v.string()),
    meetingDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const region = await ctx.db.get(args.regionId);
    if (!region) throw new Error("Region not found");
    const now = Date.now();
    return ctx.db.insert("bacentas", {
      name: args.name,
      regionId: args.regionId,
      area: args.area,
      meetingDay: args.meetingDay,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBacenta = mutation({
  args: {
    token: v.string(),
    bacentaId: v.id("bacentas"),
    name: v.string(),
    area: v.optional(v.string()),
    meetingDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const patch: { name: string; area?: string; meetingDay?: number; updatedAt: number } = {
      name: args.name,
      updatedAt: Date.now(),
    };
    if (args.area !== undefined) patch.area = args.area;
    if (args.meetingDay !== undefined) patch.meetingDay = args.meetingDay;
    await ctx.db.patch(args.bacentaId, patch);
    return args.bacentaId;
  },
});

export const deleteBacenta = mutation({
  args: { token: v.string(), bacentaId: v.id("bacentas") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const links = await ctx.db
      .query("shepherdBacentas")
      .withIndex("by_bacenta", (q) => q.eq("bacentaId", args.bacentaId))
      .collect();
    for (const link of links) await ctx.db.delete(link._id);
    await ctx.db.delete(args.bacentaId);
    return { success: true };
  },
});

// --- Shepherd-Bacenta (admin/pastor when adding/editing shepherds) ---

export const getBacentasForShepherd = query({
  args: { token: v.string(), shepherdId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const links = await ctx.db
      .query("shepherdBacentas")
      .withIndex("by_shepherd", (q) => q.eq("shepherdId", args.shepherdId))
      .collect();
    const bacentaIds = links.map((l) => l.bacentaId);
    const bacentas = await Promise.all(bacentaIds.map((id) => ctx.db.get(id)));
    return bacentas.filter(Boolean);
  },
});

/** Set (replace) all bacentas for a shepherd. Call after creating/updating shepherd. */
export const setShepherdBacentas = mutation({
  args: {
    token: v.string(),
    shepherdId: v.id("users"),
    bacentaIds: v.array(v.id("bacentas")),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "pastor"))
      throw new Error("Unauthorized - admin or pastor required");
    if (user.role === "pastor") {
      const shepherd = await ctx.db.get(args.shepherdId);
      if (!shepherd || shepherd.overseerId !== userId)
        throw new Error("Unauthorized - can only assign bacentas to your shepherds");
    }

    const existing = await ctx.db
      .query("shepherdBacentas")
      .withIndex("by_shepherd", (q) => q.eq("shepherdId", args.shepherdId))
      .collect();
    for (const link of existing) await ctx.db.delete(link._id);

    const now = Date.now();
    for (const bacentaId of args.bacentaIds) {
      await ctx.db.insert("shepherdBacentas", {
        shepherdId: args.shepherdId,
        bacentaId,
        addedAt: now,
        addedBy: userId,
      });
    }
    return { success: true };
  },
});

/** Set (replace) all shepherds for a bacenta. */
export const setBacentaShepherds = mutation({
  args: {
    token: v.string(),
    bacentaId: v.id("bacentas"),
    shepherdIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "pastor"))
      throw new Error("Unauthorized - admin or pastor required");

    const bacenta = await ctx.db.get(args.bacentaId);
    if (!bacenta) throw new Error("Bacenta not found");

    // Remove all existing shepherd-bacenta links for this bacenta
    const existing = await ctx.db
      .query("shepherdBacentas")
      .withIndex("by_bacenta", (q) => q.eq("bacentaId", args.bacentaId))
      .collect();
    for (const link of existing) await ctx.db.delete(link._id);

    // Add new shepherd-bacenta links
    const now = Date.now();
    for (const shepherdId of args.shepherdIds) {
      // Check if pastor can assign to this shepherd
      if (user.role === "pastor") {
        const shepherd = await ctx.db.get(shepherdId);
        if (!shepherd || shepherd.overseerId !== userId)
          throw new Error("Unauthorized - can only assign bacentas to your shepherds");
      }

      await ctx.db.insert("shepherdBacentas", {
        shepherdId,
        bacentaId: args.bacentaId,
        addedAt: now,
        addedBy: userId,
      });
    }
    return { success: true };
  },
});

/** Assign multiple shepherds to a bacenta (adds bacenta to each shepherd's existing bacentas). */
export const assignShepherdsToBacenta = mutation({
  args: {
    token: v.string(),
    bacentaId: v.id("bacentas"),
    shepherdIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "pastor"))
      throw new Error("Unauthorized - admin or pastor required");

    const bacenta = await ctx.db.get(args.bacentaId);
    if (!bacenta) throw new Error("Bacenta not found");

    const now = Date.now();
    for (const shepherdId of args.shepherdIds) {
      // Check if pastor can assign to this shepherd
      if (user.role === "pastor") {
        const shepherd = await ctx.db.get(shepherdId);
        if (!shepherd || shepherd.overseerId !== userId)
          throw new Error("Unauthorized - can only assign bacentas to your shepherds");
      }

      // Check if already assigned
      const existing = await ctx.db
        .query("shepherdBacentas")
        .withIndex("by_shepherd", (q) => q.eq("shepherdId", shepherdId))
        .filter((q) => q.eq(q.field("bacentaId"), args.bacentaId))
        .first();

      if (!existing) {
        await ctx.db.insert("shepherdBacentas", {
          shepherdId,
          bacentaId: args.bacentaId,
          addedAt: now,
          addedBy: userId,
        });
      }
    }
    return { success: true };
  },
});

/** Get regions with their bacentas and pastor for admin UI */
export const listRegionsWithDetails = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const regions = await ctx.db.query("regions").order("desc").collect();
    const result = await Promise.all(
      regions.map(async (r) => {
        const bacentas = await ctx.db
          .query("bacentas")
          .withIndex("by_region", (q) => q.eq("regionId", r._id))
          .collect();
        const pastor = r.pastorId ? await ctx.db.get(r.pastorId) : null;
        
        // Get all shepherd-bacenta links for bacentas in this region
        const bacentaIds = bacentas.map((b) => b._id);
        const shepherdLinks = await Promise.all(
          bacentaIds.map((bacentaId) =>
            ctx.db
              .query("shepherdBacentas")
              .withIndex("by_bacenta", (q) => q.eq("bacentaId", bacentaId))
              .collect()
          )
        );
        const uniqueShepherdIds = new Set(
          shepherdLinks.flat().map((link) => link.shepherdId)
        );
        const totalShepherds = uniqueShepherdIds.size;
        
        // Get total members for all bacentas in this region (members belong to bacentas, not directly to shepherds)
        const memberCounts = await Promise.all(
          bacentaIds.map((bacentaId) =>
            ctx.db
              .query("members")
              .withIndex("by_bacenta", (q) => q.eq("bacentaId", bacentaId))
              .filter((q) => q.eq(q.field("isActive"), true))
              .collect()
          )
        );
        const totalMembers = memberCounts.flat().length;
        
        return { ...r, bacentas, pastor, totalShepherds, totalMembers };
      })
    );
    return result;
  },
});

/** Get shepherds assigned to a bacenta */
export const getShepherdsForBacenta = query({
  args: { token: v.string(), bacentaId: v.id("bacentas") },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const links = await ctx.db
      .query("shepherdBacentas")
      .withIndex("by_bacenta", (q) => q.eq("bacentaId", args.bacentaId))
      .collect();
    const shepherds = await Promise.all(
      links.map(async (link) => {
        const shepherd = await ctx.db.get(link.shepherdId);
        if (!shepherd) return null;
        const { passwordHash: _, ...shepherdSafe } = shepherd;
        return shepherdSafe;
      })
    );
    return shepherds.filter((x): x is NonNullable<typeof x> => x != null);
  },
});

/** Get bacenta with shepherds and their members (for bacenta detail dialog) */
export const getBacentaShepherdsAndMembers = query({
  args: { token: v.string(), bacentaId: v.id("bacentas") },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user || (user.role !== "admin" && user.role !== "pastor"))
      throw new Error("Unauthorized");
    const bacenta = await ctx.db.get(args.bacentaId);
    if (!bacenta) return null;
    const links = await ctx.db
      .query("shepherdBacentas")
      .withIndex("by_bacenta", (q) => q.eq("bacentaId", args.bacentaId))
      .collect();
    const shepherdsWithMembers = await Promise.all(
      links.map(async (link) => {
        const shepherd = await ctx.db.get(link.shepherdId);
        if (!shepherd) return null;
        const { passwordHash: _, ...shepherdSafe } = shepherd;
        // Get members assigned to this specific bacenta (not all members of the shepherd)
        const members = await ctx.db
          .query("members")
          .withIndex("by_bacenta", (q) => q.eq("bacentaId", args.bacentaId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .filter((q) => q.eq(q.field("shepherdId"), link.shepherdId))
          .collect();
        return { shepherd: shepherdSafe, members };
      })
    );
    return {
      bacenta,
      shepherdsWithMembers: shepherdsWithMembers.filter((x): x is NonNullable<typeof x> => x != null),
    };
  },
});
