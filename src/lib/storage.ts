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

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function getPresignedUploadUrl(originalFilename: string, contentType: string) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not configured");

  // Never trust the client's filename for the storage key — strip it down
  // to just an extension and generate the rest, so there's no path
  // traversal (e.g. "../../etc/passwd") or collision risk.
  const ext = originalFilename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `products/${randomUUID()}.${ext}`;

  const client = getClient();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes to actually upload

  const publicBase = process.env.S3_PUBLIC_URL_BASE?.replace(/\/$/, "");
  const publicUrl = `${publicBase}/${key}`;

  return { uploadUrl, publicUrl, key };
}
