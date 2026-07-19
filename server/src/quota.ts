import { db } from "./db.ts";

const DAILY_LIMIT = Number(process.env.MAX_EXTRACTIONS_PER_DAY ?? 25);

db.exec(`
    CREATE TABLE IF NOT EXISTS extraction_quota (
    day TEXT PRIMARY KEY,
    count INTEGER NOT NULL
    )
`);

const readStmt = db.prepare(`SELECT count FROM extraction_quota WHERE day = ?`);
const bumpStmt = db.prepare(`
    INSERT INTO extraction_quota (day, count) VALUES (?, 1)
    ON CONFLICT(day) DO UPDATE SET count = count + 1
`)

const today = () => new Date().toISOString().slice(0, 10);

export function consumeExtractionQuota(): boolean {
    const day = today();
    const row = readStmt.get(day) as { count: number } | undefined;
    if ((row?.count ?? 0) >= DAILY_LIMIT) return false;
    bumpStmt.run(day);
    return true;
}

export function remainingQuota(): number {
    const row = readStmt.get(today()) as { count: number } | undefined;
    return Math.max(0, DAILY_LIMIT - (row?.count ?? 0));
}