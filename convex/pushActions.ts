"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push";

export const deliverWebPush = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@localhost";

    if (!publicKey || !privateKey) {
      return { sent: 0, skipped: "missing_vapid" as const };
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = await ctx.runQuery(internal.push.listSubscriptionsForUser, {
      userId: args.userId,
    });

    if (subs.length === 0) {
      return { sent: 0, skipped: "no_subscriptions" as const };
    }

    const title = args.title.slice(0, 120);
    const body =
      args.body.length > 500 ? `${args.body.slice(0, 497)}...` : args.body;
    const payload = JSON.stringify({
      title,
      body,
      data: { url: "/dashboard/notifications" },
    });

    let sent = 0;
    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };
      try {
        await webpush.sendNotification(pushSub, payload, { TTL: 86_400 });
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await ctx.runMutation(internal.push.removeSubscriptionByEndpoint, {
            endpoint: sub.endpoint,
          });
        }
      }
    }

    return { sent };
  },
});
