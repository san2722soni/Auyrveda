import { FastifyInstance } from "fastify";
import { API_PATHS } from "../constants/api";
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

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export async function dashboardRoutes(app: FastifyInstance) {
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
