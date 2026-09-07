import { createMessage } from "./messages";
import { sendMessages } from "./whatsapp";
import { MessageSender } from "../types/message";

export async function sendAndStoreMessage(
  phoneNumber: string,
  message: string,
  sentBy: MessageSender = "ai"
): Promise<void> {
  await sendMessages(phoneNumber, message);

  await createMessage({
    phoneNumber,
    role: "assistant",
    sentBy,
    content: message,
  });
}
