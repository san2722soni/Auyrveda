import { FastifyInstance } from "fastify";
import { API_PATHS } from "../constants/api";
import { isNonEmptyStringWithinLimit } from "../lib/request-body";
import {
  getKnowledge,
  MAX_KNOWLEDGE_CONTENT_LENGTH,
  updateKnowledge,
} from "../services/knowledge";

interface KnowledgeBody {
  content?: unknown;
}

export async function knowledgeRoutes(app: FastifyInstance) {
  app.get(API_PATHS.knowledge, async (request, reply) => {
    try {
      const content = await getKnowledge();

      return reply.send({ content });
    } catch (error) {
      request.log.error(error);

      return reply.status(500).send({ error: "Failed to fetch knowledge" });
    }
  });

  app.put<{ Body: KnowledgeBody }>(
    API_PATHS.knowledge,
    async (request, reply) => {
      if (
        !isNonEmptyStringWithinLimit(
          request.body?.content,
          MAX_KNOWLEDGE_CONTENT_LENGTH
        )
      ) {
        return reply.status(400).send({ error: "Invalid knowledge content" });
      }

      try {
        await updateKnowledge(request.body.content);

        return reply.send({ success: true });
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({ error: "Failed to update knowledge" });
      }
    }
  );
}
