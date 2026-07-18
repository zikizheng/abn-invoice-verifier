import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAbrResponse } from "./abrClient.ts";

test("parses an active, GST-registered business", () => {
    const jsonp = `callback({"Abn":"51824753556","AbnStatus":"Active","EntityName":"Australian Taxation Office","Gst":"2000-07-01","Message":""})`;
    const r = parseAbrResponse(jsonp);
    assert.equal(r?.status, "Active");
    assert.equal(r?.gstRegistered, true);
});

test("empty Gst maps to not registered", () => {
    const jsonp = `callback({"Abn":"12345678901","AbnStatus":"Active","EntityName":"Small Sole Trader","Gst":"","Message":""})`;
    assert.equal(parseAbrResponse(jsonp)?.gstRegistered, false);
});

test("returns null when the ABN is not found", () => {
    const jsonp = `callback({"Abn":"","AbnStatus":"","EntityName":"","Gst":null,"Message":"Search text is not a valid ABN or ACN"})`;
    assert.equal(parseAbrResponse(jsonp), null);
});