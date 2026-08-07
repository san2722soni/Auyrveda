import { FastifyInstance } from "fastify";
import { config } from "../config";
import { API_PATHS } from "../constants/api";
import { parseWhatsAppWebhook } from "../parsers/whatsapp";
import { MetaWebhookPayload } from "../types/meta";
import { handleConversation } from "../services/conversation";
import { sendMessages } from "../services/whatsapp";
import { getKnowledge } from "../services/knowledge";
import { generateReply } from "../services/openai";

export async function webhookRoutes(app: FastifyInstance) {
  app.get(API_PATHS.webhook, async (request, reply) => {
    const query = request.query as {
      "hub.mode"?: string;
      "hub.verify_token"?: string;
      "hub.challenge"?: string;
    };

    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === config.verifyToken
    ) {
      return reply.status(200).send(query["hub.challenge"]);
    }

    return reply.status(403).send("Verification failed");
  });

  if (config.enableTestEndpoints) {
    app.get(API_PATHS.testWhatsApp, async (request, reply) => {
      await sendMessages("916200855270", "Hello from WhatsApp API!");

      return reply.send({
        success: true,
      });
    });

    app.get(API_PATHS.testAi, async (request, reply) => {
      const knowledge = await getKnowledge();

      const aiReply = await generateReply(
        "What is the consultation fee?",
        knowledge
      );

      request.log.info({ aiReply }, "AI test reply");

      return reply.send({
        success: true,
        reply: aiReply,
      });
    });
  }

  app.post<{ Body: MetaWebhookPayload }>(
    API_PATHS.webhook,
    async (request, reply) => {
      const incoming = parseWhatsAppWebhook(request.body);

      if (!incoming) {
        return reply.status(200).send({
          success: true,
        });
      }

      try {
        await handleConversation(incoming);
      } catch (error) {
        request.log.error({ err: error }, "Conversation processing failed");
      }

      return reply.status(200).send({
        success: true,
      });
    }
  );
}
