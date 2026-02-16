"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Plus,
  ChevronDown,
  ChevronRight,
  UserRound,
  Trash2,
  Loader2,
  Pencil,
  Users,
  Link2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const BADGE_COLORS = [
  { value: "blue", label: "Blue", class: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  { value: "green", label: "Green", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { value: "red", label: "Red", class: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
  { value: "amber", label: "Amber", class: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { value: "orange", label: "Orange", class: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  { value: "violet", label: "Violet", class: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
  { value: "slate", label: "Slate", class: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
] as const;

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

function ShepherdAvatar({
  shepherdId,
  profilePhotoId,
  name,
  token,
}: {
  shepherdId: Id<"users">;
  profilePhotoId?: Id<"_storage">;
  name: string;
  token: string | null;
}) {
  const url = useQuery(
    api.storage.getFileUrl,
    token && profilePhotoId ? { token, storageId: profilePhotoId } : "skip"
  );
  return (
    <Avatar className="h-12 w-12">
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback className="text-sm">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function MemberListItem({
  member,
  token,
}: {
  member: { _id: Id<"members">; preferredName?: string; firstName: string; lastName: string; profilePhotoId?: Id<"_storage"> };
  token: string | null;
}) {
  const memberPhotoUrl = useQuery(
    api.storage.getFileUrl,
    token && member.profilePhotoId ? { token, storageId: member.profilePhotoId } : "skip"
  );
  return (
    <li className="flex items-center gap-2 text-sm">
      <Avatar className="h-8 w-8">
        {memberPhotoUrl ? (
          <AvatarImage src={memberPhotoUrl} alt={`${member.preferredName || member.firstName} ${member.lastName}`} />
        ) : null}
        <AvatarFallback className="text-xs">
          {((member.preferredName || member.firstName)?.[0] || "").toUpperCase()}
          {(member.lastName?.[0] || "").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-muted-foreground">
        {member.preferredName || member.firstName} {member.lastName}
      </span>
    </li>
  );
}

export default function RegionsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const regionsWithDetails = useQuery(
    api.regions.listRegionsWithDetails,
    token ? { token } : "skip"
  );
  const pastors = useQuery(api.userAssignments.getPastors, token ? { token } : "skip");
  const shepherds = useQuery(api.attendance.getShepherds, token ? { token } : "skip");
  const createRegionMut = useMutation(api.regions.createRegion);
  const updateRegionMut = useMutation(api.regions.updateRegion);
  const deleteRegionMut = useMutation(api.regions.deleteRegion);
  const createBacentaMut = useMutation(api.regions.createBacenta);
  const updateBacentaMut = useMutation(api.regions.updateBacenta);
  const deleteBacentaMut = useMutation(api.regions.deleteBacenta);
  const assignShepherdsToBacentaMut = useMutation(api.regions.assignShepherdsToBacenta);
  const setBacentaShepherdsMut = useMutation(api.regions.setBacentaShepherds);

  const [addRegionOpen, setAddRegionOpen] = React.useState(false);
  const [newRegionName, setNewRegionName] = React.useState("");
  const [newRegionColor, setNewRegionColor] = React.useState<string>("blue");
  const [expandedRegion, setExpandedRegion] = React.useState<Id<"regions"> | null>(null);
  const [bacentaNameByRegion, setBacentaNameByRegion] = React.useState<Record<string, string>>({});
  const [bacentaAreaByRegion, setBacentaAreaByRegion] = React.useState<Record<string, string>>({});
  const [bacentaMeetingDayByRegion, setBacentaMeetingDayByRegion] = React.useState<
    Record<string, number | "">
  >({});
  const [bacentaShepherdIdsByRegion, setBacentaShepherdIdsByRegion] = React.useState<
    Record<string, Id<"users">[]>
  >({});
  const [loading, setLoading] = React.useState<string | null>(null);

  const [editRegionId, setEditRegionId] = React.useState<Id<"regions"> | null>(null);
  const [editRegionName, setEditRegionName] = React.useState("");
  const [editRegionColor, setEditRegionColor] = React.useState<string>("blue");
  const [deleteRegionId, setDeleteRegionId] = React.useState<Id<"regions"> | null>(null);

  const [editBacenta, setEditBacenta] = React.useState<{
    id: Id<"bacentas">;
    name: string;
    area: string;
    meetingDay: number | "";
    shepherdIds: Id<"users">[];
  } | null>(null);
  // Get shepherds for the bacenta being edited
  const shepherdsForEditBacenta = useQuery(
    api.regions.getShepherdsForBacenta,
    token && editBacenta ? { token, bacentaId: editBacenta.id } : "skip"
  );
  const [bacentaDetailId, setBacentaDetailId] = React.useState<Id<"bacentas"> | null>(null);
  const [deleteBacentaId, setDeleteBacentaId] = React.useState<Id<"bacentas"> | null>(null);

  const handleAddRegion = async () => {
    if (!token || !newRegionName.trim()) return;
    setLoading("region");
    try {
      await createRegionMut({ token, name: newRegionName.trim(), badgeColor: newRegionColor });
      toast.success("Region added");
      setNewRegionName("");
      setNewRegionColor("blue");
      setAddRegionOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to add region");
    } finally {
      setLoading(null);
    }
  };

  const handleEditRegion = (r: { _id: Id<"regions">; name: string; badgeColor?: string }) => {
    setEditRegionId(r._id);
    setEditRegionName(r.name);
    setEditRegionColor(r.badgeColor ?? "blue");
  };

  const handleSaveEditRegion = async () => {
    if (!token || !editRegionId) return;
    setLoading(editRegionId);
    try {
      await updateRegionMut({
        token,
        regionId: editRegionId,
        name: editRegionName.trim(),
        badgeColor: editRegionColor,
      });
      toast.success("Region updated");
      setEditRegionId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update region");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteRegion = async () => {
    if (!token || !deleteRegionId) return;
    setLoading(deleteRegionId);
    try {
      await deleteRegionMut({ token, regionId: deleteRegionId });
      toast.success("Region deleted");
      setDeleteRegionId(null);
      setExpandedRegion(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete region");
    } finally {
      setLoading(null);
    }
  };

  const handleAssignPastor = async (regionId: Id<"regions">, pastorId: string | null) => {
    if (!token) return;
    setLoading(regionId);
    try {
      await updateRegionMut({
        token,
        regionId,
        pastorId: pastorId && pastorId !== "none" ? (pastorId as Id<"users">) : null,
      });
      toast.success("Pastor assigned");
    } catch (e: any) {
      toast.error(e.message || "Failed to assign pastor");
    } finally {
      setLoading(null);
    }
  };

  const handleAddBacenta = async (regionId: Id<"regions">) => {
    const name = bacentaNameByRegion[regionId]?.trim();
    if (!token || !name) return;
    setLoading(`bacenta-${regionId}`);
    try {
      const meetingDay = bacentaMeetingDayByRegion[regionId];
      const bacentaId = await createBacentaMut({
        token,
        regionId,
        name,
        area: bacentaAreaByRegion[regionId]?.trim() || undefined,
        meetingDay: meetingDay === "" || meetingDay === undefined ? undefined : meetingDay,
      });

      // Assign selected shepherds to the new bacenta
      const selectedShepherdIds = bacentaShepherdIdsByRegion[regionId] || [];
      if (selectedShepherdIds.length > 0 && token) {
        await assignShepherdsToBacentaMut({
          token,
          bacentaId,
          shepherdIds: selectedShepherdIds,
        });
      }

      toast.success("Bacenta added");
      setBacentaNameByRegion((prev) => ({ ...prev, [regionId]: "" }));
      setBacentaAreaByRegion((prev) => ({ ...prev, [regionId]: "" }));
      setBacentaMeetingDayByRegion((prev) => ({ ...prev, [regionId]: "" }));
      setBacentaShepherdIdsByRegion((prev) => ({ ...prev, [regionId]: [] }));
    } catch (e: any) {
      toast.error(e.message || "Failed to add bacenta");
    } finally {
      setLoading(null);
    }
  };

  const handleEditBacenta = async (b: { _id: Id<"bacentas">; name: string; area?: string; meetingDay?: number }) => {
    if (!token) return;
    // Fetch current shepherds for this bacenta
    try {
      const currentShepherds = await new Promise<Id<"users">[]>((resolve) => {
        // We'll set the state first, then the query will run
        setEditBacenta({
          id: b._id,
          name: b.name,
          area: b.area ?? "",
          meetingDay: b.meetingDay ?? "",
          shepherdIds: [], // Will be populated by query
        });
        resolve([]);
      });
    } catch (e) {
      setEditBacenta({
        id: b._id,
        name: b.name,
        area: b.area ?? "",
        meetingDay: b.meetingDay ?? "",
        shepherdIds: [],
      });
    }
  };

  const handleSaveEditBacenta = async () => {
    if (!token || !editBacenta) return;
    setLoading(editBacenta.id);
    try {
      await updateBacentaMut({
        token,
        bacentaId: editBacenta.id,
        name: editBacenta.name,
        area: editBacenta.area.trim() || undefined,
        meetingDay: editBacenta.meetingDay === "" ? undefined : editBacenta.meetingDay,
      });
      
      // Update shepherd assignments - replace all shepherds for this bacenta
      await setBacentaShepherdsMut({
        token,
        bacentaId: editBacenta.id,
        shepherdIds: editBacenta.shepherdIds,
      });
      
      toast.success("Bacenta updated");
      setEditBacenta(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to update bacenta");
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteBacenta = async () => {
    if (!token || !deleteBacentaId) return;
    setLoading(deleteBacentaId);
    try {
      await deleteBacentaMut({ token, bacentaId: deleteBacentaId });
      toast.success("Bacenta removed");
      setDeleteBacentaId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove bacenta");
    } finally {
      setLoading(null);
    }
  };

  if (regionsWithDetails === undefined) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Regions & Bacentas
          </h1>
          <p className="text-muted-foreground">
            Add regions, then add bacentas to each region and assign a pastor per region.
          </p>
        </div>
        <Dialog open={addRegionOpen} onOpenChange={setAddRegionOpen}>
          <Button onClick={() => setAddRegionOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Region
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Region</DialogTitle>
              <DialogDescription>Create a new region with an optional color badge.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Region name</Label>
                <Input
                  placeholder="e.g. North District"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Badge color</Label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewRegionColor(c.value)}
                      className={`rounded-full border-2 px-3 py-1 text-xs font-medium transition ${c.class} ${
                        newRegionColor === c.value ? "ring-2 ring-offset-2 ring-primary" : ""
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddRegionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRegion} disabled={!newRegionName.trim() || loading !== null}>
                  {loading === "region" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Region
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Region Dialog */}
      <Dialog open={!!editRegionId} onOpenChange={(open) => !open && setEditRegionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editRegionName} onChange={(e) => setEditRegionName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Badge color</Label>
              <div className="flex flex-wrap gap-2">
                {BADGE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditRegionColor(c.value)}
                    className={`rounded-full border-2 px-3 py-1 text-xs font-medium transition ${c.class} ${
                      editRegionColor === c.value ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditRegionId(null)}>Cancel</Button>
              <Button onClick={handleSaveEditRegion} disabled={loading !== null}>
                {loading === editRegionId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Region Confirm */}
      <AlertDialog open={!!deleteRegionId} onOpenChange={(open) => !open && setDeleteRegionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete region?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the region and all its bacentas. Shepherd assignments to those bacentas will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRegion} className="bg-destructive text-destructive-foreground">
              {loading === deleteRegionId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Bacenta Dialog */}
      <Dialog open={!!editBacenta} onOpenChange={(open) => !open && setEditBacenta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bacenta</DialogTitle>
          </DialogHeader>
          {editBacenta && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editBacenta.name} onChange={(e) => setEditBacenta((p) => p && { ...p, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={editBacenta.area} onChange={(e) => setEditBacenta((p) => p && { ...p, area: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Meeting day</Label>
                <Select
                  value={editBacenta.meetingDay === "" ? "none" : String(editBacenta.meetingDay)}
                  onValueChange={(v) =>
                    setEditBacenta((p) =>
                      p ? { ...p, meetingDay: v === "none" ? "" : (Number(v) as number) } : null
                    )
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {shepherds && shepherds.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign shepherds</Label>
                  <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                    {shepherds.map((shepherd) => {
                      const isSelected = editBacenta.shepherdIds.includes(shepherd._id);
                      return (
                        <div key={shepherd._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-shepherd-${shepherd._id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              setEditBacenta((p) =>
                                p
                                  ? {
                                      ...p,
                                      shepherdIds: checked
                                        ? [...p.shepherdIds, shepherd._id]
                                        : p.shepherdIds.filter((id) => id !== shepherd._id),
                                    }
                                  : null
                              );
                            }}
                          />
                          <ShepherdAvatar
                            shepherdId={shepherd._id}
                            profilePhotoId={shepherd.profilePhotoId}
                            name={shepherd.name}
                            token={token}
                          />
                          <label
                            htmlFor={`edit-shepherd-${shepherd._id}`}
                            className="text-sm font-medium leading-none cursor-pointer flex-1"
                          >
                            {shepherd.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditBacenta(null)}>Cancel</Button>
                <Button onClick={handleSaveEditBacenta} disabled={loading !== null}>
                  {loading === editBacenta.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Bacenta Confirm */}
      <AlertDialog open={!!deleteBacentaId} onOpenChange={(open) => !open && setDeleteBacentaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bacenta?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the bacenta and its shepherd assignments. Members are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBacenta} className="bg-destructive text-destructive-foreground">
              {loading === deleteBacentaId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bacenta Detail Dialog (shepherds + members) */}
      <BacentaDetailDialog
        bacentaId={bacentaDetailId}
        token={token}
        onOpenChange={(open) => !open && setBacentaDetailId(null)}
        days={DAYS}
      />

      {regionsWithDetails.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No regions yet. Click &quot;Add Region&quot; to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {regionsWithDetails.map((r) => {
            const badgeStyle = BADGE_COLORS.find((c) => c.value === (r.badgeColor ?? "slate")) ?? BADGE_COLORS[5];
            return (
              <Card key={r._id}>
                <Collapsible
                  open={expandedRegion === r._id}
                  onOpenChange={(open) => setExpandedRegion(open ? r._id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {expandedRegion === r._id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <CardTitle className="text-lg">{r.name}</CardTitle>
                          <Badge variant="outline" className={badgeStyle.class}>
                            {BADGE_COLORS.find((c) => c.value === (r.badgeColor ?? "slate"))?.label ?? "Slate"}
                          </Badge>
                          {r.pastor && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <UserRound className="h-3 w-3" />
                              Pastor: {r.pastor.name}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditRegion(r);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteRegionId(r._id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{r.bacentas.length} bacenta(s)</Badge>
                          <Badge variant="secondary">{r.totalShepherds ?? 0} shepherd(s)</Badge>
                          <Badge variant="secondary">{r.totalMembers ?? 0} member(s)</Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Assign pastor to this region</Label>
                          <Select
                            value={r.pastorId ?? "none"}
                            onValueChange={(v) => handleAssignPastor(r._id, v)}
                            disabled={loading === r._id}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="Select pastor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No pastor</SelectItem>
                              {pastors?.map((p) => (
                                <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Bacentas in this region</Label>
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <Input
                              placeholder="Bacenta name"
                              className="w-40"
                              value={bacentaNameByRegion[r._id] ?? ""}
                              onChange={(e) =>
                                setBacentaNameByRegion((prev) => ({ ...prev, [r._id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddBacenta(r._id);
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Area</Label>
                            <Input
                              placeholder="Area"
                              className="w-32"
                              value={bacentaAreaByRegion[r._id] ?? ""}
                              onChange={(e) =>
                                setBacentaAreaByRegion((prev) => ({ ...prev, [r._id]: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Meeting day</Label>
                            <Select
                              value={
                                bacentaMeetingDayByRegion[r._id] === "" ||
                                bacentaMeetingDayByRegion[r._id] === undefined
                                  ? "none"
                                  : String(bacentaMeetingDayByRegion[r._id])
                              }
                              onValueChange={(v) =>
                                setBacentaMeetingDayByRegion((prev) => ({
                                  ...prev,
                                  [r._id]: v === "none" ? "" : (Number(v) as 0 | 1 | 2 | 3 | 4 | 5 | 6),
                                }))
                              }
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="Day" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {DAYS.map((d) => (
                                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddBacenta(r._id)}
                            disabled={
                              !(bacentaNameByRegion[r._id]?.trim()) || loading === `bacenta-${r._id}`
                            }
                          >
                            {loading === `bacenta-${r._id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="mr-1 h-4 w-4" />
                                Add Bacenta
                              </>
                            )}
                          </Button>
                        </div>
                        {shepherds && shepherds.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <Label className="text-xs text-muted-foreground">Assign shepherds (optional)</Label>
                            <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                              {shepherds.map((shepherd) => {
                                const selectedIds = bacentaShepherdIdsByRegion[r._id] || [];
                                const isSelected = selectedIds.includes(shepherd._id);
                                return (
                                  <div key={shepherd._id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`shepherd-${r._id}-${shepherd._id}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        setBacentaShepherdIdsByRegion((prev) => {
                                          const current = prev[r._id] || [];
                                          return {
                                            ...prev,
                                            [r._id]: checked
                                              ? [...current, shepherd._id]
                                              : current.filter((id) => id !== shepherd._id),
                                          };
                                        });
                                      }}
                                    />
                                    <label
                                      htmlFor={`shepherd-${r._id}-${shepherd._id}`}
                                      className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                      {shepherd.name}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <ul className="list-none space-y-1 mt-2">
                          {r.bacentas.map((b) => (
                            <li key={b._id} className="flex items-center gap-2 group">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-left font-medium text-primary hover:underline"
                                onClick={() => setBacentaDetailId(b._id)}
                              >
                                <Link2 className="h-3 w-3 shrink-0" />
                                {b.name}
                                {b.area && (
                                  <span className="text-muted-foreground font-normal text-sm">({b.area})</span>
                                )}
                                {b.meetingDay !== undefined && (
                                  <span className="text-muted-foreground font-normal text-sm">
                                    · {DAYS[b.meetingDay]?.label ?? "Day " + b.meetingDay}
                                  </span>
                                )}
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                onClick={() => handleEditBacenta(b)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                                onClick={() => setDeleteBacentaId(b._id)}
                                disabled={loading === b._id}
                              >
                                {loading === b._id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </li>
                          ))}
                          {r.bacentas.length === 0 && (
                            <li className="text-muted-foreground">No bacentas yet.</li>
                          )}
                        </ul>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BacentaDetailDialog({
  bacentaId,
  token,
  onOpenChange,
  days,
}: {
  bacentaId: Id<"bacentas"> | null;
  token: string | null;
  onOpenChange: (open: boolean) => void;
  days: readonly { value: number; label: string }[];
}) {
  const data = useQuery(
    api.regions.getBacentaShepherdsAndMembers,
    token && bacentaId ? { token, bacentaId } : "skip"
  );

  return (
    <Dialog open={!!bacentaId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {data?.bacenta ? (
              <>
                {data.bacenta.name}
                {data.bacenta.area && (
                  <span className="text-muted-foreground font-normal">({data.bacenta.area})</span>
                )}
                {data.bacenta.meetingDay !== undefined && (
                  <span className="text-muted-foreground font-normal text-sm">
                    · {days[data.bacenta.meetingDay]?.label}
                  </span>
                )}
              </>
            ) : (
              "Bacenta"
            )}
          </DialogTitle>
          <DialogDescription>
            Shepherds assigned to this bacenta and their members
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          {data === undefined ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.shepherdsWithMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No shepherds assigned to this bacenta.</p>
          ) : (
            <div className="space-y-6">
              {data.shepherdsWithMembers.map(({ shepherd, members }) => (
                <div key={shepherd._id} className="space-y-3">
                  <div className="flex flex-col items-center gap-2">
                    <ShepherdAvatar
                      shepherdId={shepherd._id}
                      profilePhotoId={shepherd.profilePhotoId}
                      name={shepherd.name}
                      token={token}
                    />
                    <div className="text-center">
                      <p className="font-medium">{shepherd.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {members.length} member{members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <MemberListItem key={m._id} member={m} token={token} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
