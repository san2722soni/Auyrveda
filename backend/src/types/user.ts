export interface User {
  phoneNumber: string;
  replyMode?: "ai" | "manual";
  manualUntil?: Date;
  appointmentAssistantActive?: boolean;
  modeVersion?: number;
  contextStartedAt?: Date;

  firstSeenAt: Date;
  lastActiveAt: Date;

  totalMessages: number;

  createdAt: Date;
  updatedAt: Date;
}
