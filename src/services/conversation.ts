import { WhatsAppMessage } from "../types/whatsapp";
import { APPOINTMENT_CONFIRMATION_MESSAGE } from "../constants/appointments";
import { getKnowledge } from "./knowledge";
import { generateReply } from "./openai";
import { createAppointment } from "./appointments";
import { createMessage } from "./messages";
import { sendAndStoreMessage } from "./messaging";
import { upsertUser } from "./users";

export async function handleConversation(
  incoming: WhatsAppMessage
): Promise<void> {
  await upsertUser(incoming.from);

  await createMessage({
    phoneNumber: incoming.from,
    role: "user",
    content: incoming.text,
  });

  const knowledge = await getKnowledge();

  const result = await generateReply(
    incoming.text,
    knowledge
  );

  if (result.type === "message") {
    await sendAndStoreMessage(incoming.from, result.reply);
    return;
  }

  if (result.type === "appointment") {
    await createAppointment({
      ...result.appointment,
      phoneNumber: incoming.from,
    });

    await sendAndStoreMessage(
      incoming.from,
      APPOINTMENT_CONFIRMATION_MESSAGE
    );
  }
}
