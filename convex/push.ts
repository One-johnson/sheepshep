import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyToken } from "./auth";

const subscriptionValidator = v.object({
  endpoint: v.string(),
  keys: v.object({
    p256dh: v.string(),
    auth: v.string(),
  }),
});

/** Public VAPID key for `PushManager.subscribe` (safe to expose). */
export const getVapidPublicKey = query({
  args: {},
  handler: async () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    return { publicKey: publicKey ?? null };
  },
});

export const registerSubscription = mutation({
  args: {
    token: v.string(),
    subscription: subscriptionValidator,
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.subscription.endpoint))
      .first();

    if (existing) {
      if (existing.userId !== userId) {
        throw new Error("Subscription already registered to another account");
      }
      await ctx.db.patch(existing._id, {
        keys: args.subscription.keys,
        updatedAt: now,
      });
      return { success: true as const, id: existing._id };
    }

    const id = await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: args.subscription.endpoint,
      keys: args.subscription.keys,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true as const, id };
  },
});

export const unregisterSubscription = mutation({
  args: {
    token: v.string(),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();

    if (!existing || existing.userId !== userId) {
      return { success: true as const, removed: false };
    }

    await ctx.db.delete(existing._id);
    return { success: true as const, removed: true };
  },
});

export const unregisterAllForUser = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await verifyToken(ctx, args.token);
    if (!userId) throw new Error("Unauthorized");

    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const s of subs) {
      await ctx.db.delete(s._id);
    }
    return { success: true as const, count: subs.length };
  },
});

export const listSubscriptionsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const removeSubscriptionByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
