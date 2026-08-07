import { FastifyReply, FastifyRequest } from "fastify";

export type AdminRole = "admin";

export interface AdminUser {
  username: string;
  role: AdminRole;
}

export interface AuthTokenPayload extends AdminUser {}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    requireAdmin: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  interface FastifyRequest {
    admin?: AdminUser;
  }
}
