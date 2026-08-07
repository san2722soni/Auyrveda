import { getDatabase } from "./database";
import { COLLECTIONS } from "../constants/database";
import { Appointment } from "../types/appointment";
import { Message } from "../types/message";
import { User } from "../types/user";

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
  day: "numeric",
  month: "short",
});

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days
  );
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTrendRange(period: DashboardTrendPeriod, anchorDate: Date): DateRange {
  const anchorDay = startOfDay(anchorDate);

  if (period === "month") {
    const start = new Date(anchorDay.getFullYear(), anchorDay.getMonth(), 1);
    const endExclusive = new Date(
      anchorDay.getFullYear(),
      anchorDay.getMonth() + 1,
      1
    );

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
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const trendPeriod = input.trendPeriod ?? "week";
  const trendAnchorDate = input.anchorDate ?? now;
  const trendRange = getTrendRange(trendPeriod, trendAnchorDate);

  const [
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
