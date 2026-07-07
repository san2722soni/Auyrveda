import { WhatsAppMessage } from "../types/whatsapp";
import { getKnowledge } from "./knowledge";
import { generateReply } from "./openai";
import { sendMessages } from "./whatsapp";

export async function handleConversation(incoming: WhatsAppMessage): Promise<void> {
    const knowledge = await getKnowledge();
    const aiReply = await generateReply(
        incoming.text,
        knowledge
    );
    await sendMessages(incoming.from, aiReply);
}