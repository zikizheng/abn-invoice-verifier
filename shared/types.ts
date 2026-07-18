export interface AbnRecord {
    abn: string;
    entityName: string;
    status: "Active" | "Cancelled";
    gstRegistered: boolean;
}

export interface Invoice {
    supplierName: string;
    abn: string;
    amount: number;
    gstCharged: boolean;
}

export type Decision = "approved" | "review" | "rejected"

export interface Flag {
    code: string;
    message: string;
    severity: "warning" | "error";
}

export interface VerificationResult{
    decision: Decision;
    flags: Flag[];
    checkedAt: string;
    record: AbnRecord | null;
}

export interface StoredInvoice extends Invoice {
    id: number;
    registeredName: string | null;
    decision: VerificationResult["decision"];
    flags: VerificationResult["flags"];
    checkedAt: string;
}