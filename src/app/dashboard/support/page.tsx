"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupportForm } from "@/components/support/support-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { HelpCircle, ArrowLeft, Clock, Mail, Building2 } from "lucide-react";

export default function SupportPage() {
  const router = useRouter();
  const { token } = useAuth();
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  React.useEffect(() => {
    if (currentUser === undefined) return;
    if (!token || !currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role !== "admin") {
      router.push("/dashboard");
    }
  }, [currentUser, token, router]);

  if (currentUser === undefined || (currentUser && currentUser.role !== "admin")) {
    return (
      <div className="p-4 md:p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full max-w-md mb-6" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="md:hidden shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">Support</h1>
                <Badge variant="secondary" className="font-normal">Admin</Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-0.5">
                Get help with SheepShep. Send us a message and we&apos;ll get back to you.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator className="md:hidden" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Quick info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                SheepShep is built by <span className="font-medium text-foreground">FlowRiver Technologies</span>.
              </p>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">
                  We usually respond within <strong className="text-foreground">24–48 hours</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">
                  support@sheepshep.com
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle>Contact support</CardTitle>
              <CardDescription>
                Describe your question or issue and we&apos;ll respond as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupportForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
