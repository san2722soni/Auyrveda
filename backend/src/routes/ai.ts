import { FastifyInstance } from "fastify";
import { API_PATHS } from "../constants/api";
import { getKnowledge } from "../services/knowledge";
import { generateReply } from "../services/openai";

interface AiTestBody {
  message?: unknown;
}

export async function aiRoutes(app: FastifyInstance) {
  app.post<{ Body: AiTestBody }>(API_PATHS.aiTest, async (request, reply) => {
    const message =
      typeof request.body?.message === "string"
        ? request.body.message.trim()
        : "";

    if (!message) {
      return reply.status(400).send({ error: "Message is required" });
    }

    try {
      const knowledge = await getKnowledge();
      const result = await generateReply(message, knowledge);

      return reply.send({
        success: true,
        result,
      });
    } catch (error) {
      request.log.error({ err: error }, "AI test request failed");

      return reply.status(502).send({ error: "AI request failed" });
    }
  });
}
