import Fastify from "fastify";
import { config } from "./config";
import { adminRoutes } from "./routes/admin";
import { appointmentRoutes } from "./routes/appointments";
import { webhookRoutes } from "./routes/webhook";
import { closeDatabase } from "./services/database";

const app = Fastify({
    logger: true
});

app.get("/", async () => {
    return {
        status: "ok",
        service: "WhatsApp AI Bot"
    };
});

app.register(webhookRoutes);
app.register(appointmentRoutes);
app.register(adminRoutes);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
    app.log.info({ signal }, "Shutting down");
    await closeDatabase();
    await app.close();
    process.exit(0);
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

const start = async () => {
    try {
        await app.listen({
            port: config.port,
            host: "0.0.0.0"
        });

        console.log(`Server running on http://localhost:${config.port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1)
    }
};

start();
