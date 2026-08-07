export type AdminRole = "admin";

export interface AdminUser {
  username: string;
  role: AdminRole;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}
