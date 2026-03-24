"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { UserPlus, Check, X, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

type RegistrationRequest = Doc<"registrationRequests">;
type StatusFilter = "pending" | "approved" | "rejected" | "all";

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: RegistrationRequest["status"]) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "approved":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function RegistrationsPage() {
  const { token } = useAuth();
  const currentUser = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");
  const [tab, setTab] = React.useState<StatusFilter>("pending");

  const listArgs = React.useMemo(() => {
    if (!token) return "skip" as const;
    if (tab === "all") return { token };
    return { token, status: tab };
  }, [token, tab]);

  const requests = useQuery(api.registrationRequests.list, listArgs);
  const pastors = useQuery(
    api.authUsers.list,
    token && currentUser?.role === "admin" ? { token, role: "pastor", isActive: true } : "skip"
  );

  const approve = useMutation(api.registrationRequests.approve);
  const reject = useMutation(api.registrationRequests.reject);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<RegistrationRequest | null>(null);

  const [approveOpen, setApproveOpen] = React.useState(false);
  const [approveTarget, setApproveTarget] = React.useState<RegistrationRequest | null>(null);
  const [overseerId, setOverseerId] = React.useState<string>("__none__");
  const [approveLoading, setApproveLoading] = React.useState(false);

  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectTarget, setRejectTarget] = React.useState<RegistrationRequest | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectLoading, setRejectLoading] = React.useState(false);

  const openDetail = (r: RegistrationRequest) => {
    setSelected(r);
    setDetailOpen(true);
  };

  const openApprove = (r: RegistrationRequest) => {
    setApproveTarget(r);
    setOverseerId("__none__");
    setApproveOpen(true);
  };

  const openReject = (r: RegistrationRequest) => {
    setRejectTarget(r);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleApprove = async () => {
    if (!token || !approveTarget) return;
    setApproveLoading(true);
    try {
      const overseer: Id<"users"> | undefined =
        currentUser?.role === "admin" && overseerId !== "__none__"
          ? (overseerId as Id<"users">)
          : undefined;
      await approve({
        token,
        requestId: approveTarget._id,
        ...(overseer !== undefined ? { overseerId: overseer } : {}),
      });
      toast.success(`${approveTarget.name} approved — shepherd account created.`);
      setApproveOpen(false);
      setApproveTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to approve";
      toast.error(msg);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token || !rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please enter a reason for rejection.");
      return;
    }
    setRejectLoading(true);
    try {
      await reject({
        token,
        requestId: rejectTarget._id,
        rejectionReason: reason,
      });
      toast.success("Registration rejected.");
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to reject";
      toast.error(msg);
    } finally {
      setRejectLoading(false);
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="space-y-4">
        <TableSkeleton rows={6} columns={5} />
      </div>
    );
  }

  if (currentUser.role !== "admin" && currentUser.role !== "pastor") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration requests</CardTitle>
          <CardDescription>You do not have access to this page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isLoading = requests === undefined;
  const rows = requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <UserPlus className="h-7 w-7 text-primary" />
          Shepherd registrations
        </h1>
        <p className="text-muted-foreground mt-1">
          Review sign-ups from the public registration form. Approving creates their shepherd
          account.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusFilter)} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 sm:gap-0">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {(["pending", "approved", "rejected", "all"] as const).map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {t === "pending" && "Awaiting your review"}
                  {t === "approved" && "Approved registrations"}
                  {t === "rejected" && "Rejected registrations"}
                  {t === "all" && "All registration requests"}
                </CardTitle>
                <CardDescription>
                  {t === "pending" &&
                    "Approve to create the account, or reject with a short explanation."}
                  {t !== "pending" && "History of processed requests (newest first)."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {tab !== t ? null : isLoading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No requests in this view.
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="hidden sm:table-cell">Phone</TableHead>
                          <TableHead className="hidden md:table-cell">Submitted</TableHead>
                          {t === "all" && <TableHead>Status</TableHead>}
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r._id}>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell className="text-muted-foreground">{r.email}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                              {r.phone ?? "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                              {formatDateTime(r.createdAt)}
                            </TableCell>
                            {t === "all" && <TableCell>{statusBadge(r.status)}</TableCell>}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => openDetail(r)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                                {r.status === "pending" && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-8 bg-emerald-600 hover:bg-emerald-700"
                                      onClick={() => openApprove(r)}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-destructive border-destructive/50 hover:bg-destructive/10"
                                      onClick={() => openReject(r)}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registration details</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Full name</dt>
                <dd className="font-medium">{selected.name}</dd>
              </div>
              {selected.preferredName && (
                <div>
                  <dt className="text-muted-foreground">Preferred name</dt>
                  <dd>{selected.preferredName}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{selected.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">WhatsApp</dt>
                <dd>{selected.whatsappNumber ?? "—"}</dd>
              </div>
              {selected.gender && (
                <div>
                  <dt className="text-muted-foreground">Gender</dt>
                  <dd className="capitalize">{selected.gender}</dd>
                </div>
              )}
              {selected.dateOfBirth != null && (
                <div>
                  <dt className="text-muted-foreground">Date of birth</dt>
                  <dd>{formatDateTime(selected.dateOfBirth)}</dd>
                </div>
              )}
              {selected.occupation && (
                <div>
                  <dt className="text-muted-foreground">Occupation</dt>
                  <dd>{selected.occupation}</dd>
                </div>
              )}
              {selected.homeAddress && (
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd>{selected.homeAddress}</dd>
                </div>
              )}
              {selected.notes && (
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{selected.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{statusBadge(selected.status)}</dd>
              </div>
              {selected.status === "rejected" && selected.rejectionReason && (
                <div>
                  <dt className="text-muted-foreground">Rejection reason</dt>
                  <dd className="whitespace-pre-wrap">{selected.rejectionReason}</dd>
                </div>
              )}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve shepherd</DialogTitle>
            <DialogDescription>
              {approveTarget && (
                <>
                  Create an active shepherd account for <strong>{approveTarget.name}</strong> (
                  {approveTarget.email}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {currentUser?.role === "admin" && (
            <div className="space-y-2 py-2">
              <Label htmlFor="overseer">Assign to pastor (optional)</Label>
              <Select value={overseerId} onValueChange={setOverseerId}>
                <SelectTrigger id="overseer">
                  <SelectValue placeholder="No pastor assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No pastor assigned</SelectItem>
                  {(pastors ?? []).map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You can leave this empty or assign a pastor later from Shepherds.
              </p>
            </div>
          )}
          {currentUser?.role === "pastor" && (
            <p className="text-sm text-muted-foreground">
              This shepherd will be assigned to you as their overseer.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={approveLoading}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={approveLoading}
            >
              {approveLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving…
                </>
              ) : (
                "Confirm approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              {rejectTarget && (
                <>
                  The applicant will not get an account. Explain briefly why (they may see this in
                  notifications).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. We do not have a vacancy in your area."
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejectLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectLoading}>
              {rejectLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting…
                </>
              ) : (
                "Reject request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
