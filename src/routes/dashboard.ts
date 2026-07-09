import { FastifyInstance } from "fastify";
import { API_PATHS } from "../constants/api";
import { getDashboardStats } from "../services/dashboard";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(API_PATHS.dashboardStats, async (request, reply) => {
    try {
      const stats = await getDashboardStats();

      return reply.send(stats);
    } catch (error) {
      request.log.error(error);

      return reply.status(500).send({ error: "Failed to fetch dashboard stats" });
    }
  });
}
