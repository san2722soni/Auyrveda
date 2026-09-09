import { getDatabase } from "./database";
import { COLLECTIONS } from "../constants/database";
import { Appointment } from "../types/appointment";
import { Message } from "../types/message";
import { User } from "../types/user";
import { addDays, CLINIC_TIMEZONE, startOfDay, startOfMonth, toDateKey } from "../lib/clinic-date";

export type DashboardTrendPeriod = "week" | "month";

export interface DashboardTrendPoint {
  date: string;
  label: string;
  users: number;
  appointments: number;
}

export interface DashboardTrend {
  period: DashboardTrendPeriod;
  anchorDate: string;
  startDate: string;
  endDate: string;
  points: DashboardTrendPoint[];
}

export interface DashboardStats {
  failedMessages: number;
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;

  totalMessages: number;

  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;

  appointmentsThisWeek: number;
  appointmentsThisMonth: number;

  trend: DashboardTrend;
}

interface GetDashboardStatsInput {
  trendPeriod?: DashboardTrendPeriod;
  anchorDate?: Date;
}

interface DateRange {
  start: Date;
  endExclusive: Date;
}

interface CountResult {
  _id: string;
  count: number;
}

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: CLINIC_TIMEZONE,
  day: "numeric",
  month: "short",
});

function getTrendRange(period: DashboardTrendPeriod, anchorDate: Date): DateRange {
  const anchorDay = startOfDay(anchorDate);

  if (period === "month") {
    const start = startOfMonth(anchorDay);
    const endExclusive = startOfMonth(addDays(start, 32));

    return { start, endExclusive };
  }

  return {
    start: addDays(anchorDay, -6),
    endExclusive: addDays(anchorDay, 1),
  };
}

function buildTrendPoints(
  period: DashboardTrendPeriod,
  anchorDate: Date,
  userCounts: CountResult[],
  appointmentCounts: CountResult[],
  initialUsers: number,
  initialAppointments: number
): DashboardTrend {
  const range = getTrendRange(period, anchorDate);
  const userCountByDate = new Map(
    userCounts.map((entry) => [entry._id, entry.count])
  );
  const appointmentCountByDate = new Map(
    appointmentCounts.map((entry) => [entry._id, entry.count])
  );
  const points: DashboardTrendPoint[] = [];
  let runningUsers = initialUsers;
  let runningAppointments = initialAppointments;

  for (
    let cursor = new Date(range.start);
    cursor < range.endExclusive;
    cursor = addDays(cursor, 1)
  ) {
    const date = toDateKey(cursor);
    runningUsers += userCountByDate.get(date) ?? 0;
    runningAppointments += appointmentCountByDate.get(date) ?? 0;

    points.push({
      date,
      label: shortDateFormatter.format(cursor),
      users: runningUsers,
      appointments: runningAppointments,
    });
  }

  return {
    period,
    anchorDate: toDateKey(startOfDay(anchorDate)),
    startDate: toDateKey(range.start),
    endDate: toDateKey(addDays(range.endExclusive, -1)),
    points,
  };
}

export async function getDashboardStats(
  input: GetDashboardStatsInput = {}
): Promise<DashboardStats> {
  const db = getDatabase();
  const users = db.collection<User>(COLLECTIONS.users);
  const messages = db.collection<Message>(COLLECTIONS.messages);
  const appointments = db.collection<Appointment>(COLLECTIONS.appointments);
  const now = new Date();
  const weekStart = addDays(startOfDay(now), -6);
  const monthStart = startOfMonth(now);
  const trendPeriod = input.trendPeriod ?? "week";
  const trendAnchorDate = input.anchorDate ?? now;
  const trendRange = getTrendRange(trendPeriod, trendAnchorDate);

  const [
    failedMessages,
    totalUsers,
    newUsersThisWeek,
    newUsersThisMonth,
    totalMessages,
    totalAppointments,
    pendingAppointments,
    completedAppointments,
    appointmentsThisWeek,
    appointmentsThisMonth,
    trendUsers,
    trendAppointments,
    trendInitialUsers,
    trendInitialAppointments,
  ] = await Promise.all([
    db.collection("webhook_inbox").countDocuments({ state: { $in: ["failed", "uncertain"] } }),
    users.countDocuments(),
    users.countDocuments({ firstSeenAt: { $gte: weekStart } }),
    users.countDocuments({ firstSeenAt: { $gte: monthStart } }),
    messages.countDocuments(),
    appointments.countDocuments(),
    appointments.countDocuments({ isCompleted: false }),
    appointments.countDocuments({ isCompleted: true }),
    appointments.countDocuments({ createdAt: { $gte: weekStart } }),
    appointments.countDocuments({ createdAt: { $gte: monthStart } }),
    users
      .aggregate<CountResult>([
        {
          $match: {
            firstSeenAt: {
              $gte: trendRange.start,
              $lt: trendRange.endExclusive,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$firstSeenAt",
                timezone: CLINIC_TIMEZONE,
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    appointments
      .aggregate<CountResult>([
        {
          $match: {
            createdAt: {
              $gte: trendRange.start,
              $lt: trendRange.endExclusive,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: CLINIC_TIMEZONE,
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    users.countDocuments({
      firstSeenAt: {
        $lt: trendRange.start,
      },
    }),
    appointments.countDocuments({
      createdAt: {
        $lt: trendRange.start,
      },
    }),
  ]);

  return {
    failedMessages,
    totalUsers,
    newUsersThisWeek,
    newUsersThisMonth,
    totalMessages,
    totalAppointments,
    pendingAppointments,
    completedAppointments,
    appointmentsThisWeek,
    appointmentsThisMonth,
    trend: buildTrendPoints(
      trendPeriod,
      trendAnchorDate,
      trendUsers,
      trendAppointments,
      trendInitialUsers,
      trendInitialAppointments
    ),
  };
}
