import type { FastifyInstance } from "fastify";
import type { Invoice, AbnRecord } from "../../shared/types.ts";
import { isValidAbn } from "./abn.ts";
import { verifyInvoice } from "./rules.ts";
import { HttpAbrClient, StubAbrClient, type AbrClient } from "./abrClient.ts";
import { saveInvoice, listInvoices } from "./db.ts";

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
    app.post("/api/verify", async (request, reply) => {
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
                return reply.status(502).send({ error: "Couldn't reach the ABN Register: please try again shortly."});
            }
        }
        const result = verifyInvoice(invoice, record);
        const stored = saveInvoice(invoice, result);

        return reply.send(stored);
    });

    app.get("/api/invoices", async () => listInvoices());
}