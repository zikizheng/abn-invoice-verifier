import { isValidAbn } from "../../shared/abn.ts";
import type { AbnRecord, Invoice, VerificationResult, Flag } from "../../shared/types.ts";

/** How similar two business names must be to count as a match (0 - 1). */
const NAME_MATCH_THRESHOLD = 0.85;

export function verifyInvoice(invoice: Invoice, record: AbnRecord | null): VerificationResult{
    const flags: Flag[] = [];

    //Rule 1: ABN must be well-formed (local checksum)
    if (!isValidAbn(invoice.abn)) {
        flags.push({
            code: "ABN_INVALID_FORMAT",
            message: "ABN fails the checksum. It is not a valid ABN",
            severity: "error",
        });
        return finalise(flags, record)
    }

    // Rule 2: ABN must exist on the register.
    if (record === null) {
        flags.push({
            code: "ABN_NOT_FOUND",
            message: "ABN was not found on the Australian Business Register.",
            severity: "error",
        })
        return finalise(flags, record);
    }

    // Rule 3: ABN must be active, not cancelled.
    if (record.status !== "Active") {
        flags.push({
            code: "ABN_CANCELLED",
            message: `ABN is ${record.status.toLowerCase()} on the register.`,
            severity: "error",
        });
    }
    
    // Rule 4: registered entity name should resemble the invoice supplier
    if (nameSimilarity(invoice.supplierName, record.entityName) < NAME_MATCH_THRESHOLD){
        flags.push({
            code: "NAME_MISMATCH",
            message: `Invoice supplier "${invoice.supplierName}" does not match registered name "${record.entityName}".`,
            severity: "warning",
        });
    }

    // Rule 5: GST charged, but the supplier is not registered for GST.
    if (invoice.gstCharged && !record.gstRegistered) {
        flags.push({
            code: "GST_NOT_REGISTERED",
            message: "Invoice charges GST, but the supplier is not registered for GST.",
            severity: "error",
        });
    }
    return finalise(flags, record);
}


function finalise(flags: Flag[], record: AbnRecord | null): VerificationResult {
    const decision: VerificationResult["decision"] = 
    flags.some((f) => f.severity === "error") ? "rejected"
    : flags.length > 0 ? "review"
    : "approved";
    return { decision, flags, checkedAt: new Date().toISOString(), record };
}

/** Normalise a business name: lowercase, strip punctuation and legal suffixes. */
function normaliseName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\b(pty|ltd|limited|inc|incorporated|the|co|company)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function nameSimilarity(a: string, b: string): number {
    const s1 = normaliseName(a);
    const s2 = normaliseName(b);
    if (s1 === s2) return 1;
    if (!s1 || !s2) return 0;
    return 1 - levenshtein(s1, s2) / Math.max(s1.length, s2.length);
}

function levenshtein(a: string, b: string): number{
    const dp = Array.from({ length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++){
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] +1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[a.length][b.length];
}