import { FastifyInstance } from "fastify";
import {
  listAppointments,
  setAppointmentCompletion,
} from "../services/appointments";

interface AppointmentParams {
  id: string;
}

interface AppointmentCompletionBody {
  isCompleted?: boolean;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function appointmentRoutes(app: FastifyInstance) {
  app.get("/api/appointments", async (_request, reply) => {
    try {
      const appointments = await listAppointments();
      return reply.send({ appointments });
    } catch (error) {
      app.log.error(error);
      return reply.status(503).send({
        error: "Appointments are unavailable",
        message: getErrorMessage(error),
      });
    }
  });

  app.patch<{
    Params: AppointmentParams;
    Body: AppointmentCompletionBody;
  }>("/api/appointments/:id", async (request, reply) => {
    const isCompleted = request.body?.isCompleted;

    if (typeof isCompleted !== "boolean") {
      return reply.status(400).send({
        error: "isCompleted must be a boolean",
      });
    }

    try {
      const appointment = await setAppointmentCompletion(
        request.params.id,
        isCompleted
      );

      if (!appointment) {
        return reply.status(404).send({
          error: "Appointment not found",
        });
      }

      return reply.send({ appointment });
    } catch (error) {
      app.log.error(error);
      return reply.status(503).send({
        error: "Appointment update failed",
        message: getErrorMessage(error),
      });
    }
  });
}
