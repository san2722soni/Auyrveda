import { apiRequest } from "@/lib/api-client";
import { PaginatedResponse } from "@/types/api";
import { Message } from "@/types/message";
import { User } from "@/types/user";

export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
}

export interface MessageListParams {
  phoneNumber: string;
  page: number;
  limit: number;
}

export function getUsers(params: UserListParams) {
  return apiRequest<PaginatedResponse<User>>("/api/users", {
    query: {
      page: params.page,
      limit: params.limit,
      search: params.search,
    },
  });
}

export function getMessagesByPhoneNumber(params: MessageListParams) {
  return apiRequest<PaginatedResponse<Message>>(
    `/api/users/${encodeURIComponent(params.phoneNumber)}/messages`,
    {
      query: {
        page: params.page,
        limit: params.limit,
      },
    }
  );
}

export function updateUserReplyMode(
  phoneNumber: string,
  replyMode: User["replyMode"]
) {
  return apiRequest<{ success: boolean; data: User }>(
    `/api/users/${encodeURIComponent(phoneNumber)}/reply-mode`,
    {
      method: "PATCH",
      body: JSON.stringify({ replyMode }),
    }
  );
}

export function sendUserMessage(phoneNumber: string, message: string) {
  return apiRequest<{ success: boolean; data: User }>(
    `/api/users/${encodeURIComponent(phoneNumber)}/messages/send`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    }
  );
}

export function startAppointmentBooking(phoneNumber: string) {
  return apiRequest<{ success: boolean; data: User }>(
    `/api/users/${encodeURIComponent(phoneNumber)}/appointments/start`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}
