import type { Invoice, StoredInvoice, DraftInvoice } from "../../shared/types"

export async function verifyInvoice(invoice: Invoice): Promise<StoredInvoice> {
    const res = await fetch("api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
    }
    return res.json();
}

export async function listInvoices(): Promise<StoredInvoice[]> {
    const res = await fetch("/api/invoices");
    if (!res.ok) {
        throw new Error(`Couldn't load invoices (${res.status})`);
    }
    return res.json();
}

export async function extractInvoice(file: File): Promise<DraftInvoice> {
    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/extract", { method: "POST", body });
    if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.eeor ?? `Extraction failed (${res.status})`);
    }
    return res.json();
}