import { FastifyInstance } from "fastify";
import { config } from "../config";
import { ADMIN_ROLE } from "../constants/auth";
import { API_PATHS } from "../constants/api";
import { AdminUser } from "../types/auth";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

interface LoginResponse {
  token: string;
  user: AdminUser;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody; Reply: LoginResponse | { error: string } }>(
    API_PATHS.authLogin,
    async (request, reply) => {
      const username =
        typeof request.body?.username === "string"
          ? request.body.username.trim()
          : "";
      const password =
        typeof request.body?.password === "string"
          ? request.body.password
          : "";

      if (
        username !== config.adminUsername ||
        password !== config.adminPassword
      ) {
        return reply.status(401).send({ error: "Invalid login credentials" });
      }

      const user: AdminUser = {
        username: config.adminUsername,
        role: ADMIN_ROLE,
      };
      const token = await reply.jwtSign(user);

      return reply.send({
        token,
        user,
      });
    }
  );
}
