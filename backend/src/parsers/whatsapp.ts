import { WhatsAppMessage, WhatsAppMessageType } from "../types/whatsapp";

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

export function parseWhatsAppWebhooks(body: unknown, phoneNumberId: string): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];
  if (!body || typeof body !== "object") return messages;
  const entries = (body as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return messages;
  for (const entry of entries) {
    if (!Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes) {
      const value = change?.value;
      if (value?.metadata?.phone_number_id !== phoneNumberId || !Array.isArray(value.messages)) continue;
      for (const message of value.messages) {
        if (typeof message?.id !== "string" || !message.id ||
            typeof message.from !== "string" || !/^\d{7,15}$/.test(message.from)) continue;
        const contact = Array.isArray(value.contacts)
          ? value.contacts.find((item: { wa_id?: string }) => item?.wa_id === message.from) : undefined;
        const type = typeof message.type === "string" ? message.type : "unknown";
        messages.push({ id: message.id, from: message.from,
          name: contact?.profile?.name ?? "User",
          text: typeof message.text?.body === "string" ? message.text.body : `[${type} message]`,
          timestamp: message.timestamp ?? "", type: parseMessageType(type) });
      }
    }
  }
  return messages;
}
