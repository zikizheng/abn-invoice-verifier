import type { FastifyInstance } from "fastify";
import type { Invoice, AbnRecord } from "../../shared/types.ts";
import { isValidAbn } from "../../shared/abn.ts";
import { verifyInvoice } from "./rules.ts";
import { HttpAbrClient, StubAbrClient, type AbrClient } from "./abrClient.ts";
import { saveInvoice, listInvoices } from "./db.ts";
import { StubExtractor, TextractExtractor, type InvoiceExtractor } from "./extractor.ts";
import { consumeExtractionQuota, remainingQuota } from "./quota.ts";

const extractor: InvoiceExtractor = process.env.AWS_ACCESS_KEY_ID
    ? new TextractExtractor(process.env.AWS_REGION ?? "ap-southeast-2")
    : new StubExtractor();

const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const guid = process.env.ABR_GUID;
if (!guid) throw new Error("ABR_GUID is not set: add it to server/.env");
const client: AbrClient =
    process.env.USE_STUB_ABR === "true"
        ? new StubAbrClient()
        : (() => {
            if (!guid) throw new Error("ABR_GUID is not set: Add it to server/.env");
            return new HttpAbrClient(guid);
        })();

export function registerRoutes(app: FastifyInstance) {
    app.post("/api/invoices", async (request, reply) => {
        const invoice = request.body as Invoice;

        if (
            !invoice ||
            typeof invoice.supplierName !== "string" ||
            typeof invoice.abn !== "string" ||
            typeof invoice.amount !== "number" ||
            typeof invoice.gstCharged !== "boolean"
        ) {
            return reply.status(400).send({ error: "Invalid invoice payload." });
        }

        // Only spend an ABR lookup if the ABN passes the local checksum.
        let record: AbnRecord | null = null;
        if (isValidAbn(invoice.abn)) {
            try {
                record = await client.lookup(invoice.abn);
            } catch (err) {
                request.log.error(err);
                return reply.status(502).send({ error: "Couldn't reach the ABN Register: please try again shortly." });
            }
        }
        const result = verifyInvoice(invoice, record);
        const stored = saveInvoice(invoice, result);

        return reply.send(stored);
    });

    app.get("/api/invoices", async () => listInvoices());

    app.post("/api/extract", {
        config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    }, async (request, reply) => {
        const data = await request.file();
        if (!data) return reply.status(400).send({ error: "No file uploaded." });

        if (!ALLOWED_TYPES.includes(data.mimetype)) {
            return reply.status(415).send({ error: "Upload a PDF, PNG, or JPEG." })
        }

        let buffer: Buffer;
        try {
            buffer = await data.toBuffer();
        } catch {
            return reply.status(413).send({ error: "File is too large (5 MB max)." });
        }


        if (!consumeExtractionQuota()) {
            return reply.status(429).send({
                error: "The daily scanning limit for this demo has been reached — enter the details manually, or try again tomorrow.",
            });
        }
        try {
            const draft = await extractor.extract(buffer);
            reply.header("X-Quota-Remaining", String(remainingQuota()));
            return reply.send(draft);;
        } catch (err) {
            request.log.error(err);
            return reply.status(502).send({ error: "Couldn't read that document. Enter the details manually." });
        }
    })

    app.get("/api/quota", async () => ({ remaining: remainingQuota() }));
}