export type MessageRole = "user" | "assistant";
export type MessageSender = "patient" | "ai" | "staff";

export interface Message {
  externalId?: string;
  phoneNumber: string;
  role: MessageRole;
  sentBy?: MessageSender;
  content: string;
  createdAt: Date;
}
