import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run attendance reminders creation daily at 2:30pm (30 minutes before 3pm deadline)
crons.daily(
  "createAttendanceReminders",
  {
    hourUTC: 14, // 2pm UTC (adjust based on your timezone)
    minuteUTC: 30, // 30 minutes past the hour
  },
  internal.reminders.createAttendanceReminders
);

// Process due reminders every hour at minute 0
crons.hourly(
  "processDueReminders",
  {
    minuteUTC: 0, // At the top of every hour
  },
  internal.reminders.processDueReminders
);

// Create birthday reminders daily at midnight
crons.daily(
  "createBirthdayReminders",
  {
    hourUTC: 0, // Midnight UTC
    minuteUTC: 0, // 0 minutes past the hour
  },
  internal.reminders.createBirthdayReminders
);

// Update attendance risk levels daily at 1am
crons.daily(
  "updateAttendanceRiskLevels",
  {
    hourUTC: 1, // 1am UTC
    minuteUTC: 0,
  },
  internal.members.updateAttendanceRiskLevels
);

export default crons;
