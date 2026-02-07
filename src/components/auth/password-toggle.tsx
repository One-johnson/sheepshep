"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PasswordToggleProps {
  show: boolean;
  onToggle: () => void;
  className?: string;
}

export function PasswordToggle({ show, onToggle, className }: PasswordToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onToggle}
      className={cn("absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6", className)}
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Eye className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
