export interface User {
  phoneNumber: string;
  replyMode?: "ai" | "manual";
  manualUntil?: string;
  appointmentAssistantActive?: boolean;
  firstSeenAt: string;
  lastActiveAt: string;
  totalMessages: number;
  createdAt: string;
  updatedAt: string;
}
