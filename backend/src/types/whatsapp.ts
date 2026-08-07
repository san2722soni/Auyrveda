export type WhatsAppMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "location"
  | "contacts"
  | "sticker"
  | "unknown";

export interface WhatsAppMessage {
  from: string;
  name: string;
  text: string;
  timestamp: string;
  type: WhatsAppMessageType;
}