import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes.ts";
import multipart from "@fastify/multipart";

const app = Fastify({ logger: true });

await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

await app.register(cors, { origin: true });
registerRoutes(app);

try {
    const port = Number(process.env.PORT ?? 3000);
    await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
    app.log.error(err);
    process.exit(1);
}