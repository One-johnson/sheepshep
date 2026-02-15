"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, ValidationError } from "@formspree/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, Settings2, MessageSquare } from "lucide-react";

const FORM_ID = process.env.NEXT_PUBLIC_FORMSPREE_SUPPORT_FORM_ID;

export function SupportForm() {
  const [subject, setSubject] = React.useState("");
  const [state, handleSubmit] = useForm(FORM_ID || "");

  if (!FORM_ID) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Settings2 className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Support form is not configured</p>
              <p className="text-muted-foreground mt-1">
                Add <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_FORMSPREE_SUPPORT_FORM_ID</code> to your environment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.succeeded) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg border bg-muted/50 p-6 text-center"
        >
          <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-400 mb-3" />
          <p className="font-medium">Thank you for your message.</p>
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ll get back to you as soon as we can.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Submit another
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Your name" />
          <ValidationError prefix="Name" field="name" errors={state.errors} className="text-sm text-destructive" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" name="email" required placeholder="you@example.com" />
          <ValidationError prefix="Email" field="email" errors={state.errors} className="text-sm text-destructive" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger id="subject">
            <SelectValue placeholder="Select a topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="General">General</SelectItem>
            <SelectItem value="Technical issue">Technical issue</SelectItem>
            <SelectItem value="Billing">Billing</SelectItem>
            <SelectItem value="Feature request">Feature request</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="subject" value={subject} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          placeholder="Describe your question or issue. A few details help us respond faster."
          rows={6}
          className="min-h-[140px]"
        />
        <ValidationError prefix="Message" field="message" errors={state.errors} className="text-sm text-destructive" />
      </div>
      <ValidationError errors={state.errors} className="text-sm text-destructive" />
      <Button type="submit" disabled={state.submitting} className="w-full sm:w-auto">
        {state.submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
