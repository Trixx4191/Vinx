import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/requireAdmin";
import { withSafeErrors } from "@/lib/safeErrors";
import { isS3Configured, STORAGE_KEY_PATTERN } from "@/lib/storage";

/**
 * Development-only upload target.
 *
 * Accepts the same PUT the browser would send to S3, and writes the body into
 * ./public/uploads so files are served from /uploads/... Without this, filling
 * the catalog locally would require signing up for object storage first.
 *
 * Three independent conditions must all hold for a byte to be written:
 *   1. the caller is an admin,
 *   2. the server is running in development,
 *   3. no real bucket is configured.
 *
 * Any one of them failing returns 404. In particular this route disappears
 * entirely in production — it must, because writing into the deployment
 * directory does not survive a redeploy and fails outright on the read-only
 * filesystems most hosts use.
 */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

  if (process.env.NODE_ENV !== "development" || isS3Configured()) {
    return notFound();
  }

  return withSafeErrors(async () => {
    const key = req.nextUrl.searchParams.get("key");

    // The key arrives from the client, so it is never trusted as a path. It
    // must match exactly the shape buildStorageKey produces — a fixed prefix,
    // a UUID, and one of four extensions. Anything else, including any form of
    // "..", fails this test and never reaches the filesystem.
    if (!key || !STORAGE_KEY_PATTERN.test(key)) {
      return notFound();
    }

    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length === 0) {
      return NextResponse.json({ error: "Empty upload" }, { status: 400 });
    }

    // 25MB, matching the video ceiling offered in the admin form. Unlike a
    // presigned S3 PUT, this route sees the whole body and can actually
    // enforce a limit.
    if (bytes.length > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File is larger than 25MB" }, { status: 413 });
    }

    const destination = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);

    return NextResponse.json({ ok: true, publicUrl: `/uploads/${key}` });
  });
}
