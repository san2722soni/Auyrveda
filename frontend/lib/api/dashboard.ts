import { apiRequest } from "@/lib/api-client";
import { DashboardStats, DashboardTrendPeriod } from "@/types/dashboard";

export function getDashboardStats({
  period,
  anchorDate,
}: {
  period?: DashboardTrendPeriod;
  anchorDate?: string;
} = {}) {
  const searchParams = new URLSearchParams();

  if (period) {
    searchParams.set("period", period);
  }

  if (anchorDate) {
    searchParams.set("anchorDate", anchorDate);
  }

  const queryString = searchParams.toString();

  return apiRequest<DashboardStats>(
    `/api/dashboard/stats${queryString ? `?${queryString}` : ""}`
  );
}
