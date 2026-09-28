import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  extensionForContentType,
  buildStorageKey,
  isS3Configured,
  STORAGE_KEY_PATTERN,
  getPresignedUploadUrl,
  sniffImageType,
  buildAvatarKey,
  AVATAR_KEY_PATTERN
} from "@/lib/storage";

const S3_VARS = [
  "STORAGE_DRIVER",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
  "S3_PUBLIC_URL_BASE"
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(S3_VARS.map((key) => [key, process.env[key]]));
  for (const key of S3_VARS) delete process.env[key];
});

afterEach(() => {
  for (const key of S3_VARS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("extensionForContentType", () => {
  it("permits the four supported types", () => {
    assert.equal(extensionForContentType("image/jpeg"), "jpg");
    assert.equal(extensionForContentType("image/png"), "png");
    assert.equal(extensionForContentType("image/webp"), "webp");
    assert.equal(extensionForContentType("video/mp4"), "mp4");
  });

  // The map IS the allowlist: anything absent from it cannot be uploaded.
  it("refuses everything else, including types that could carry script", () => {
    for (const type of [
      "image/svg+xml",
      "text/html",
      "application/javascript",
      "application/octet-stream",
      "video/quicktime",
      ""
    ]) {
      assert.equal(
        extensionForContentType(type),
        undefined,
        `expected ${JSON.stringify(type)} to be refused`
      );
    }
  });
});

describe("buildStorageKey", () => {
  it("produces keys matching the pattern the upload route validates against", () => {
    for (const ext of ["jpg", "png", "webp", "mp4"]) {
      const key = buildStorageKey(ext);
      assert.match(key, STORAGE_KEY_PATTERN, `${key} should satisfy STORAGE_KEY_PATTERN`);
    }
  });

  it("never collides", () => {
    const keys = new Set(Array.from({ length: 500 }, () => buildStorageKey("png")));
    assert.equal(keys.size, 500);
  });

  it("puts every object under the products/ prefix", () => {
    assert.ok(buildStorageKey("png").startsWith("products/"));
  });
});

describe("STORAGE_KEY_PATTERN", () => {
  /**
   * The local upload route takes its key from the client's query string and
   * writes to that path on disk. The pattern is the only thing standing
   * between that and an arbitrary file write, so it is tested directly rather
   * than trusted by inspection.
   */
  it("rejects path traversal in every shape", () => {
    for (const key of [
      "products/../../../etc/passwd",
      "../../.env",
      "products/..%2f..%2fetc%2fpasswd",
      "/etc/passwd",
      "products/subdir/file.png",
      "products/.png"
    ]) {
      assert.equal(
        STORAGE_KEY_PATTERN.test(key),
        false,
        `expected ${JSON.stringify(key)} to be refused`
      );
    }
  });

  it("rejects executable and markup extensions even under a valid uuid", () => {
    const uuid = "3f2a1b4c-5d6e-7f80-9a1b-2c3d4e5f6071";
    for (const ext of ["sh", "js", "html", "svg", "php", "exe"]) {
      assert.equal(
        STORAGE_KEY_PATTERN.test(`products/${uuid}.${ext}`),
        false,
        `expected .${ext} to be refused`
      );
    }
  });

  it("accepts a well-formed key", () => {
    assert.equal(
      STORAGE_KEY_PATTERN.test("products/3f2a1b4c-5d6e-7f80-9a1b-2c3d4e5f6071.png"),
      true
    );
  });
});

describe("isS3Configured", () => {
  it("is false when nothing is set", () => {
    assert.equal(isS3Configured(), false);
  });

  /**
   * The case that caused real confusion: presigning is pure local crypto and
   * never contacts S3, so placeholder values produce a perfectly valid
   * signature for a host that does not exist. The failure then surfaces in the
   * browser as an opaque network error. Detecting the .env.example defaults
   * keeps that from happening silently.
   */
  it("treats the .env.example placeholders as unconfigured", () => {
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_BUCKET = "vinx-media";
    process.env.S3_PUBLIC_URL_BASE = "https://media.example.com";
    assert.equal(isS3Configured(), false);
  });

  it("is true once real-looking values are present", () => {
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_BUCKET = "vinx-live";
    process.env.S3_PUBLIC_URL_BASE = "https://cdn.vinx.com";
    assert.equal(isS3Configured(), true);
  });

  it("is false when credentials are missing even with a real bucket", () => {
    process.env.S3_BUCKET = "vinx-live";
    process.env.S3_PUBLIC_URL_BASE = "https://cdn.vinx.com";
    assert.equal(isS3Configured(), false);
  });

  // The override exists because "configured but wrong" is indistinguishable
  // from "configured" to any automatic check, and otherwise leaves no way to
  // work locally short of emptying the file.
  it("honours STORAGE_DRIVER over the automatic decision", () => {
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_BUCKET = "vinx-live";
    process.env.S3_PUBLIC_URL_BASE = "https://cdn.vinx.com";

    process.env.STORAGE_DRIVER = "local";
    assert.equal(isS3Configured(), false, "local must win over real values");

    process.env.STORAGE_DRIVER = "s3";
    for (const key of ["S3_BUCKET", "S3_PUBLIC_URL_BASE"]) delete process.env[key];
    assert.equal(isS3Configured(), true, "s3 must win over missing values");
  });
});

describe("getPresignedUploadUrl", () => {
  it("refuses a disallowed content type before touching any configuration", async () => {
    await assert.rejects(
      () => getPresignedUploadUrl("payload.svg", "image/svg+xml"),
      /Only JPEG, PNG, WebP images or MP4 video are allowed/
    );
  });

  it("refuses when no bucket is configured rather than signing a useless URL", async () => {
    await assert.rejects(() => getPresignedUploadUrl("photo.png", "image/png"), /S3_BUCKET/);
  });
});

describe("sniffImageType — profile photo uploads", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  const text = (value: string) => new TextEncoder().encode(value);

  it("recognises JPEG, PNG and WebP from their first bytes", () => {
    assert.equal(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0)), "image/jpeg");
    assert.equal(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), "image/png");
    assert.equal(sniffImageType(text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ")), "image/webp");
  });

  /**
   * Anyone can sign up, so anyone can upload a profile photo. The declared type
   * and the filename are the uploader's claim; these are files that would be
   * served from the shop's own storage if the claim were believed. An SVG or
   * HTML file can carry script — the classic route from "image upload" to code
   * running on your domain.
   */
  it("refuses files that are not really images, whatever they are called", () => {
    for (const [name, content] of [
      ["svg", text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
      ["html", text("<!doctype html><script>alert(1)</script>")],
      ["gif", text("GIF89a......")],
      ["riff but not webp", text("RIFF\u0000\u0000\u0000\u0000WAVEfmt ")],
      ["empty", new Uint8Array()],
      ["truncated png", bytes(0x89, 0x50, 0x4e)]
    ] as const) {
      assert.equal(sniffImageType(content), null, name);
    }
  });
});

describe("buildAvatarKey", () => {
  it("produces keys the avatar pattern accepts, and product keys it does not", () => {
    assert.ok(AVATAR_KEY_PATTERN.test(buildAvatarKey("image/png")));
    assert.equal(AVATAR_KEY_PATTERN.test(buildStorageKey("png")), false);
    assert.equal(AVATAR_KEY_PATTERN.test("avatars/../../etc/passwd"), false);
  });
});
