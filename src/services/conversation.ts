import { WhatsAppMessage } from "../types/whatsapp";
import { getKnowledge } from "./knowledge";
import { generateReply } from "./openai";
import { sendMessages } from "./whatsapp";
import { handleAppointmentConversation } from "./appointmentConversation";

export async function handleConversation(incoming: WhatsAppMessage): Promise<void> {
    const appointmentResult = await handleAppointmentConversation(incoming);

    if (appointmentResult.handled) {
        if (appointmentResult.reply) {
            await sendMessages(incoming.from, appointmentResult.reply);
        }

        return;
    }

    const knowledge = await getKnowledge();
    const aiReply = await generateReply(
        incoming.text,
        knowledge
    );
    await sendMessages(incoming.from, aiReply);
}
