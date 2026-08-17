export const API_PATHS = {
  root: "/",
  webhook: "/webhook",
  testWhatsApp: "/test-whatsapp",
  testAi: "/test-ai",
  aiTest: "/api/ai/test",
  authLogin: "/api/auth/login",
  appointments: "/api/appointments",
  appointmentById: "/api/appointments/:id",
  users: "/api/users",
  userMessages: "/api/users/:phoneNumber/messages",
  dashboardStats: "/api/dashboard/stats",
  knowledge: "/api/knowledge",
} as const;
