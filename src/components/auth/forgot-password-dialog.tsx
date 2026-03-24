"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: ForgotPasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p>
                Password reset is not available by email at this time. To reset
                your password, please contact your administrator or pastor.
              </p>
              <p className="text-sm text-muted-foreground">
                Admins can reset passwords for shepherd and pastor accounts from
                the dashboard. The first admin cannot be reset from the UI. If
                you host the app yourself, you can set a user&apos;s password
                with the Convex CLI mutation{" "}
                <span className="font-mono text-[0.7rem]">
                  auth:setPasswordByEmailDev
                </span>{" "}
                (see convex/auth.ts).
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
