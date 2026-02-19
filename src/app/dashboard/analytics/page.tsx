"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  TrendingUp,
  Users,
  UserCheck,
  Calendar,
  FileText,
  Heart,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

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

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Get current user
  const currentUser = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  // Determine user role
  const isAdmin = currentUser?.role === "admin";
  const isPastor = currentUser?.role === "pastor";
  
  // Debug: Log role information
  React.useEffect(() => {
    if (currentUser) {
      console.log("Current user role:", currentUser.role, "isAdmin:", isAdmin, "isPastor:", isPastor);
    }
  }, [currentUser, isAdmin, isPastor]);

  // Get stats
  const stats = useQuery(
    api.dashboard.getStats,
    token ? { token } : "skip"
  );

  const isLoading = stats === undefined || currentUser === undefined;

  // Prepare chart data - MUST be called before any early returns to maintain hook order
  const memberStatusData = React.useMemo(() => {
    if (!stats?.statusCounts) {
      return [];
    }
    return [
      { name: "New Converts", value: stats.statusCounts.newConvert, color: COLORS[0] },
      { name: "First Timers", value: stats.statusCounts.firstTimer, color: COLORS[1] },
      { name: "Established", value: stats.statusCounts.established, color: COLORS[2] },
      { name: "Other", value: stats.statusCounts.other, color: COLORS[3] },
    ].filter((item) => item.value > 0);
  }, [stats?.statusCounts]);

  const reportsData = React.useMemo(() => {
    if (!stats?.reportsByType) {
      return [];
    }
    return [
      { name: "Visitation", value: stats.reportsByType.visitation },
      { name: "Prayer", value: stats.reportsByType.prayer },
      { name: "Follow Up", value: stats.reportsByType.follow_up },
      { name: "Other", value: stats.reportsByType.other },
    ].filter((item) => item.value > 0);
  }, [stats?.reportsByType]);

  const attendanceByDayData = React.useMemo(() => {
    if (!stats?.attendanceByDay) {
      return [];
    }
    
    try {
      // Handle both array and object formats
      let dataArray: Array<{ date: string; count: number }> = [];
      
      if (Array.isArray(stats.attendanceByDay)) {
        dataArray = stats.attendanceByDay as Array<{ date: string; count: number }>;
      } else if (typeof stats.attendanceByDay === 'object' && stats.attendanceByDay !== null) {
        // Convert object to array format
        dataArray = Object.entries(stats.attendanceByDay).map(([date, count]) => ({
          date: String(date),
          count: typeof count === 'number' ? count : (typeof count === 'object' && count !== null && 'count' in count ? Number((count as any).count) : 0),
        }));
      }
      
      const result = dataArray
        .filter((item) => {
          return item && 
                 typeof item === 'object' && 
                 'date' in item && 
                 'count' in item &&
                 typeof item.date === 'string' &&
                 typeof item.count === 'number';
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => {
          try {
            const dateObj = new Date(item.date);
            if (isNaN(dateObj.getTime())) {
              return null;
            }
            return {
              date: format(dateObj, "MMM dd"),
              attendance: Number(item.count),
            };
          } catch (error) {
            console.error('Error formatting date:', error, item);
            return null;
          }
        })
        .filter((item): item is { date: string; attendance: number } => item !== null);
      
      return result;
    } catch (error) {
      console.error('Error processing attendanceByDayData:', error, stats?.attendanceByDay);
      return [];
    }
  }, [stats?.attendanceByDay]);

  // Early returns AFTER all hooks to maintain hook order
  if (!isClient || !token) {
    return <div className="p-6">Loading...</div>;
  }

  // Only allow admin and pastor access
  if (!isAdmin && !isPastor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8" />
          Analytics
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-0">
          {isAdmin
            ? "Comprehensive analytics and insights"
            : isPastor
            ? "Analytics for your shepherds and members"
            : "Analytics"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
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
                <CardTitle className="text-xs sm:text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats?.totalMembers || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Active members in the system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Shepherds</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats?.totalShepherds || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {isPastor ? "Assigned to you" : "Active shepherds"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Recent Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats?.recentAttendance || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Last 7 days attendance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{Object.values(stats?.reportsByType || {}).reduce((a, b) => a + b, 0) || 0}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Reports from shepherds
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            {/* Member Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Member Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of members by status
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
                        label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {memberStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mb-4 opacity-50" />
                    <p>No member data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reports by Type */}
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
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>No reports data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Attendance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trend (Last 7 Days)</CardTitle>
          <CardDescription>
            Daily attendance over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : attendanceByDayData && attendanceByDayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceByDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return value;
                    }
                    return String(value || 0);
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Attendance"
                  dot={{ r: 4 }}
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
    </div>
  );
}
