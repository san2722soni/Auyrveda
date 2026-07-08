import { WhatsAppMessage } from "../types/whatsapp";
import { getKnowledge } from "./knowledge";
import { generateReply } from "./openai";
import { sendMessages } from "./whatsapp";
import { createAppointment } from "./appointments";

export async function handleConversation(
  incoming: WhatsAppMessage
): Promise<void> {
  const knowledge = await getKnowledge();

  const result = await generateReply(
    incoming.text,
    knowledge
  );

  if (result.type === "message") {
    await sendMessages(incoming.from, result.reply);
    return;
  }

  if (result.type === "appointment") {
    await createAppointment({
      ...result.appointment,
      phoneNumber: incoming.from,
    });

    await sendMessages(
      incoming.from,
      "Your appointment request has been submitted successfully. The clinic team will contact you soon."
    );
  }
}