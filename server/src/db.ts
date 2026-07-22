import Database from "better-sqlite3";
import type { Invoice, VerificationResult } from "../../shared/types.ts";
import type { StoredInvoice } from "../../shared/types.ts";

export const db = new Database(process.env.DB_PATH ?? "invoices.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT NOT NULL,
    abn TEXT NOT NULL,
    amount REAL NOT NULL,
    gst_charged INTEGER NOT NULL,
    registered_name TEXT NOT NULL,
    decision TEXT NOT NULL,
    flags TEXT NOT NULL,
    checked_at TEXT NOT NULL
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO invoices (supplier_name, abn, amount, gst_charged, registered_name, decision, flags, checked_at)
  VALUES (@supplierName, @abn, @amount, @gstCharged, @registeredName, @decision, @flags, @checkedAt)
`);

export function saveInvoice(invoice: Invoice, result: VerificationResult): StoredInvoice {
    const registeredName = result.record?.entityName ?? null;
    const info = insertStmt.run({
        supplierName: invoice.supplierName,
        abn: invoice.abn,
        amount: invoice.amount,
        gstCharged: invoice.gstCharged ? 1 : 0,
        registeredName,
        decision: result.decision,
        flags: JSON.stringify(result.flags),
        checkedAt: result.checkedAt,
    });
    return { id: Number(info.lastInsertRowid), ...invoice, registeredName, decision: result.decision, flags: result.flags, checkedAt: result.checkedAt };
}

const listStmt = db.prepare(`SELECT * FROM invoices ORDER BY id DESC LIMIT 100`);

export function listInvoices(): StoredInvoice[] {
    return listStmt.all().map((row: any) => ({
        id: row.id,
        supplierName: row.supplier_name,
        abn: row.abn,
        amount: row.amount,
        gstCharged: row.gst_charged === 1,
        registeredName: row.registered_name,
        decision: row.decision,
        flags: JSON.parse(row.flags),
        checkedAt: row.checked_at,
    }));
}