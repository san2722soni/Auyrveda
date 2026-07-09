export type MessageRole = "user" | "assistant";

export interface Message {
  phoneNumber: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
