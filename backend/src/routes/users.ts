import { FastifyInstance } from "fastify";
import { APPOINTMENT_DETAILS_REQUEST_MESSAGE } from "../constants/appointments";
import { API_PATHS } from "../constants/api";
import { parsePagination, PaginationQuery } from "../lib/pagination";
import { isNonEmptyStringWithinLimit } from "../lib/request-body";
import { getMessagesByPhoneNumber } from "../services/messages";
import {
  sendStaffMessage,
  setUserReplyMode,
  startAppointmentAssistant,
  getUsers,
} from "../services/users";

interface UserQuery extends PaginationQuery {
  search?: string;
}

interface UserMessagesParams {
  phoneNumber: string;
}

interface UserReplyModeBody {
  replyMode?: unknown;
}

interface UserSendMessageBody {
  message?: unknown;
}

function parsePhoneNumber(value: string): string | null {
  const phoneNumber = value.trim();

  return phoneNumber ? phoneNumber : null;
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

  app.patch<{ Params: UserMessagesParams; Body: UserReplyModeBody }>(
    API_PATHS.userReplyMode,
    async (request, reply) => {
      const phoneNumber = parsePhoneNumber(request.params.phoneNumber);
      const replyMode = request.body?.replyMode;

      if (!phoneNumber) {
        return reply.status(400).send({ error: "Invalid phone number" });
      }

      if (replyMode !== "ai" && replyMode !== "manual") {
        return reply.status(400).send({ error: "Invalid reply mode" });
      }

      try {
        const user = await setUserReplyMode(phoneNumber, replyMode);

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.send({ success: true, data: user });
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({ error: "Failed to update reply mode" });
      }
    }
  );

  app.post<{ Params: UserMessagesParams; Body: UserSendMessageBody }>(
    API_PATHS.userSendMessage,
    async (request, reply) => {
      const phoneNumber = parsePhoneNumber(request.params.phoneNumber);

      if (!phoneNumber) {
        return reply.status(400).send({ error: "Invalid phone number" });
      }

      if (!isNonEmptyStringWithinLimit(request.body?.message, 4000)) {
        return reply.status(400).send({ error: "Invalid message" });
      }

      try {
        const user = await sendStaffMessage(phoneNumber, request.body.message.trim());

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.send({ success: true, data: user });
      } catch (error) {
        request.log.error(error);

        return reply.status(502).send({ error: "Failed to send message" });
      }
    }
  );

  app.post<{ Params: UserMessagesParams }>(
    API_PATHS.userStartAppointment,
    async (request, reply) => {
      const phoneNumber = parsePhoneNumber(request.params.phoneNumber);

      if (!phoneNumber) {
        return reply.status(400).send({ error: "Invalid phone number" });
      }

      try {
        const user = await startAppointmentAssistant(
          phoneNumber,
          APPOINTMENT_DETAILS_REQUEST_MESSAGE
        );

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.send({ success: true, data: user });
      } catch (error) {
        request.log.error(error);

        return reply.status(502).send({ error: "Failed to start appointment booking" });
      }
    }
  );
}
