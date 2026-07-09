import Fastify from "fastify";
import { config } from "./config";
import { API_PATHS } from "./constants/api";
import { registerRoutes } from "./routes";
import { connectDatabase } from "./services/database";

const app = Fastify({
  logger: true,
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
