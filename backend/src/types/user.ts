export interface User {
  phoneNumber: string;
  replyMode?: "ai" | "manual";
  manualUntil?: Date;
  appointmentAssistantActive?: boolean;

  firstSeenAt: Date;
  lastActiveAt: Date;

  totalMessages: number;

  createdAt: Date;
  updatedAt: Date;
}
