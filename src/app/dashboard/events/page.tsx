"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfDay,
} from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/contexts/auth-context";
import {
  Calendar,
  LayoutGrid,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  CalendarDays,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const EVENT_TYPES = [
  { value: "prayer_meeting", label: "Prayer Meeting" },
  { value: "evangelism", label: "Evangelism" },
  { value: "bible_study", label: "Bible Study" },
  { value: "worship", label: "Worship" },
  { value: "conference", label: "Conference" },
  { value: "outreach", label: "Outreach" },
  { value: "other", label: "Other" },
] as const;

type EventType = (typeof EVENT_TYPES)[number]["value"];

const EVENT_TYPE_COLORS: Record<
  EventType,
  { bg: string; text: string; border: string; label: string }
> = {
  prayer_meeting: {
    bg: "bg-violet-500/20",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/50",
    label: "Violet",
  },
  evangelism: {
    bg: "bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/50",
    label: "Rose",
  },
  bible_study: {
    bg: "bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/50",
    label: "Blue",
  },
  worship: {
    bg: "bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/50",
    label: "Amber",
  },
  conference: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/50",
    label: "Emerald",
  },
  outreach: {
    bg: "bg-sky-500/20",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/50",
    label: "Sky",
  },
  other: {
    bg: "bg-slate-500/20",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/50",
    label: "Slate",
  },
};

const EVENT_STATUSES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "postponed", label: "Postponed" },
] as const;

type EventStatus = (typeof EVENT_STATUSES)[number]["value"];

const STATUS_COLORS: Record<
  EventStatus,
  { bg: string; text: string; border: string }
> = {
  upcoming: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/50",
  },
  completed: {
    bg: "bg-slate-500/20",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/50",
  },
  cancelled: {
    bg: "bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/50",
  },
  postponed: {
    bg: "bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/50",
  },
};

function formatEventType(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value.replace(/_/g, " ");
}

function formatEventStatus(value: string | undefined): string {
  if (!value) return "Upcoming";
  return EVENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

type EventRecord = {
  _id: Id<"events">;
  title: string;
  description?: string;
  eventType: EventType;
  status?: EventStatus;
  startDate: number;
  endDate?: number;
  location?: string;
  isActive: boolean;
};

function EventDetailContent({
  event: e,
  isAdmin,
  onEdit,
  onDelete,
  compact = false,
}: {
  event: EventRecord;
  isAdmin: boolean;
  onEdit: (e: EventRecord) => void;
  onDelete: (id: Id<"events">) => void;
  compact?: boolean;
}) {
  const typeColors = EVENT_TYPE_COLORS[e.eventType as EventType];
  const statusColors = STATUS_COLORS[(e.status ?? "upcoming") as EventStatus];
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>{e.title}</p>
        <Badge
          variant="outline"
          className={`shrink-0 ${statusColors?.bg ?? ""} ${statusColors?.text ?? ""} ${statusColors?.border ?? ""}`}
        >
          {formatEventStatus(e.status)}
        </Badge>
      </div>
      <Badge
        variant="outline"
        className={`w-fit ${typeColors?.bg ?? ""} ${typeColors?.text ?? ""} ${typeColors?.border ?? ""}`}
      >
        {formatEventType(e.eventType)}
      </Badge>
      <div className={`flex items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {format(new Date(e.startDate), "MMM d, yyyy · h:mm a")}
        {e.endDate && ` – ${format(new Date(e.endDate), "h:mm a")}`}
      </div>
      {e.location && (
        <div className={`flex items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {e.location}
        </div>
      )}
      {e.description && (
        <p className={`text-muted-foreground line-clamp-3 ${compact ? "text-xs" : "text-sm"}`}>{e.description}</p>
      )}
      {isAdmin && !compact && (
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(e)}>
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => onDelete(e._id)}>
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const { token } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"table" | "card" | "calendar">("calendar");
  const [calendarMonth, setCalendarMonth] = React.useState(() => new Date());
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<Id<"events"> | null>(null);
  const [deleteId, setDeleteId] = React.useState<Id<"events"> | null>(null);
  const [detailDialogEvent, setDetailDialogEvent] = React.useState<EventRecord | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventType, setEventType] = React.useState<EventType>("prayer_meeting");
  const [status, setStatus] = React.useState<EventStatus>("upcoming");
  const [startDate, setStartDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endDate, setEndDate] = React.useState("");
  const [endTime, setEndTime] = React.useState("10:00");
  const [location, setLocation] = React.useState("");

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const listener = () => setIsMobile(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const currentUser = useQuery(api.auth.getCurrentUser, token ? { token } : "skip");
  const stats = useQuery(api.events.getStats, token ? { token } : "skip");
  const events = useQuery(api.events.list, token ? { token, isActive: true } : "skip");

  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const removeEvent = useMutation(api.events.remove);

  const isAdmin = currentUser?.role === "admin";

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventType("prayer_meeting");
    setStatus("upcoming");
    setStartDate("");
    setStartTime("09:00");
    setEndDate("");
    setEndTime("10:00");
    setLocation("");
    setEditId(null);
  };

  const openEdit = (e: EventRecord) => {
    setEditId(e._id);
    setTitle(e.title);
    setDescription(e.description ?? "");
    setEventType(e.eventType);
    setStatus((e.status ?? "upcoming") as EventStatus);
    const start = new Date(e.startDate);
    setStartDate(format(start, "yyyy-MM-dd"));
    setStartTime(format(start, "HH:mm"));
    if (e.endDate) {
      const end = new Date(e.endDate);
      setEndDate(format(end, "yyyy-MM-dd"));
      setEndTime(format(end, "HH:mm"));
    } else {
      setEndDate("");
      setEndTime("10:00");
    }
    setLocation(e.location ?? "");
  };

  const toTimestamp = (dateStr: string, timeStr: string) => {
    if (!dateStr) return 0;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime();
  };

  const handleCreate = async () => {
    if (!token || !title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const startTs = toTimestamp(startDate, startTime);
    if (!startTs) {
      toast.error("Please enter a start date");
      return;
    }
    const endTs = endDate ? toTimestamp(endDate, endTime) : undefined;
    try {
      await createEvent({
        token,
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        status,
        startDate: startTs,
        endDate: endTs,
        location: location.trim() || undefined,
      });
      toast.success("Event created");
      setCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    }
  };

  const handleUpdate = async () => {
    if (!token || !editId || !title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const startTs = toTimestamp(startDate, startTime);
    if (!startTs) {
      toast.error("Please enter a start date");
      return;
    }
    const endTs = endDate ? toTimestamp(endDate, endTime) : undefined;
    try {
      await updateEvent({
        token,
        eventId: editId,
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        status,
        startDate: startTs,
        endDate: endTs,
        location: location.trim() || undefined,
      });
      toast.success("Event updated");
      setEditId(null);
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update event");
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    try {
      await removeEvent({ token, eventId: deleteId });
      toast.success("Event removed");
      setDeleteId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove event");
    }
  };

  const calendarDays = React.useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const calendarStartPad = React.useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const day = start.getDay();
    return Array.from({ length: day }, (_, i) => null);
  }, [calendarMonth]);

  const eventsByDay = React.useMemo(() => {
    if (!events) return new Map<string, typeof events>();
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const dayStart = startOfDay(e.startDate);
      const key = format(dayStart, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  if (!isClient || !token) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Create and manage church events. Pastors and shepherds see the calendar."
              : "View upcoming church events"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {!isAdmin && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Calendar view</span>
          </div>
        )}
      </div>

      {/* Stats cards - show for admin; pastors/shepherds can see counts too */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All active events</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">In current month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
              <p className="text-xs text-muted-foreground">Future events</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">By Type</CardTitle>
              <Sparkles className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {Object.keys(stats.byType).length}
              </div>
              <p className="text-xs text-muted-foreground">Event types in use</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table view - admin only */}
      {isAdmin && viewMode === "table" && events && (
        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
            <CardDescription>Manage events in table view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No events yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((e) => {
                      const colors = EVENT_TYPE_COLORS[e.eventType as EventType];
                      const statusColors = STATUS_COLORS[(e.status ?? "upcoming") as EventStatus];
                      return (
                        <TableRow key={e._id}>
                          <TableCell className="font-medium">{e.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${colors?.bg ?? ""} ${colors?.text ?? ""} ${colors?.border ?? ""}`}
                            >
                              {formatEventType(e.eventType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${statusColors?.bg ?? ""} ${statusColors?.text ?? ""} ${statusColors?.border ?? ""}`}
                            >
                              {formatEventStatus(e.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(e.startDate), "MMM d, yyyy · h:mm a")}
                          </TableCell>
                          <TableCell>
                            {e.endDate
                              ? format(new Date(e.endDate), "MMM d, yyyy · h:mm a")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {e.location ?? "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(e)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteId(e._id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card view - admin only */}
      {isAdmin && viewMode === "card" && events && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p>No events yet. Create one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            events.map((e) => {
              const colors = EVENT_TYPE_COLORS[e.eventType as EventType];
              const statusColors = STATUS_COLORS[(e.status ?? "upcoming") as EventStatus];
              return (
                <Card
                  key={e._id}
                  className={`overflow-hidden border-l-4 ${colors?.border ?? ""}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{e.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(e._id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={`w-fit ${colors?.bg ?? ""} ${colors?.text ?? ""} ${colors?.border ?? ""}`}
                      >
                        {formatEventType(e.eventType)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`w-fit ${statusColors?.bg ?? ""} ${statusColors?.text ?? ""} ${statusColors?.border ?? ""}`}
                      >
                        {formatEventStatus(e.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      {format(new Date(e.startDate), "MMM d, yyyy · h:mm a")}
                      {e.endDate && ` – ${format(new Date(e.endDate), "h:mm a")}`}
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {e.location}
                      </div>
                    )}
                    {e.description && (
                      <p className="line-clamp-2 text-muted-foreground">{e.description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Calendar view - all roles */}
      {(viewMode === "calendar" || !isAdmin) && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>
                  Events by day. Labels are color-coded by type.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCalendarMonth((d) => subMonths(d, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[140px] text-center font-medium">
                  {format(calendarMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCalendarMonth((d) => addMonths(d, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {EVENT_TYPES.map((t) => {
                const c = EVENT_TYPE_COLORS[t.value];
                return (
                  <span
                    key={t.value}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
                  >
                    {t.label}
                  </span>
                );
              })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="bg-muted/50 p-2 text-center text-xs font-medium"
                >
                  {day}
                </div>
              ))}
              {calendarStartPad.map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[80px] bg-muted/30 p-1" />
              ))}
              {calendarDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDay.get(key) ?? [];
                const isCurrentMonth = isSameMonth(day, calendarMonth);
                return (
                  <div
                    key={key}
                    className={`min-h-[80px] p-1 flex flex-col bg-background ${
                      !isCurrentMonth ? "opacity-50" : ""
                    } ${isToday(day) ? "ring-1 ring-primary/50 rounded" : ""}`}
                  >
                    <span
                      className={`text-xs font-medium mb-1 ${
                        isToday(day) ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="flex-1 space-y-1 overflow-auto">
                      {dayEvents.map((ev) => {
                        const colors = EVENT_TYPE_COLORS[ev.eventType as EventType];
                        const chip = (
                          <div
                            key={ev._id}
                            className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer ${colors?.bg ?? ""} ${colors?.text ?? ""} ${colors?.border ?? ""}`}
                            title={`${ev.title} · ${format(new Date(ev.startDate), "h:mm a")}${ev.location ? ` · ${ev.location}` : ""}`}
                            onClick={() => setDetailDialogEvent(ev)}
                            role="button"
                          >
                            {ev.title}
                          </div>
                        );
                        return (
                          <HoverCard key={ev._id} openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>{chip}</HoverCardTrigger>
                            <HoverCardContent side="top" className="w-72">
                              <EventDetailContent
                                event={ev}
                                isAdmin={!!isAdmin}
                                onEdit={openEdit}
                                onDelete={setDeleteId}
                                compact
                              />
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>Add a new church event. It will be visible to pastors and shepherds.</DialogDescription>
          </DialogHeader>
          <EventForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            eventType={eventType}
            setEventType={setEventType}
            status={status}
            setStatus={setStatus}
            startDate={startDate}
            setStartDate={setStartDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endDate={endDate}
            setEndDate={setEndDate}
            endTime={endTime}
            setEndTime={setEndTime}
            location={location}
            setLocation={setLocation}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Event</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event details.</DialogDescription>
          </DialogHeader>
          <EventForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            eventType={eventType}
            setEventType={setEventType}
            status={status}
            setStatus={setStatus}
            startDate={startDate}
            setStartDate={setStartDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endDate={endDate}
            setEndDate={setEndDate}
            endTime={endTime}
            setEndTime={setEndTime}
            location={location}
            setLocation={setLocation}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event detail – dialog on desktop, sheet on mobile (calendar view click) */}
      <Dialog
        open={!!detailDialogEvent && !isMobile}
        onOpenChange={(open) => !open && setDetailDialogEvent(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Event details</DialogTitle>
            <DialogDescription>View event information. Admins can edit or delete.</DialogDescription>
          </DialogHeader>
          {detailDialogEvent && (
            <div className="py-2">
              <EventDetailContent
                event={detailDialogEvent}
                isAdmin={!!isAdmin}
                onEdit={(e) => {
                  openEdit(e);
                  setDetailDialogEvent(null);
                }}
                onDelete={(id) => {
                  setDeleteId(id);
                  setDetailDialogEvent(null);
                }}
                compact={false}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet
        open={!!detailDialogEvent && isMobile}
        onOpenChange={(open) => !open && setDetailDialogEvent(null)}
      >
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto flex flex-col items-center">
          <SheetHeader className="w-full max-w-md">
            <SheetTitle>Event details</SheetTitle>
          </SheetHeader>
          {detailDialogEvent && (
            <div className="mt-4 w-full max-w-md flex flex-col items-center flex-1 px-4">
              <div className="w-full rounded-lg border bg-card p-4">
                <EventDetailContent
                  event={detailDialogEvent}
                  isAdmin={!!isAdmin}
                  onEdit={(e) => {
                    openEdit(e);
                    setDetailDialogEvent(null);
                  }}
                  onDelete={(id) => {
                    setDeleteId(id);
                    setDetailDialogEvent(null);
                  }}
                  compact={false}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EventForm(props: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  eventType: EventType;
  setEventType: (v: EventType) => void;
  status: EventStatus;
  setStatus: (v: EventStatus) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <Label>Title</Label>
        <Input
          placeholder="e.g. Sunday Service"
          value={props.title}
          onChange={(e) => props.setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={props.eventType} onValueChange={(v) => props.setEventType(v as EventType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={props.status} onValueChange={(v) => props.setStatus(v as EventStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start date</Label>
          <Input
            type="date"
            value={props.startDate}
            onChange={(e) => props.setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Start time</Label>
          <Input
            type="time"
            value={props.startTime}
            onChange={(e) => props.setStartTime(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>End date (optional)</Label>
          <Input
            type="date"
            value={props.endDate}
            onChange={(e) => props.setEndDate(e.target.value)}
          />
        </div>
        <div>
          <Label>End time</Label>
          <Input
            type="time"
            value={props.endTime}
            onChange={(e) => props.setEndTime(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Location (optional)</Label>
        <Input
          placeholder="Venue or address"
          value={props.location}
          onChange={(e) => props.setLocation(e.target.value)}
        />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Textarea
          placeholder="Event details..."
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
