import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeCallbackPath } from "@/lib/safeRedirect";

describe("safeCallbackPath", () => {
  it("keeps same-site paths", () => {
    for (const path of ["/", "/account", "/products?category=hoodies", "/orders/abc123"]) {
      assert.equal(safeCallbackPath(path), path);
    }
  });

  /**
   * The open redirect. Each of these starts with "/", which is all the old
   * check tested, and each sends the browser to another host.
   */
  it("refuses anything a browser would treat as another host", () => {
    for (const hostile of [
      "//evil.example",
      "//evil.example/account",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "https://evil.example",
      "javascript:alert(1)",
      "evil.example"
    ]) {
      assert.equal(safeCallbackPath(hostile), "/", JSON.stringify(hostile));
    }
  });

  it("falls back when nothing usable is given", () => {
    assert.equal(safeCallbackPath(null), "/");
    assert.equal(safeCallbackPath(undefined), "/");
    assert.equal(safeCallbackPath(""), "/");
    assert.equal(safeCallbackPath("//x", "/account"), "/account");
  });
});
