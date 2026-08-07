import { apiRequest } from "@/lib/api-client";
import { LoginResponse } from "@/types/auth";

export function loginAdmin({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
    }),
  });
}
