/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assignments from "../assignments.js";
import type * as attendance from "../attendance.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as authUsers from "../authUsers.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as events from "../events.js";
import type * as groups from "../groups.js";
import type * as memberAssignments from "../memberAssignments.js";
import type * as members from "../members.js";
import type * as notificationHelpers from "../notificationHelpers.js";
import type * as notifications from "../notifications.js";
import type * as prayerRequests from "../prayerRequests.js";
import type * as regions from "../regions.js";
import type * as registrationRequests from "../registrationRequests.js";
import type * as reminders from "../reminders.js";
import type * as reports from "../reports.js";
import type * as settings from "../settings.js";
import type * as storage from "../storage.js";
import type * as userAssignments from "../userAssignments.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assignments: typeof assignments;
  attendance: typeof attendance;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  authUsers: typeof authUsers;
  crons: typeof crons;
  dashboard: typeof dashboard;
  events: typeof events;
  groups: typeof groups;
  memberAssignments: typeof memberAssignments;
  members: typeof members;
  notificationHelpers: typeof notificationHelpers;
  notifications: typeof notifications;
  prayerRequests: typeof prayerRequests;
  regions: typeof regions;
  registrationRequests: typeof registrationRequests;
  reminders: typeof reminders;
  reports: typeof reports;
  settings: typeof settings;
  storage: typeof storage;
  userAssignments: typeof userAssignments;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
