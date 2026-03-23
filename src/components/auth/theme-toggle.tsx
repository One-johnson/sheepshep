"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the same button structure so server and client match (avoids hydration mismatch).
  // Icon is the only thing that can differ; use a neutral placeholder until mounted.
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => mounted && setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {!mounted ? (
        <span className="h-4 w-4" aria-hidden />
      ) : theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
