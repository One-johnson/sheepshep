"use client";

import * as React from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { AuthBranding } from "@/components/auth/auth-branding";

interface AuthLayoutProps {
  children: React.ReactNode;
  scripture?: { verse: string; reference: string };
}

export function AuthLayout({ children, scripture }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="fixed top-4 left-4 z-50">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      {children}
      <AuthBranding scripture={scripture} />
    </div>
  );
}
