import { createMessage } from "./messages";
import { sendMessages } from "./whatsapp";

export async function sendAndStoreMessage(
  phoneNumber: string,
  message: string
): Promise<void> {
  await sendMessages(phoneNumber, message);

  await createMessage({
    phoneNumber,
    role: "assistant",
    content: message,
  });
}
