import { FastifyInstance } from "fastify";
import { API_PATHS } from "../constants/api";
import {
  APPOINTMENT_STATUSES,
  AppointmentStatus,
} from "../constants/appointments";
import { parsePagination, PaginationQuery } from "../lib/pagination";
import { hasOnlyBooleanProperty } from "../lib/request-body";
import {
  getAppointments,
  updateAppointmentStatus,
} from "../services/appointments";

interface AppointmentQuery extends PaginationQuery {
  status?: string;
  dateCategory?: string;
  search?: string;
}

interface AppointmentParams {
  id: string;
}

function parseStatus(value: string | undefined): AppointmentStatus | null {
  if (value === undefined) {
    return "all";
  }

  if (APPOINTMENT_STATUSES.includes(value as AppointmentStatus)) {
    return value as AppointmentStatus;
  }

  return null;
}

function parseDateCategory(
  value: string | undefined
): "all" | "today" | "upcoming" | "past" | null {
  if (value === undefined) {
    return "all";
  }

  if (
    value === "all" ||
    value === "today" ||
    value === "upcoming" ||
    value === "past"
  ) {
    return value;
  }

  return null;
}

export async function appointmentRoutes(app: FastifyInstance) {
  app.get<{ Querystring: AppointmentQuery }>(
    API_PATHS.appointments,
    async (request, reply) => {
      const pagination = parsePagination(request.query);
      const status = parseStatus(request.query.status);
      const dateCategory = parseDateCategory(request.query.dateCategory);

      if (!pagination.ok) {
        return reply.status(400).send({ error: "Invalid pagination" });
      }

      if (!status) {
        return reply.status(400).send({ error: "Invalid appointment status" });
      }

      if (!dateCategory) {
        return reply.status(400).send({ error: "Invalid appointment date filter" });
      }

      try {
        const appointments = await getAppointments({
          page: pagination.page,
          limit: pagination.limit,
          status,
          dateCategory,
          search: request.query.search,
        });

        return reply.send(appointments);
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({ error: "Failed to fetch appointments" });
      }
    }
  );

  app.patch<{ Params: AppointmentParams; Body: unknown }>(
    API_PATHS.appointmentById,
    async (request, reply) => {
      if (!hasOnlyBooleanProperty(request.body, "isCompleted")) {
        return reply.status(400).send({ error: "Invalid appointment update" });
      }

      try {
        const result = await updateAppointmentStatus(
          request.params.id,
          request.body.isCompleted
        );

        if (!result.ok && result.reason === "invalid-id") {
          return reply.status(400).send({ error: "Invalid appointment id" });
        }

        if (!result.ok && result.reason === "not-found") {
          return reply.status(404).send({ error: "Appointment not found" });
        }

        if (result.ok) {
          return reply.send({
            success: true,
            data: result.appointment,
          });
        }
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({ error: "Failed to update appointment" });
      }
    }
  );
}
