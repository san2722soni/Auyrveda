import { FastifyInstance } from "fastify";
import { parseWhatsAppWebhook } from "../parsers/whatsapp";
import { MetaWebhookPayload } from "../types/meta";
import { handleConversation } from "../services/conversation";
import { sendMessages } from "../services/whatsapp";
import { getKnowledge } from "../services/knowledge";
import { generateReply } from "../services/openai";

export async function webhookRoutes(app: FastifyInstance) {
  app.get("/webhook", async (request, reply) => {
    const query = request.query as {
      "hub.mode"?: string;
      "hub.verify_token"?: string;
      "hub.challenge"?: string;
    };

    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === "aswin123"
    ) {
      return reply.status(200).send(query["hub.challenge"]);
    }

    return reply.status(403).send("Verification failed");
  });

  // test whats app test mesage 
  
  app.get("/test-whatsapp", async (request, reply) => {
    await sendMessages(
      "916200855270",
      "Hello from WhatsApp API!"
    );

    return reply.send({
      success: true
    });
  });

  // test ai 

app.get("/test-ai", async (request, reply) => {
  const knowledge = await getKnowledge();

  const aiReply = await generateReply(
    "What is the consultation fee?",
    knowledge
  );

  console.log("AI Reply:", aiReply);

  return reply.send({
    success: true,
    reply: aiReply,
  });
});

  app.post<{ Body: MetaWebhookPayload }>(
  "/webhook",
  async (request, reply) => {
    const incoming = parseWhatsAppWebhook(request.body);

    if (!incoming) {
      return reply.status(200).send({
        success: true,
      });
    }

    console.log("Incoming message:", incoming);

    try {
      await handleConversation(incoming);
    } catch (error) {
      console.error("Conversation processing failed:", error);
    }

    return reply.status(200).send({
      success: true,
    });
  }
);
}