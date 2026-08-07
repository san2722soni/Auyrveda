import { config } from "../config";

export async function sendMessages(
  phoneNumber: string,
  message: string
): Promise<void> {
  if (!config.whatsappToken || !config.phoneNumberId) {
    throw new Error("WhatsApp configuration is missing");
  }

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${config.phoneNumberId}/messages`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",

        text: {
          body: message,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `WhatsApp API error: ${response.status} ${error}`
    );
  }

  await response.json();
}
