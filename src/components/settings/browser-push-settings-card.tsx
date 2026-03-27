"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";

const SW_READY_TIMEOUT_MS = 10_000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getServiceWorkerRegistration(timeoutMs = SW_READY_TIMEOUT_MS): Promise<ServiceWorkerRegistration> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service worker is not supported in this browser");
  }

  const waitForActivation = (registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> => {
    if (registration.active) return Promise.resolve(registration);

    const worker = registration.installing ?? registration.waiting;
    if (!worker) {
      return Promise.reject(new Error("no_active_service_worker"));
    }

    return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("service_worker_timeout"));
      }, timeoutMs);

      const finish = () => {
        window.clearTimeout(timer);
        if (registration.active) resolve(registration);
        else reject(new Error("no_active_service_worker"));
      };

      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") finish();
      });

      if (worker.state === "activated") finish();
    });
  };

  const readyWithTimeout = Promise.race<ServiceWorkerRegistration>([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) =>
      window.setTimeout(() => reject(new Error("service_worker_timeout")), timeoutMs)
    ),
  ]);

  try {
    return await readyWithTimeout;
  } catch {
    // Fallback path for mobile clients where ready can hang.
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return waitForActivation(existing);

    const registered = await navigator.serviceWorker.register("/sw.js");
    return waitForActivation(registered);
  }
}

export function BrowserPushSettingsCard(): React.JSX.Element | null {
  const { token } = useAuth();
  const vapid = useQuery(api.push.getVapidPublicKey);
  const registerSubscription = useMutation(api.push.registerSubscription);
  const unregisterSubscription = useMutation(api.push.unregisterSubscription);
  const [busy, setBusy] = React.useState(false);
  const [browserSubscribed, setBrowserSubscribed] = React.useState<boolean | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  React.useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void getServiceWorkerRegistration().then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!cancelled) setBrowserSubscribed(!!sub);
      });
    }).catch(() => {
      if (!cancelled) setBrowserSubscribed(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  if (!supported) {
    return null;
  }

  if (vapid === undefined) {
    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push notifications
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!vapid.publicKey) {
    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push notifications
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Set <code className="text-xs">VAPID_PUBLIC_KEY</code>,{" "}
            <code className="text-xs">VAPID_PRIVATE_KEY</code>, and optionally{" "}
            <code className="text-xs">VAPID_SUBJECT</code> (e.g. mailto:you@yourdomain.com) in the
            Convex dashboard under Environment Variables, then deploy. Users can enable alerts on
            each device from here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const enable = async () => {
    if (!token) {
      toast.error("Sign in to enable push notifications");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission was not granted");
        return;
      }
      const reg = await getServiceWorkerRegistration();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey!) as BufferSource,
        });
      }
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Could not read push subscription");
      }
      await registerSubscription({
        token,
        subscription: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
      });
      setBrowserSubscribed(true);
      toast.success("Push notifications enabled on this device");
    } catch (e) {
      const message =
        e instanceof Error && e.message === "service_worker_timeout"
          ? "Timed out waiting for service worker. Reopen the app and try again."
          : e instanceof Error && e.message === "no_active_service_worker"
            ? "Service worker is still starting. Wait a few seconds and try again."
            : e instanceof Error
              ? e.message
              : "Could not enable push notifications";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const reg = await getServiceWorkerRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unregisterSubscription({ token, endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setBrowserSubscribed(false);
      toast.success("Push notifications disabled on this device");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disable push notifications");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push notifications
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Receive alerts on this phone or computer when the app is closed or in the background
          (browser or installed PWA). Requires permission and a secure context (HTTPS).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {browserSubscribed ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void disable()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Turn off push on this device"}
          </Button>
        ) : (
          <Button type="button" disabled={busy || !token} onClick={() => void enable()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Turn on push on this device"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
