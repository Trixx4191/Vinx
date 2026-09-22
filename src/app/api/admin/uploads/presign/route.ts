import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { getPresignedUploadUrl, isS3Configured, extensionForContentType, buildStorageKey } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  return withSafeErrors(async () => {
    const body = await req.json().catch(() => null);
    const filename = body?.filename;
    const contentType = body?.contentType;

    if (typeof filename !== "string" || typeof contentType !== "string") {
      return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
    }

    const ext = extensionForContentType(contentType);
    if (!ext) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP images or MP4 video are allowed" },
        { status: 400 }
      );
    }

    // Development fallback: with no real bucket configured, uploads go to
    // ./public/uploads on this machine instead. This exists so the catalog can
    // be filled in and reviewed locally before anyone signs up for object
    // storage.
    //
    // It is gated on NODE_ENV so it cannot activate in production, where
    // writing into the deployment directory would not survive a redeploy and
    // does not work on read-only or serverless filesystems at all.
    if (!isS3Configured()) {
      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          { error: "File storage is not configured. Set the S3_* variables in .env." },
          { status: 503 }
        );
      }

      const key = buildStorageKey(ext);
      return NextResponse.json({
        uploadUrl: `/api/admin/uploads/local?key=${encodeURIComponent(key)}`,
        publicUrl: `/uploads/${key}`,
        storage: "local"
      });
    }

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(filename, contentType);

    return NextResponse.json({ uploadUrl, publicUrl, storage: "s3" });
  });
}
