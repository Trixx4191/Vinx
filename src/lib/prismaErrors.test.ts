import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isStalePrismaClient } from "@/lib/prismaErrors";

describe("isStalePrismaClient", () => {
  // The exact error the dev server produced when SiteSetting existed in the
  // schema but not in the generated client.
  it("recognises a query on a model the client does not have", () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'upsert')");
    assert.equal(isStalePrismaClient(err), true);
  });

  it("recognises it for every delegate method", () => {
    for (const method of ["findMany", "findUnique", "create", "deleteMany", "count"]) {
      assert.equal(
        isStalePrismaClient(new TypeError(`Cannot read properties of undefined (reading '${method}')`)),
        true,
        method
      );
    }
  });

  /**
   * Narrowness is the point. An ordinary undefined-property bug must still be
   * reported as a bug — telling someone to regenerate the client when the real
   * problem is in their code sends them to fix the wrong thing.
   */
  it("does not claim ordinary TypeErrors", () => {
    for (const message of [
      "Cannot read properties of undefined (reading 'name')",
      "Cannot read properties of undefined (reading 'id')",
      "Cannot read properties of null (reading 'upsert')",
      "x.upsert is not a function"
    ]) {
      assert.equal(isStalePrismaClient(new TypeError(message)), false, message);
    }
  });

  it("does not claim errors that are not TypeErrors", () => {
    assert.equal(isStalePrismaClient(new Error("Cannot read properties of undefined (reading 'upsert')")), false);
    assert.equal(isStalePrismaClient("Cannot read properties of undefined (reading 'upsert')"), false);
    assert.equal(isStalePrismaClient(undefined), false);
  });
});
