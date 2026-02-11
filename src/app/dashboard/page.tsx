"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserCog,
  Bell,
  TrendingUp,
  Calendar,
  ClipboardList,
  AlertTriangle,
  CalendarCheck,
  FileText,
  Heart,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

// Skeleton component for stats cards
function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Skeleton component for charts
function ChartSkeleton(props: React.ComponentProps<typeof Card>) {
  return (
    <Card {...props}>
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const stats = useQuery(
    api.dashboard.getStats,
    token ? { token } : "skip"
  );
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );
  const shepherdData = useQuery(
    api.dashboard.getShepherdDashboardData,
    token && currentUser?.role === "shepherd" ? { token } : "skip"
  );

  const isLoading = stats === undefined;
  const isShepherd = currentUser?.role === "shepherd";
  const isAdmin = currentUser?.role === "admin";
  const isPastor = currentUser?.role === "pastor";

  const memberStatusData = stats?.statusCounts
    ? [
        { name: "New Converts", value: stats.statusCounts.newConvert, color: COLORS[0] },
        { name: "First Timers", value: stats.statusCounts.firstTimer, color: COLORS[1] },
        { name: "Established", value: stats.statusCounts.established, color: COLORS[2] },
        { name: "Other", value: stats.statusCounts.other, color: COLORS[3] },
      ].filter((item) => item.value > 0)
    : [];

  const reportsData = stats?.reportsByType
    ? [
        { name: "Visitation", value: stats.reportsByType.visitation },
        { name: "Prayer", value: stats.reportsByType.prayer },
        { name: "Follow Up", value: stats.reportsByType.follow_up },
        { name: "Other", value: stats.reportsByType.other },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {isShepherd
            ? "Your flock at a glance"
            : isPastor
              ? "Your zone overview"
              : "Welcome to your church management dashboard"}
        </p>
      </div>

      {/* Shepherd Quick Actions (mobile-first) */}
      {isShepherd && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-1 min-w-0 border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300 dark:hover:bg-emerald-500/25">
            <Link href="/dashboard/attendance">
              <CalendarCheck className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">Mark Attendance</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-1 min-w-0 border-blue-500/40 bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-300 dark:hover:bg-blue-500/25">
            <Link href="/dashboard/members">
              <UserCheck className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">My Members</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-1 min-w-0 border-amber-500/40 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300 dark:hover:bg-amber-500/25">
            <Link href="/dashboard/assignments">
              <ClipboardList className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">Assignments</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-1 min-w-0 border-sky-500/40 bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 dark:text-sky-300 dark:hover:bg-sky-500/25">
            <Link href="/dashboard/reports">
              <FileText className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">Reports</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-1 min-w-0 border-rose-500/40 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-300 dark:hover:bg-rose-500/25">
            <Link href="/dashboard/prayer-requests">
              <Heart className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">Prayer</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-1 min-w-0 border-violet-500/40 bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:text-violet-300 dark:hover:bg-violet-500/25">
            <Link href="/dashboard/groups">
              <Users className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium">My Groups</span>
            </Link>
          </Button>
        </div>
      )}

      {/* Stats Grid - role-based */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Members</CardTitle>
                <UserCog className={`h-4 w-4 ${isShepherd ? "text-blue-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMembers ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {isShepherd ? "Members in your care" : "Active members"}
                </p>
              </CardContent>
            </Card>

            {isShepherd && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                    <ClipboardList className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.pendingAssignments ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Pending or in progress
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
                    <CalendarCheck className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.pendingAttendance ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Attendance pending
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">At-Risk</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.atRiskMembers ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Members need follow-up
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {!isShepherd && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Shepherds</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalShepherds ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Active shepherds
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pastors</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalPastors ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Active pastors
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.unreadNotifications ?? 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Unread notifications
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {isShepherd && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                  <Bell className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.unreadNotifications ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Unread notifications
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Shepherd-specific sections (mobile-first collapsible cards) */}
      {isShepherd && shepherdData && (
        <div className="space-y-4">
          {/* My Groups */}
          {(shepherdData.myGroups?.length ?? 0) > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">My Groups</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Groups you lead - view members, mark attendance
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0">
                    <Link href="/dashboard/groups">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {shepherdData.myGroups.slice(0, 4).map((g) => {
                  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const dayLabel = g.meetingDay !== undefined && g.meetingDay !== null ? days[g.meetingDay] : "";
                  return (
                    <Link
                      key={g._id}
                      href={`/dashboard/groups/${g._id}`}
                      className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Meets {dayLabel}
                      </p>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Pending Assignments */}
          {(shepherdData.pendingAssignments?.length ?? 0) > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Pending Assignments</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Submit reports for completed visits
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0">
                    <Link href="/dashboard/assignments">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {shepherdData.pendingAssignments.slice(0, 3).map((a) => (
                  <Link
                    key={a._id}
                    href="/dashboard/assignments"
                    className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.memberName}</p>
                        {a.dueDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due {formatDate(a.dueDate)}
                          </p>
                        )}
                      </div>
                      <Badge variant={a.priority === "high" ? "destructive" : "secondary"} className="shrink-0 text-xs">
                        {a.assignmentType.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* At-Risk Members */}
          {(shepherdData.atRiskMembers?.length ?? 0) > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">At-Risk Members</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Members needing follow-up
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0">
                    <Link href="/dashboard/members">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {shepherdData.atRiskMembers.slice(0, 3).map((m) => (
                  <Link
                    key={m._id}
                    href="/dashboard/members"
                    className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {m.firstName} {m.lastName}
                        </p>
                        {m.lastAttendanceDate && (
                          <p className="text-xs text-muted-foreground">
                            Last seen {formatDate(m.lastAttendanceDate)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          m.attendanceRiskLevel === "high"
                            ? "destructive"
                            : m.attendanceRiskLevel === "medium"
                              ? "secondary"
                              : "outline"
                        }
                        className="shrink-0 capitalize text-xs"
                      >
                        {m.attendanceRiskLevel}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Reports */}
          {(shepherdData.recentReports?.length ?? 0) > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Recent Reports</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Your submitted reports
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0">
                    <Link href="/dashboard/reports">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {shepherdData.recentReports.slice(0, 3).map((r) => (
                  <Link
                    key={r._id}
                    href="/dashboard/reports"
                    className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.memberName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(r.createdAt)} · {r.reportType.replace("_", " ")}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Open Prayer Requests */}
          {(shepherdData.openPrayerRequests?.length ?? 0) > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Open Prayer Requests</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Awaiting prayer & response
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0">
                    <Link href="/dashboard/prayer-requests">
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {shepherdData.openPrayerRequests.slice(0, 3).map((pr) => (
                  <Link
                    key={pr._id}
                    href="/dashboard/prayer-requests"
                    className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <p className="text-sm font-medium truncate">{pr.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{pr.memberName}</p>
                    <Badge variant={pr.priority === "urgent" ? "destructive" : "secondary"} className="mt-1 text-xs">
                      {pr.priority}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Attendance Chart */}
        {isLoading ? (
          <>
            <ChartSkeleton className="col-span-4" />
            <ChartSkeleton className="col-span-3" />
          </>
        ) : (
          <>
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Attendance Trend (Last 7 Days)</CardTitle>
                <CardDescription>
                  Approved attendance records over the past week
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.attendanceByDay && stats.attendanceByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.attendanceByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => {
                          return new Date(value).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          });
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Attendance"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mb-4 opacity-50" />
                    <p>No attendance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Member Status Pie Chart */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Member Status</CardTitle>
                <CardDescription>
                  Distribution of members by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {memberStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={memberStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent! * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {memberStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <UserCog className="h-12 w-12 mb-4 opacity-50" />
                    <p>No member data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Reports Chart */}
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Reports by Type</CardTitle>
                <CardDescription>
                  Distribution of shepherd reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Reports" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                    <p>No reports data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>
                  Recent activity summary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recent Attendance</span>
                  <span className="text-2xl font-bold">{stats?.recentAttendance ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Reports</span>
                  <span className="text-2xl font-bold">
                    {stats?.reportsByType
                      ? Object.values(stats.reportsByType).reduce((a, b) => a + b, 0)
                      : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Members</span>
                  <span className="text-2xl font-bold">{stats?.totalMembers ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
