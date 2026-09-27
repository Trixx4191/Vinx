import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { publicFileExists, firstExistingImage } from "@/lib/publicAsset";

describe("publicFileExists", () => {
  it("finds a file that is really in public/", () => {
    assert.equal(publicFileExists("/images/home/hero.jpg"), true);
    assert.equal(publicFileExists("images/home/hero.jpg"), true, "a leading slash is optional");
  });

  it("reports a missing file as missing", () => {
    assert.equal(publicFileExists("/images/home/does-not-exist.jpg"), false);
  });

  /**
   * The function joins its argument onto a filesystem path, so it must refuse
   * to look outside public/. Nothing in the app passes user input here today,
   * but a helper that resolves paths is exactly the kind of thing that later
   * gets called with a value from a request.
   */
  it("refuses to escape the public directory", () => {
    for (const path of [
      "../.env",
      "/../.env",
      "../../etc/passwd",
      "images/../../.env",
      "/images/../../package.json"
    ]) {
      assert.equal(publicFileExists(path), false, `expected ${path} to be refused`);
    }
  });

  it("does not confirm files that exist outside public/", () => {
    // package.json is real, but it is one level above public/ and must not
    // be reachable through this helper.
    assert.equal(publicFileExists("../package.json"), false);
  });
});

describe("firstExistingImage", () => {
  it("returns the first candidate that exists", () => {
    assert.equal(
      firstExistingImage("/images/home/missing.jpg", "/images/home/hero.jpg"),
      "/images/home/hero.jpg"
    );
  });

  it("returns null when nothing exists, so the caller can render a deliberate blank", () => {
    assert.equal(firstExistingImage("/images/a.jpg", "/images/b.jpg"), null);
  });

  it("skips undefined and null candidates rather than throwing", () => {
    assert.equal(firstExistingImage(undefined, null, "/images/home/hero.jpg"), "/images/home/hero.jpg");
    assert.equal(firstExistingImage(undefined, null), null);
  });
});
