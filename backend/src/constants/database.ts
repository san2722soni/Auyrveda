export const COLLECTIONS = {
  users: "users",
  messages: "messages",
  appointments: "appointments",
} as const;

export const INDEXES = {
  usersPhoneNumberUnique: "users_phoneNumber_unique",
  usersLastActiveAt: "users_lastActiveAt",
  usersFirstSeenAt: "users_firstSeenAt",
  messagesPhoneNumberCreatedAt: "messages_phoneNumber_createdAt",
  appointmentsCreatedAt: "appointments_createdAt",
  appointmentsIsCompletedCreatedAt: "appointments_isCompleted_createdAt",
  appointmentsPhoneNumber: "appointments_phoneNumber",
} as const;
