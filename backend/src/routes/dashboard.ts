import { FastifyInstance } from "fastify";
import { API_PATHS } from "../constants/api";
import { parseClinicDate } from "../lib/clinic-date";
import { inbox } from "../services/webhook-inbox";
import {
  DashboardTrendPeriod,
  getDashboardStats,
} from "../services/dashboard";

interface DashboardStatsQuery {
  period?: string;
  anchorDate?: string;
}

function parsePeriod(value: string | undefined): DashboardTrendPeriod | null {
  if (value === undefined) {
    return "week";
  }

  if (value === "week" || value === "month") {
    return value;
  }

  return null;
}

function parseAnchorDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseClinicDate(value);
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/message-failures", async () => ({ data: await inbox()
    .find({ state: { $in: ["failed", "uncertain"] } })
    .project({ _id: 1, "incoming.from": 1, state: 1, createdAt: 1 }).sort({ createdAt: 1 }).limit(100).toArray() }));
  app.post<{ Params: { id: string }; Body: { action?: string } }>("/api/message-failures/:id", async (request, reply) => {
    const action = request.body?.action;
    if (action !== "reviewed" && action !== "retry") return reply.status(400).send({ error: "Invalid action" });
    const result = await inbox().updateOne({ _id: request.params.id,
      state: action === "retry" ? "failed" : { $in: ["failed", "uncertain"] } },
      { $set: action === "retry" ? { state: "pending", attempts: 0, nextAttemptAt: new Date() } : { state: "done" } });
    return result.matchedCount ? { success: true } : reply.status(409).send({ error: "Message state changed; refresh and try again" });
  });
  app.get<{ Querystring: DashboardStatsQuery }>(
    API_PATHS.dashboardStats,
    async (request, reply) => {
      const period = parsePeriod(request.query.period);
      const anchorDate = parseAnchorDate(request.query.anchorDate);

      if (!period) {
        return reply.status(400).send({ error: "Invalid dashboard period" });
      }

      if (anchorDate === null) {
        return reply.status(400).send({ error: "Invalid dashboard anchor date" });
      }

      try {
        const stats = await getDashboardStats({
          trendPeriod: period,
          anchorDate,
        });

        return reply.send(stats);
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({ error: "Failed to fetch dashboard stats" });
      }
    }
  );
}
