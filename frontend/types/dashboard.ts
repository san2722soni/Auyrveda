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
