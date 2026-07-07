import Fastify from "fastify";
import { config } from "./config";
import { webhookRoutes } from "./routes/webhook";

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