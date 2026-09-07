import { WhatsAppMessage } from "../types/whatsapp";
import { APPOINTMENT_CONFIRMATION_MESSAGE } from "../constants/appointments";
import { getKnowledge } from "./knowledge";
import { generateAppointmentReply, generateReply } from "./openai";
import { createAppointment } from "./appointments";
import { createMessage } from "./messages";
import { sendAndStoreMessage } from "./messaging";
import {
  getEffectiveReplyMode,
  stopAppointmentAssistant,
  upsertUser,
} from "./users";

export async function handleConversation(
  incoming: WhatsAppMessage
): Promise<void> {
  const user = await upsertUser(incoming.from);

  await createMessage({
    phoneNumber: incoming.from,
    role: "user",
    sentBy: "patient",
    content: incoming.text,
  });

  const replyMode = await getEffectiveReplyMode(user);

  if (replyMode === "manual" && !user.appointmentAssistantActive) {
    return;
  }

  const knowledge = await getKnowledge();

  const result =
    replyMode === "manual"
      ? await generateAppointmentReply(incoming.text, knowledge)
      : await generateReply(incoming.text, knowledge);

  if (result.type === "message") {
    await sendAndStoreMessage(incoming.from, result.reply);
    return;
  }

  if (result.type === "appointment") {
    await createAppointment({
      ...result.appointment,
      phoneNumber: incoming.from,
    });

    if (replyMode === "manual") {
      await stopAppointmentAssistant(incoming.from);
    }

    await sendAndStoreMessage(
      incoming.from,
      APPOINTMENT_CONFIRMATION_MESSAGE
    );
  }
}
