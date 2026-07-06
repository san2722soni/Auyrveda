import { MetaWebhookPayload } from "../types/meta";
import {
  WhatsAppMessage,
  WhatsAppMessageType,
} from "../types/whatsapp";

function parseMessageType(type: string): WhatsAppMessageType {
  switch (type) {
    case "text":
    case "image":
    case "audio":
    case "video":
    case "document":
    case "location":
    case "contacts":
    case "sticker":
      return type;

    default:
      return "unknown";
  }
}

export function parseWhatsAppWebhook(
  body: MetaWebhookPayload
): WhatsAppMessage | null {
  const value = body.entry?.[0]?.changes?.[0]?.value;

  if (!value?.messages?.length) {
    return null;
  }

  const message = value.messages[0];
  const contact = value.contacts?.[0];

  if (!message || !contact) {
    return null;
  }

  return {
    from: message.from,
    name: contact.profile?.name ?? "User",
    text: message.text?.body ?? "",
    timestamp: message.timestamp,
    type: parseMessageType(message.type),
  };
}