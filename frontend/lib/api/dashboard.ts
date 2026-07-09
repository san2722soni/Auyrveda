import { apiRequest } from "@/lib/api-client";
import { DashboardStats } from "@/types/dashboard";

export function getDashboardStats() {
  return apiRequest<DashboardStats>("/api/dashboard/stats");
}
