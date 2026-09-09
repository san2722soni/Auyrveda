import { FastifyInstance } from "fastify";
import { config } from "../config";
import { API_PATHS } from "../constants/api";
import { parseWhatsAppWebhooks } from "../parsers/whatsapp";
import { enqueueMessages, startInboxWorker } from "../services/webhook-inbox";
import { verifyWebhookSignature } from "../lib/webhook-signature";
import { sendMessages } from "../services/whatsapp";
import { getKnowledge } from "../services/knowledge";
import { generateReply } from "../services/openai";

export async function webhookRoutes(app: FastifyInstance) {
  let stopWorker: (() => Promise<void>) | undefined;
  app.addHook("onClose", async () => { await stopWorker?.(); });
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });
  app.addHook("onReady", async () => {
    if (!config.metaAppSecret) app.log.error("META_APP_SECRET is missing; webhook POST requests are disabled");
    stopWorker = await startInboxWorker(app);
  });
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

  app.post<{ Body: Buffer }>(
    API_PATHS.webhook,
    async (request, reply) => {
      if (!config.metaAppSecret || !config.phoneNumberId) {
        return reply.status(503).send({ error: "Webhook configuration is incomplete" });
      }
      if (!Buffer.isBuffer(request.body) || !verifyWebhookSignature(request.body,
        request.headers["x-hub-signature-256"], config.metaAppSecret)) {
        return reply.status(401).send({ error: "Invalid webhook signature" });
      }
      let payload: unknown;
      try { payload = JSON.parse(request.body.toString("utf8")); }
      catch { return reply.status(400).send({ error: "Invalid JSON" }); }
      try {
        await enqueueMessages(parseWhatsAppWebhooks(payload, config.phoneNumberId));
      } catch (error) {
        request.log.error({ err: error }, "Could not persist webhook");
        return reply.status(503).send({ error: "Please retry webhook" });
      }

      return reply.status(200).send({
        success: true,
      });
    }
  );
}
