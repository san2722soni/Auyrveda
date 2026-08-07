import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ADMIN_ROLE, JWT_EXPIRES_IN } from "../constants/auth";
import { API_PATHS } from "../constants/api";
import { config } from "../config";
import { AuthTokenPayload } from "../types/auth";

const PUBLIC_PATHS = new Set<string>([
  API_PATHS.root,
  API_PATHS.webhook,
  API_PATHS.authLogin,
]);

function getPath(url: string): string {
  return url.split("?")[0] ?? url;
}

function isPublicRequest(request: FastifyRequest): boolean {
  if (request.method === "OPTIONS") {
    return true;
  }

  return PUBLIC_PATHS.has(getPath(request.url));
}

export function registerAuth(app: FastifyInstance): void {
  app.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: JWT_EXPIRES_IN,
    },
  });

  app.decorate(
    "requireAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = await request.jwtVerify<AuthTokenPayload>();

        if (payload.role !== ADMIN_ROLE) {
          await reply.status(403).send({ error: "Admin access required" });
          return;
        }

        request.admin = {
          username: payload.username,
          role: payload.role,
        };
      } catch {
        await reply.status(401).send({ error: "Authentication required" });
      }
    }
  );

  app.addHook("preHandler", async (request, reply) => {
    if (isPublicRequest(request)) {
      return;
    }

    await app.requireAdmin(request, reply);
  });
}
