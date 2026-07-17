import type { FastifyInstance } from "fastify";
import type { Invoice } from "../../shared/types.ts";
import { isValidAbn } from "./abn.ts";
import { verifyInvoice } from "./rules.ts";
import { StubAbrClient, type AbrClient } from "./abrClient.ts";
import { saveInvoice, listInvoices } from "./db.ts";

const client: AbrClient = new StubAbrClient();

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
    const record = isValidAbn(invoice.abn) ? await client.lookup(invoice.abn) : null;
    const result = verifyInvoice(invoice, record);
    const stored = saveInvoice(invoice, result);

    return reply.send(stored);
  });

  app.get("/api/invoices", async () => listInvoices());
}