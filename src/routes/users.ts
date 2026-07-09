import { FastifyInstance } from "fastify";
import { API_PATHS } from "../constants/api";
import { parsePagination, PaginationQuery } from "../lib/pagination";
import { getMessagesByPhoneNumber } from "../services/messages";
import { getUsers } from "../services/users";

interface UserQuery extends PaginationQuery {
  search?: string;
}

interface UserMessagesParams {
  phoneNumber: string;
}

export async function userRoutes(app: FastifyInstance) {
  app.get<{ Querystring: UserQuery }>(
    API_PATHS.users,
    async (request, reply) => {
      const pagination = parsePagination(request.query);

      if (!pagination.ok) {
        return reply.status(400).send({ error: "Invalid pagination" });
      }

      try {
        const users = await getUsers({
          page: pagination.page,
          limit: pagination.limit,
          search: request.query.search,
        });

        return reply.send(users);
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({ error: "Failed to fetch users" });
      }
    }
  );

  app.get<{ Params: UserMessagesParams; Querystring: PaginationQuery }>(
    API_PATHS.userMessages,
    async (request, reply) => {
      const pagination = parsePagination(request.query);

      if (!pagination.ok) {
        return reply.status(400).send({ error: "Invalid pagination" });
      }

      if (!request.params.phoneNumber.trim()) {
        return reply.status(400).send({ error: "Invalid phone number" });
      }

      try {
        const messages = await getMessagesByPhoneNumber({
          phoneNumber: request.params.phoneNumber,
          page: pagination.page,
          limit: pagination.limit,
        });

        return reply.send(messages);
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({ error: "Failed to fetch messages" });
      }
    }
  );
}
