# Pastor Dashboard - Feature Plan

## Overview
Pastors oversee shepherds and manage members within their assigned zone/area. They have supervisory access but not full system administration.

## Current Pastor Permissions (Already Implemented)
✅ Can view members of their shepherds  
✅ Can view assignments for their shepherds  
✅ Can view reports from their shepherds  
✅ Can approve/reject attendance for their shepherds' members  
✅ Can mark attendance for their shepherds  
✅ Can view prayer requests from their shepherds  
✅ Dashboard stats filter by pastor's shepherds  

## Pastor Dashboard Features

### 1. **Dashboard Overview** ✅ (Already Exists)
- **Stats Cards:**
  - Total Members (under their shepherds)
  - Total Shepherds (assigned to them)
  - Pending Attendance Approvals
  - Unread Notifications
  - Recent Reports
  - At-Risk Members
  
- **Charts:**
  - Attendance Trend (last 7 days) - for their zone
  - Member Status Distribution - for their zone
  - Reports by Type - from their shepherds
  - Shepherd Performance Metrics

### 2. **Shepherd Management** (View & Manage)
**Access:** View and manage shepherds assigned to them

**Features:**
- ✅ View list of assigned shepherds
- ✅ View shepherd profiles/details
- ✅ Edit shepherd profiles (name, email, phone, zone, etc.)
- ✅ View shepherd performance metrics
- ✅ View shepherd's member count
- ✅ View shepherd's recent activity
- ❌ Cannot create/delete shepherds (Admin only)
- ❌ Cannot assign/unassign shepherds (Admin only)

**UI Components Needed:**
- Shepherd list table with photos
- View/Edit shepherd dialog
- Shepherd performance cards
- Filter by zone/status

### 3. **Member Management** (View & Manage)
**Access:** View and manage members under their shepherds

**Features:**
- ✅ View all members under their shepherds
- ✅ Filter by shepherd
- ✅ View member profiles/details
- ✅ Edit member information
- ✅ View member attendance history
- ✅ View member assignments
- ✅ Track at-risk members
- ❌ Cannot create/delete members (Admin only)
- ❌ Cannot assign members to shepherds (Admin only)

**UI Components Needed:**
- Member list table with filters
- View/Edit member dialog
- Member attendance history
- At-risk member alerts

### 4. **Assignments** (Create & Manage)
**Access:** Create and manage assignments for their shepherds

**Features:**
- ✅ View all assignments for their shepherds
- ✅ Create new assignments for their shepherds
- ✅ Edit assignments
- ✅ View assignment reports
- ✅ Filter by shepherd, status, priority
- ✅ Track assignment completion rates

**UI Components Needed:**
- Assignment list with filters
- Create/Edit assignment dialog
- Assignment status tracking
- Report viewing

### 5. **Attendance Management** ✅ (Partially Implemented)
**Access:** Approve/reject attendance and mark shepherd attendance

**Features:**
- ✅ Approve/reject attendance for their shepherds' members
- ✅ Mark attendance for their shepherds
- ✅ View attendance records for their zone
- ✅ Filter by date, shepherd, status
- ✅ Attendance analytics for their zone

**UI Components Needed:**
- ✅ Attendance approval/rejection (Already exists)
- ✅ Mark shepherd attendance dialog (Already exists)
- Attendance analytics dashboard
- Attendance trends by shepherd

### 6. **Reports** (View & Analyze)
**Access:** View reports from their shepherds

**Features:**
- ✅ View all reports from their shepherds
- ✅ Filter by shepherd, report type, date
- ✅ View report details
- ✅ Download/export reports
- ✅ Report analytics and trends

**UI Components Needed:**
- Reports list table
- Report detail view
- Report filters
- Report analytics charts

### 7. **Prayer Requests** (View & Respond)
**Access:** View prayer requests from their shepherds

**Features:**
- ✅ View prayer requests sent to them
- ✅ View requests from their shepherds
- ✅ Respond to prayer requests
- ✅ Filter by status, priority, member
- ✅ Track answered prayers

**UI Components Needed:**
- Prayer requests list
- Prayer request detail view
- Response functionality
- Prayer request filters

### 8. **Notifications** ✅ (Already Exists)
**Access:** View notifications

**Features:**
- ✅ View all notifications
- ✅ Mark as read/unread
- ✅ Filter by type
- ✅ Notification preferences

### 9. **Analytics & Insights** (New Feature)
**Access:** View analytics for their zone

**Features:**
- Attendance trends by shepherd
- Member growth trends
- Assignment completion rates
- Report submission rates
- At-risk member analysis
- Shepherd performance comparison
- Zone-level statistics

**UI Components Needed:**
- Analytics dashboard page
- Charts and graphs
- Export capabilities
- Date range filters

## What Pastors CANNOT Do (Admin Only)
❌ Create/Delete users (admins, pastors, shepherds)  
❌ Assign/Unassign shepherds to pastors  
❌ System settings management  
❌ Audit log access  
❌ Full system access  
❌ Create/Delete members  
❌ Assign members to shepherds  

## Implementation Priority

### Phase 1: Core Management (High Priority)
1. ✅ Dashboard Overview (Already exists)
2. Shepherd Management (View & Edit)
3. Member Management (View & Edit)
4. ✅ Attendance Management (Already exists)

### Phase 2: Operations (Medium Priority)
5. ✅ Assignments (View exists, need Create/Edit)
6. Reports (View & Analyze)
7. Prayer Requests (View & Respond)
8. ✅ Notifications (Already exists)

### Phase 3: Analytics (Lower Priority)
9. Analytics & Insights Dashboard

## Sidebar Navigation for Pastors
- Dashboard
- Shepherds (View & Manage)
- Members (View & Manage)
- Assignments (Create & Manage)
- Attendance (Approve & Mark)
- Reports (View & Analyze)
- Prayer Requests (View & Respond)
- Notifications
- Analytics (Optional)
- Profile

## Notes
- All data should be filtered to only show pastor's assigned shepherds and their members
- Pastors should have read/write access to their zone's data
- Pastors cannot modify system-level settings or user roles
- All actions should be logged for audit purposes (admin can view)
