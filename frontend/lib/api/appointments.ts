import { apiRequest } from "@/lib/api-client";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { ApiMutationResponse, PaginatedResponse } from "@/types/api";

export interface AppointmentListParams {
  page: number;
  limit: number;
  status: AppointmentStatus;
  search?: string;
}

export function getAppointments(params: AppointmentListParams) {
  return apiRequest<PaginatedResponse<Appointment>>("/api/appointments", {
    query: {
      page: params.page,
      limit: params.limit,
      status: params.status,
      search: params.search,
    },
  });
}

export function updateAppointmentStatus(id: string, isCompleted: boolean) {
  return apiRequest<ApiMutationResponse<Appointment>>(`/api/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isCompleted }),
  });
}
