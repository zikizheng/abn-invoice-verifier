import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidAbn } from "../../shared/abn.ts";

test("valid ABNs pass", () => {
    assert.ok(isValidAbn("51824753556"));     // the ATO's own ABN
    assert.ok(isValidAbn("51 824 753 556"));  // spaces tolerated
});

test("invalid ABNs fail", () => {
    assert.ok(!isValidAbn("51824753557"));    // last digit wrong
    assert.ok(!isValidAbn("123"));            // wrong length
    assert.ok(!isValidAbn("notanabn!!!"));    // no digits
});