import type { AbnRecord } from "../../shared/types.ts";

export interface AbrClient {
    lookup(abn: string): Promise<AbnRecord | null>;
}

/** Canned data: used by tests and for offline development. */
export class StubAbrClient implements AbrClient {
    private data: Record<string, AbnRecord> = {
        "51824753556": {
            abn: "51824753556",
            entityName: "Australian Taxation Office",
            status: "Active",
            gstRegistered: true,
        }
    };

    async lookup(abn: string): Promise<AbnRecord | null> {
        return this.data[abn.replace(/\s/g, "")] ?? null;
    }
}

interface AbrPayload {
    Abn: string;
    AbnStatus: string;
    EntityName: string;
    Gst: string | null;
    Message: string;
}

export class HttpAbrClient implements AbrClient {
    private guid: string;
    private baseUrl = "https://abr.business.gov.au/json/AbnDetails.aspx";

    constructor(guid: string) {
        this.guid = guid;
    }

    async lookup(abn: string): Promise<AbnRecord | null> {
        const cleaned = abn.replace(/\s/g, "");
        const url =
            `${this.baseUrl}?abn=${encodeURIComponent(cleaned)}` +
            `&callback=callback&guid=${encodeURIComponent(this.guid)}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`ABR request failed: ${response.status} ${response.statusText}`);
        }
        return parseAbrResponse(await response.text());
    }
}

export function parseAbrResponse(text: string): AbnRecord | null {
    const payload = unwrapJsonp(text)

    if (payload.Message || !payload.Abn) return null;

    return {
        abn: payload.Abn,
        entityName: payload.EntityName,
        status: payload.AbnStatus === "Active" ? "Active" : "Cancelled",

        gstRegistered: Boolean(payload.Gst && payload.Gst.trim() !== ""),
    };
}

function unwrapJsonp(text: string): AbrPayload {
    const start = text.indexOf("(");
    const end = text.lastIndexOf(")");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Unexpected ABR response (not JSONP)");
    }
    return JSON.parse(text.slice(start + 1, end)) as AbrPayload;
}