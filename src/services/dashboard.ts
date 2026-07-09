import { getDatabase } from "./database";
import { COLLECTIONS } from "../constants/database";
import { Appointment } from "../types/appointment";
import { Message } from "../types/message";
import { User } from "../types/user";

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
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDatabase();
  const users = db.collection<User>(COLLECTIONS.users);
  const messages = db.collection<Message>(COLLECTIONS.messages);
  const appointments = db.collection<Appointment>(COLLECTIONS.appointments);
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
  };
}
