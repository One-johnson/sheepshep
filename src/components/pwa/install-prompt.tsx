"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const DISMISS_KEY = "sheepshep-install-prompt-dismissed";
const DISMISS_DAYS = 7;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // @ts-expect-error - standalone exists on iOS Safari
  const standalone = window.navigator.standalone;
  const displayMode = window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(standalone || displayMode);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function wasDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const t = Number(raw);
    return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (wasDismissed()) return;

    const isIos = isIOS();
    setIsIOSDevice(isIos);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);
    // On iOS there is no beforeinstallprompt; show prompt once after a short delay if not standalone
    if (isIos) {
      const t = setTimeout(() => setShow(true), 2000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler as EventListener);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShow(false);
      setDeferredPrompt(null);
    }
    setDismissed();
    setShow(false);
  };

  const handleDismiss = () => {
    setDismissed();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-lg border bg-card p-4 shadow-lg sm:left-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Install SheepShep</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isIOSDevice
              ? "Add to Home Screen for quick access: tap Share, then “Add to Home Screen”."
              : "Add to your home screen for a better experience."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {!isIOSDevice && deferredPrompt && (
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleDismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
