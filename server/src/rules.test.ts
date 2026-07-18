import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyInvoice } from "./rules.ts";
import type { AbnRecord, Invoice } from "../../shared/types.ts";

const activeRecord: AbnRecord = {
    abn: "51824753556",
    entityName: "Acme Staging Pty Ltd",
    status: "Active",
    gstRegistered: true,
};

const baseInvoice: Invoice = {
    supplierName: "Acme Staging",
    abn: "51824753556",
    amount: 1200,
    gstCharged: true,
};

test("clean invoice is approved", () => {
    const r = verifyInvoice(baseInvoice, activeRecord);
    assert.equal(r.decision, "approved");
    assert.equal(r.flags.length, 0);
});

test("GST charged by a non-registered supplier is rejected", () => {
    const r = verifyInvoice(baseInvoice, { ...activeRecord, gstRegistered: false });
    assert.equal(r.decision, "rejected");
    assert.ok(r.flags.some((f) => f.code === "GST_NOT_REGISTERED"));
});

test("cancelled ABN is rejected", () => {
    const r = verifyInvoice(baseInvoice, { ...activeRecord, status: "Cancelled" });
    assert.ok(r.flags.some((f) => f.code === "ABN_CANCELLED"));
});

test("a different supplier name is flagged for review", () => {
    const r = verifyInvoice({ ...baseInvoice, supplierName: "Completely Different Co" }, activeRecord);
    assert.equal(r.decision, "review");
    assert.ok(r.flags.some((f) => f.code === "NAME_MISMATCH"));
});

test("malformed ABN is rejected before any lookup", () => {
    const r = verifyInvoice({ ...baseInvoice, abn: "51824753557" }, null);
    assert.ok(r.flags.some((f) => f.code === "ABN_INVALID_FORMAT"));
});

test("valid but unregistered ABN is not found", () => {
    const r = verifyInvoice(baseInvoice, null);
    assert.ok(r.flags.some((f) => f.code === "ABN_NOT_FOUND"));
});