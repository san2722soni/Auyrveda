import { FastifyInstance } from "fastify";
import { appointmentRoutes } from "./appointments";
import { dashboardRoutes } from "./dashboard";
import { knowledgeRoutes } from "./knowledge";
import { userRoutes } from "./users";
import { webhookRoutes } from "./webhook";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(webhookRoutes);
  await app.register(appointmentRoutes);
  await app.register(userRoutes);
  await app.register(dashboardRoutes);
  await app.register(knowledgeRoutes);
}
