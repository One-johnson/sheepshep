"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function SwUpdatePrompt() {
  const [show, setShow] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShow(true);
          }
        });
      });
    });

    // Handle controller change (page not refreshed after update)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      setShow(false);
    });
  }, []);

  const handleRefresh = () => {
    setShow(false);
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    let done = false;
    const reload = () => {
      if (done) return;
      done = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    setTimeout(reload, 2000);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Update available"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-lg border bg-card p-4 shadow-lg sm:left-auto sm:right-4"
    >
      <div className="flex items-center gap-3">
        <RefreshCw className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Update available</p>
          <p className="text-sm text-muted-foreground">Refresh to get the latest version.</p>
        </div>
        <Button size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
