import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

function getClient() {
  const region = process.env.S3_REGION ?? "auto";
  const endpoint = process.env.S3_ENDPOINT || undefined; // unset = real AWS S3

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ""
    }
  });
}

// Content type -> file extension. This map is the allowlist: a type that
// isn't a key here cannot be uploaded at all.
//
// MP4 is the only video format offered because it is the one codec container
// every target browser plays without a fallback source.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4"
};

/** The extension for a permitted content type, or undefined if not allowed. */
export function extensionForContentType(contentType: string): string | undefined {
  return ALLOWED_TYPES[contentType];
}

// Values that are obviously still the placeholders from .env.example. Treating
// these as "not configured" matters because presigning is pure local crypto
// that never contacts S3 — with a placeholder host the signature is generated
// happily and the failure only appears later, in the browser, as an opaque
// network error against a domain that does not exist.
const PLACEHOLDER_VALUES = ["media.example.com", "vinx-media", "https://media.example.com"];

function looksLikePlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDER_VALUES.some((placeholder) => value.includes(placeholder));
}

/**
 * Whether real S3-compatible storage is configured.
 *
 * Checked before signing anything, so a misconfiguration surfaces as a clear
 * server-side message instead of a browser-side "NetworkError" pointing at a
 * host that was never real.
 *
 * `STORAGE_DRIVER=local` forces the development fallback on regardless of what
 * the S3_* variables contain. Detecting "unset" is not enough on its own:
 * variables that are filled in but wrong are configured by any automatic test,
 * yet still cannot accept an upload, which would otherwise leave no way to get
 * working locally short of emptying the file.
 */
export function isS3Configured(): boolean {
  if (process.env.STORAGE_DRIVER === "local") return false;
  if (process.env.STORAGE_DRIVER === "s3") return true;

  return (
    Boolean(process.env.S3_ACCESS_KEY_ID) &&
    Boolean(process.env.S3_SECRET_ACCESS_KEY) &&
    !looksLikePlaceholder(process.env.S3_BUCKET) &&
    !looksLikePlaceholder(process.env.S3_PUBLIC_URL_BASE)
  );
}

/**
 * Build the storage key. Entirely server-side: a random UUID plus the
 * extension implied by the validated content type. The client's filename is
 * never part of the key, so there is no path traversal ("../../etc/passwd") or
 * collision risk, and a stored object's extension can never disagree with the
 * Content-Type it is served under.
 */
export function buildStorageKey(ext: string): string {
  return `products/${randomUUID()}.${ext}`;
}

/** Matches exactly what buildStorageKey produces — nothing else is accepted. */
export const STORAGE_KEY_PATTERN = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4)$/;

export async function getPresignedUploadUrl(originalFilename: string, contentType: string) {
  const ext = extensionForContentType(contentType);
  if (!ext) {
    throw new Error("Only JPEG, PNG, WebP images or MP4 video are allowed");
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not configured");

  // Note on size: a presigned PUT cannot cap upload size on its own. The
  // browser-side check in ImageUploadField is a convenience, not enforcement —
  // a bucket-level policy (or a presigned POST with a content-length-range
  // condition) is what actually bounds this, and should be set before
  // production use.
  void originalFilename;
  const key = buildStorageKey(ext);

  const client = getClient();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes to actually upload

  const publicBase = process.env.S3_PUBLIC_URL_BASE?.replace(/\/$/, "");
  const publicUrl = `${publicBase}/${key}`;

  return { uploadUrl, publicUrl, key };
}
