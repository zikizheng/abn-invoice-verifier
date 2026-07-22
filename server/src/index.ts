import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes.ts";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";

const app = Fastify({ logger: true, trustProxy: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } });
await app.register(rateLimit, { global: true, max: 100, timeWindow: "1 minute" });

registerRoutes(app);

const webDist = path.join(import.meta.dirname, "../../web/dist");
await app.register(staticPlugin, { root: webDist });

app.setNotFoundHandler((request, reply) => {
    if (request.method === "GET" && !request.url.startsWith("/api/")) {
        return reply.sendFile("index.html");
    }
    return reply.status(404).send({ error: "Not found." });
});

try {
    const port = Number(process.env.PORT ?? 3000);
    await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
    app.log.error(err);
    process.exit(1);
}