import type { AbnRecord } from "../../shared/types.ts";

export interface AbrClient {
  lookup(abn: string): Promise<AbnRecord | null>;
}

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

export class HttpAbrClient implements AbrClient {
  private guid: string;

  constructor(guid: string) {
    this.guid = guid;
  }

  async lookup(_abn: string): Promise<AbnRecord | null> {
    throw new Error("Not implemented yet");
  }
}