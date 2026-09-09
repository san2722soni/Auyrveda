import { WhatsAppMessage } from "../types/whatsapp";
import { APPOINTMENT_CONFIRMATION_MESSAGE } from "../constants/appointments";
import { getKnowledge } from "./knowledge";
import { generateAppointmentReply, generateReply } from "./openai";
import { createAppointment } from "./appointments";
import { createMessage, getConversationHistory } from "./messages";
import { withConversationLock } from "../lib/conversation-lock";
import { sendAndStoreMessage } from "./messaging";
import {
  getEffectiveReplyMode,
  stopAppointmentAssistant,
  upsertUser,
  getUser,
} from "./users";

export async function handleConversation(
  incoming: WhatsAppMessage,
  beforeDelivery: () => Promise<void> = async () => undefined
): Promise<void> {
  await createMessage({
    externalId: incoming.id,
    phoneNumber: incoming.from,
    role: "user",
    sentBy: "patient",
    content: incoming.text,
  });

  const user = await upsertUser(incoming.from);

  const replyMode = await getEffectiveReplyMode(user);

  if (replyMode === "manual" && !user.appointmentAssistantActive) {
    return;
  }

  const knowledge = await getKnowledge();
  const history = await getConversationHistory(incoming.from, user.contextStartedAt);
  const input = history.map(({ role, content }) => ({ role, content }));

  const result = incoming.type !== "text"
    ? { type: "message" as const, reply: "Please send your question or appointment details as text. Clinic staff can help with reports or other attachments.", appointment: null }
    :
    replyMode === "manual"
      ? await generateAppointmentReply(input, knowledge)
      : await generateReply(input, knowledge);

  await withConversationLock(incoming.from, async () => {
    const current = await getUser(incoming.from);
    if (!current || (current.modeVersion ?? 0) !== (user.modeVersion ?? 0)) return;

    if (result.type === "message") {
      await beforeDelivery();
      await sendAndStoreMessage(incoming.from, result.reply);
      return;
    }

    if (result.type === "appointment") {
      await createAppointment({
        ...result.appointment,
        phoneNumber: incoming.from,
        sourceMessageId: incoming.id,
      });

      await beforeDelivery();
      await sendAndStoreMessage(incoming.from, APPOINTMENT_CONFIRMATION_MESSAGE);
      await stopAppointmentAssistant(incoming.from);
    }
  });
}
