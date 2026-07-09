import Fastify from "fastify";
import { config } from "./config";
import { API_PATHS } from "./constants/api";
import { registerRoutes } from "./routes";
import { connectDatabase } from "./services/database";

const app = Fastify({
  logger: true,
});

app.addHook("onRequest", async (request, reply) => {
  const origin = request.headers.origin;
  const allowedOrigins = config.frontendOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
    reply.header(
      "Access-Control-Allow-Origin",
      allowedOrigins.includes("*") ? "*" : origin
    );
    reply.header("Vary", "Origin");
  }

  reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    return reply.status(204).send();
  }
});

app.get(API_PATHS.root, async () => {
  return {
    status: "ok",
    service: "WhatsApp AI Bot",
  };
});

app.register(registerRoutes);

const start = async () => {
  try {
    // Connect database first
    await connectDatabase();

    // Start server only after database connection succeeds
    await app.listen({
      port: config.port,
      host: "0.0.0.0",
    });

    console.log(`Server running on http://localhost:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
