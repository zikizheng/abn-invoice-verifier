import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes.ts";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";

const app = Fastify({ logger: true, trustProxy: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } });
await app.register(rateLimit, { global: false });

registerRoutes(app);

try {
    const port = Number(process.env.PORT ?? 3000);
    await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
    app.log.error(err);
    process.exit(1);
}